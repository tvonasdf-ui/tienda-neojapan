'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function OrderLookup({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const input = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const digits = input.startsWith('NJ') ? input.slice(2) : input;
    if (!/^\d{4,}$/.test(digits)) {
      setError('Ingresa el código completo de tu pedido, por ejemplo NJ-483912.');
      return;
    }
    setBusy(true);
    router.push(`/pedido/NJ-${digits}`);
  }

  return (
    <div className={compact ? 'order-lookup order-lookup-compact' : 'order-lookup'}>
      <form className="search-form" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="order-code">Código de pedido</label>
        <input className="input" id="order-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={12} inputMode="numeric" autoComplete="off" placeholder="NJ-000000" aria-describedby={error ? 'order-lookup-error' : undefined} />
        <button className="button-secondary" type="submit" disabled={busy || !code.trim()}>{busy ? 'Consultando…' : compact ? 'Ir' : 'Consultar'}</button>
      </form>
      {error ? <p className="error-text" id="order-lookup-error" role="alert">{error}</p> : null}
    </div>
  );
}