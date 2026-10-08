'use client';

import { productImage } from './catalog-shared';

export interface CartItem {
  variantId: string;
  quantity: number;
  slug: string;
  name: string;
  platform: string;
  condition: string;
  sku: string;
  price: number;
  image: string;
}

interface ServerCartLine extends Omit<CartItem, 'image'> {
  image: string | null;
  available: number;
  lineTotal: number;
}

const CART_KEY = 'neojapan-cart-v1';
const CART_ID_KEY = 'neojapan-cart-id';
const CART_EVENT = 'neojapan-cart-change';
const CART_ID_EVENT = 'neojapan-cart-id-change';

export function getCartIdSnapshot(): string {
  return window.localStorage.getItem(CART_ID_KEY) ?? '';
}

export function subscribeCartId(callback: () => void): () => void {
  window.addEventListener(CART_ID_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CART_ID_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getCartSnapshot(): string {
  return window.localStorage.getItem(CART_KEY) ?? '[]';
}

export function subscribeCart(callback: () => void): () => void {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getCartId(): string {
  let id = window.localStorage.getItem(CART_ID_KEY);
  if (!id) {
    id = window.crypto.randomUUID();
    window.localStorage.setItem(CART_ID_KEY, id);
  }
  document.cookie = `cartId=${encodeURIComponent(id)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  window.dispatchEvent(new Event(CART_ID_EVENT));
  return id;
}

export function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        'variantId' in item &&
        'quantity' in item &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  getCartId();
  window.dispatchEvent(new Event(CART_EVENT));
}

async function cartRequest(path: string, init?: RequestInit): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const response = await fetch(`${apiBase}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    const body: unknown = await response.json();
    const message = typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
    throw new Error(message || 'No se pudo actualizar el carrito.');
  }
}

export async function fetchCart(): Promise<CartItem[]> {
  const id = getCartId();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const response = await fetch(`${apiBase}/api/v1/carts/${id}`, { credentials: 'include' });
  if (!response.ok) throw new Error('No se pudo sincronizar el carrito con el servidor.');
  const body = await response.json() as { items: ServerCartLine[] };
  const items = body.items.map((line) => ({ ...line, image: productImage(line.image) }));
  writeCart(items);
  return items;
}

export async function addCartItem(item: CartItem): Promise<void> {
  const id = getCartId();
  await cartRequest(`/carts/${id}/items/${item.variantId}`, {
    method: 'POST',
    body: JSON.stringify({ quantity: item.quantity }),
  });
  const items = readCart();
  const current = items.find((line) => line.variantId === item.variantId);
  if (current) current.quantity = Math.min(20, current.quantity + item.quantity);
  else items.push({ ...item, quantity: Math.min(20, item.quantity) });
  writeCart(items);
}

export async function setCartQuantity(variantId: string, quantity: number): Promise<void> {
  const id = getCartId();
  await cartRequest(`/carts/${id}/items/${variantId}`, quantity <= 0
    ? { method: 'DELETE' }
    : { method: 'PATCH', body: JSON.stringify({ quantity }) });
  const items = readCart()
    .map((item) => item.variantId === variantId ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);
  writeCart(items);
}

export function clearCart(): void {
  window.localStorage.removeItem(CART_ID_KEY);
  document.cookie = 'cartId=; Path=/; Max-Age=0; SameSite=Lax';
  writeCart([]);
}

export function cartEventName(): string {
  return CART_EVENT;
}
