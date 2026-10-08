'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearCart, fetchCart, getCartId, getCartIdSnapshot, subscribeCartId, type CartItem } from '@/lib/cart';
import { formatCLP } from '@/lib/catalog-shared';
import { useSyncExternalStore } from 'react';

interface CreatedOrder {
  code: string;
  total: number;
  whatsappUrl: string;
  discountAmount: number;
}

interface AppliedCoupon {
  couponCode: string;
  discountAmount: number;
  subtotal: number;
}

const ORDERS_KEY = 'neojapan-orders-v1';
const EMPTY_CART: CartItem[] = [];

function rememberOrder(code: string) {
  try {
    const current: unknown = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]');
    const codes = Array.isArray(current) ? current.filter((item): item is string => typeof item === 'string') : [];
    localStorage.setItem(ORDERS_KEY, JSON.stringify([...new Set([code, ...codes])].slice(0, 30)));
    window.dispatchEvent(new Event('neojapan-orders-change'));
  } catch {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([code]));
    window.dispatchEvent(new Event('neojapan-orders-change'));
  }
}

export function CheckoutForm() {
  const cartId = useSyncExternalStore(subscribeCartId, getCartIdSnapshot, () => '');
  const queryClient = useQueryClient();
  const cartQuery = useQuery({ queryKey: ['cart', cartId], queryFn: fetchCart, enabled: Boolean(cartId) });
  const items = cartQuery.data ?? EMPTY_CART;
  const [mode, setMode] = useState<'PICKUP' | 'DISPATCH'>('PICKUP');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [commune, setCommune] = useState('');
  const [popup, setPopup] = useState<Window | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  useEffect(() => { getCartId(); }, []);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.price * item.quantity, 0), [items]);
  const currentCoupon = appliedCoupon?.subtotal === subtotal ? appliedCoupon : null;
  const couponIsStale = Boolean(appliedCoupon && !currentCoupon);
  const discountAmount = currentCoupon?.discountAmount ?? 0;

  async function applyCoupon() {
    setCouponMessage('');
    setAppliedCoupon(null);
    setCouponBusy(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
      const response = await fetch(`${apiBase}/api/v1/orders/coupon/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cartId: getCartId(), couponCode: couponCode.trim() }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
        throw new Error(message || 'No se pudo validar el código promocional.');
      }
      const validated = body as AppliedCoupon;
      setAppliedCoupon(validated);
      setCouponCode(validated.couponCode);
      setCouponMessage('Código aplicado. El descuento se volverá a validar al enviar la solicitud.');
    } catch (caught) {
      setCouponMessage(caught instanceof Error ? caught.message : 'No se pudo validar el código promocional.');
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!items.length) {
      setError('El carrito está vacío. Agrega productos antes de continuar.');
      return;
    }
    if (mode === 'DISPATCH' && !commune.trim()) {
      setError('Indica la comuna para calcular el despacho.');
      return;
    }
    if (!/^\+?[0-9][0-9 ().-]{7,}$/.test(phone.trim())) {
      setError('Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.');
      return;
    }
    const whatsappWindow = window.open('about:blank', '_blank');
    setPopup(whatsappWindow);
    setBusy(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
      const response = await fetch(`${apiBase}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cartId: getCartId(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryMode: mode,
          dispatchCommune: mode === 'DISPATCH' ? commune.trim() : undefined,
          couponCode: currentCoupon?.couponCode,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
        throw new Error(message || 'No pudimos registrar tu solicitud. Revisa los datos e inténtalo otra vez.');
      }
      const created = body as CreatedOrder;
      if (!created.code || !created.whatsappUrl || !/^https:\/\/wa\.me\/\d+/.test(created.whatsappUrl)) {
        throw new Error('La API devolvió una respuesta de pedido incompleta. No se abrió WhatsApp.');
      }
      rememberOrder(created.code);
      clearCart();
      await queryClient.removeQueries({ queryKey: ['cart'] });
      setOrder(created);
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.location.href = created.whatsappUrl;
      }
      setPopup(null);
    } catch (caught) {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      setPopup(null);
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el pedido. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return <section className="order-success surface-card"><span className="eyebrow">Solicitud creada</span><h2 className="section-title">Pedido {order.code}</h2><p className="lead">Tu solicitud quedó registrada. No se ha reservado ni descontado inventario; el equipo confirmará disponibilidad manualmente por WhatsApp.</p>{order.discountAmount > 0 ? <div className="summary-row"><span>Descuento aplicado</span><strong>−{formatCLP(order.discountAmount)}</strong></div> : null}<div className="summary-row summary-total"><span>Total validado</span><strong>{formatCLP(order.total)}</strong></div><div className="order-actions"><a className="button-primary" href={order.whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp ↗</a><Link className="button-secondary" href={`/pedido/${order.code}`}>Ver detalle de solicitud</Link></div></section>;
  }

  if (cartId && cartQuery.isPending) return <p className="notice" role="status">Cargando el carrito guardado…</p>;
  if (!items.length) return <div className="empty-state">{cartQuery.error ? <p className="error-text" role="alert">{cartQuery.error instanceof Error ? cartQuery.error.message : 'No se pudo cargar el carrito.'}</p> : null}<h2>No hay productos para solicitar.</h2><p className="muted">Vuelve al catálogo y agrega una pieza a tu carrito.</p><Link className="button-primary" href="/catalogo">Ir al catálogo</Link></div>;

  return (
    <div className="checkout-grid">
      <form className="checkout-form surface-card" onSubmit={submit}>
        <fieldset className="form-grid checkout-fieldset">
          <legend className="section-title">Tus datos.</legend>
          <label className="field"><span>Nombre y apellido</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={160} autoComplete="name" /></label>
          <label className="field"><span>Teléfono</span><input className="input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={6} maxLength={32} autoComplete="tel" placeholder="+56 9 1234 5678" /></label>
        </fieldset>
        <fieldset className="form-grid checkout-fieldset">
          <legend className="section-title">¿Cómo lo recibes?</legend>
          <label className="radio-card"><input type="radio" name="delivery" value="PICKUP" checked={mode === 'PICKUP'} onChange={() => setMode('PICKUP')} /><span><strong>Retiro en tienda</strong><br /><span className="muted small">Coordinamos el retiro por WhatsApp.</span></span></label>
          <label className="radio-card"><input type="radio" name="delivery" value="DISPATCH" checked={mode === 'DISPATCH'} onChange={() => setMode('DISPATCH')} /><span><strong>Despacho</strong><br /><span className="muted small">El costo se confirma según comuna.</span></span></label>
          {mode === 'DISPATCH' ? <label className="field"><span>Comuna</span><input className="input" value={commune} onChange={(event) => setCommune(event.target.value)} required maxLength={80} autoComplete="address-level2" /></label> : null}
        </fieldset>
        <fieldset className="form-grid checkout-fieldset">
          <legend className="section-title">Código promocional</legend>
          <div className="search-form">
            <label className="sr-only" htmlFor="coupon-code">Código promocional</label>
            <input className="input" id="coupon-code" value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setAppliedCoupon(null); setCouponMessage(''); }} maxLength={40} autoComplete="off" placeholder="Ingresa tu código" />
            <button className="button-secondary" type="button" onClick={applyCoupon} disabled={couponBusy || !couponCode.trim()}>{couponBusy ? 'Validando…' : 'Aplicar'}</button>
          </div>
          {couponIsStale ? <p className="error-text" role="alert">El carrito cambió; vuelve a validar el código promocional.</p> : couponMessage ? <p className={currentCoupon ? 'notice' : 'error-text'} role={currentCoupon ? 'status' : 'alert'}>{couponMessage}</p> : null}
        </fieldset>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Registrando solicitud…' : 'Enviar solicitud y continuar a WhatsApp ↗'}</button>
        {popup ? <p className="muted small">La pestaña de WhatsApp se abrirá cuando el pedido quede registrado.</p> : null}
      </form>
      <aside className="summary-card"><span className="mono-label">RESUMEN REVISABLE</span>{items.map((item) => <div className="summary-row" key={item.variantId}><span>{item.quantity} × {item.name}</span><strong>{formatCLP(item.price * item.quantity)}</strong></div>)}<div className="summary-row"><span>Subtotal estimado</span><strong>{formatCLP(subtotal)}</strong></div>{discountAmount > 0 ? <div className="summary-row"><span>Descuento promocional</span><strong>−{formatCLP(discountAmount)}</strong></div> : null}<div className="summary-row summary-total"><span>Total estimado{mode === 'DISPATCH' ? ' + despacho' : ''}</span><strong>{formatCLP(subtotal - discountAmount)}</strong></div><p className="muted small">Esto registra una solicitud, no reserva ni descuenta unidades. El equipo confirmará existencias y el costo de despacho por WhatsApp.</p></aside>
    </div>
  );
}
