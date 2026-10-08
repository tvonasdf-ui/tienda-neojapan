'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCart, getCartId, getCartIdSnapshot, setCartQuantity, subscribeCartId, type CartItem } from '@/lib/cart';
import { formatCLP } from '@/lib/catalog-shared';

export function CartPage() {
  const cartId = useSyncExternalStore(subscribeCartId, getCartIdSnapshot, () => '');
  const queryClient = useQueryClient();
  useEffect(() => { getCartId(); }, []);
  const cartQuery = useQuery({
    queryKey: ['cart', cartId],
    queryFn: fetchCart,
    enabled: Boolean(cartId),
  });
  const quantityMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) => setCartQuantity(variantId, quantity),
    onMutate: async ({ variantId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart', cartId] });
      const previous = queryClient.getQueryData<CartItem[]>(['cart', cartId]);
      queryClient.setQueryData<CartItem[]>(['cart', cartId], (current = []) => current
        .map((item) => item.variantId === variantId ? { ...item, quantity } : item)
        .filter((item) => item.quantity > 0));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['cart', cartId], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart', cartId] }),
  });
  const items = cartQuery.data ?? [];
  const error = cartQuery.error ?? quantityMutation.error;
  const errorMessage = error instanceof Error ? error.message : '';
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  if (cartId && cartQuery.isPending) return <div className="notice" role="status">Sincronizando carrito…</div>;
  if (!items.length) return <div className="empty-state">{errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}<span className="eyebrow">Carrito / 001</span><h2>Tu carrito está vacío.</h2><p className="muted">Encuentra piezas compatibles para tu consola.</p><Link className="button-primary" href="/catalogo">Explorar catálogo</Link></div>;

  return (
    <div className="cart-layout">
      <section className="cart-list" aria-label="Productos en el carrito">
        {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
        {items.map((item) => (
          <article className="cart-line" key={item.variantId}>
            <Link className="cart-line-image" href={`/producto/${item.slug}`}><Image src={item.image} alt="" width={180} height={225} /></Link>
            <div><span className="mono-label">{item.platform} · SKU {item.sku}</span><Link href={`/producto/${item.slug}`}><h2 className="product-title">{item.name}</h2></Link><span className="tag">{item.condition === 'NEW' ? 'Nuevo' : `Grado ${item.condition}`}</span><div className="cart-controls"><div className="quantity-control" aria-label={`Cantidad de ${item.name}`}><button type="button" aria-label="Quitar una unidad" disabled={quantityMutation.isPending} onClick={() => quantityMutation.mutate({ variantId: item.variantId, quantity: item.quantity - 1 })}>−</button><span>{item.quantity}</span><button type="button" aria-label="Agregar una unidad" disabled={quantityMutation.isPending} onClick={() => quantityMutation.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })}>+</button></div><button className="remove-button" type="button" disabled={quantityMutation.isPending} onClick={() => quantityMutation.mutate({ variantId: item.variantId, quantity: 0 })}>Quitar</button></div></div>
            <strong>{formatCLP(item.price * item.quantity)}</strong>
          </article>
        ))}
      </section>
      <aside className="summary-card">
        <span className="mono-label">RESUMEN DEL PEDIDO</span>
        <div className="summary-row"><span>Subtotal estimado</span><strong>{formatCLP(subtotal)}</strong></div>
        <div className="summary-row"><span>Envío</span><span>Se calcula al continuar</span></div>
        <div className="summary-row summary-total"><span>Total estimado</span><strong>{formatCLP(subtotal)}</strong></div>
        <p className="muted small">El servidor confirmará precios y disponibilidad antes de crear tu solicitud.</p>
        <Link className="button-primary full-button" href="/pedido/nuevo">Continuar al pedido</Link>
        <Link className="text-link back-link" href="/catalogo">Seguir comprando</Link>
      </aside>
    </div>
  );
}
