'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartEventName, readCart } from '@/lib/cart';
import { useStorefrontUi } from '@/state/storefront-ui';

export function StoreHeaderActions() {
  const [count, setCount] = useState(0);
  const theme = useStorefrontUi((state) => state.theme);
  const setTheme = useStorefrontUi((state) => state.setTheme);
  const toggleTheme = useStorefrontUi((state) => state.toggleTheme);

  useEffect(() => {
    const update = () => setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    update();
    window.addEventListener(cartEventName(), update);
    const storedTheme = window.localStorage.getItem('neojapan-theme');
    if (storedTheme === 'light') {
      document.documentElement.dataset.theme = 'light';
      setTheme('light');
    }
    return () => window.removeEventListener(cartEventName(), update);
  }, [setTheme]);

  return (
    <div className="header-actions">
      <Link className="header-link" href="/cuenta">Mis pedidos</Link>
      <button className="theme-toggle" type="button" onClick={() => { toggleTheme(); const next = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; window.localStorage.setItem('neojapan-theme', next); }} aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
        {theme === 'dark' ? '◐' : '◑'}
      </button>
      <Link className="cart-link" href="/carrito" aria-label={`Ver carrito, ${count} productos`}>
        <span>Carrito</span><span className="cart-count">{count}</span>
      </Link>
    </div>
  );
}
