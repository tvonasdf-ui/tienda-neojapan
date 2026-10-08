'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ConsoleModel } from '@/lib/catalog';

const GARAGE_KEY = 'neojapan-garage-v1';
type GarageEntry = {
  id: string;
  consoleId: string;
  nickname: string;
  customerPhone?: string;
};
const GARAGE_EVENT = 'neojapan-garage-change';

export function GarageManager({ consoles, preselected }: { consoles: ConsoleModel[]; preselected?: string }) {
  const snapshot = useSyncExternalStore(
    (callback) => {
      window.addEventListener(GARAGE_EVENT, callback);
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener(GARAGE_EVENT, callback);
        window.removeEventListener('storage', callback);
      };
    },
    () => localStorage.getItem(GARAGE_KEY) ?? '[]',
    () => '[]',
  );
  const items = useMemo(() => {
    try {
      const value: unknown = JSON.parse(snapshot);
      if (!Array.isArray(value)) return [];
      return value.filter((entry): entry is GarageEntry =>
        typeof entry === 'object' && entry !== null &&
        'id' in entry && typeof entry.id === 'string' &&
        'consoleId' in entry && typeof entry.consoleId === 'string' &&
        'nickname' in entry && typeof entry.nickname === 'string',
      );
    } catch {
      return [];
    }
  }, [snapshot]);
  const [consoleId, setConsoleId] = useState(preselected ?? '');
  const [nickname, setNickname] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [step, setStep] = useState(preselected ? 1 : 0);
  const [platform, setPlatform] = useState(() => consoles.find((item) => item.id === preselected)?.platform ?? '');
  const [modelCode, setModelCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const platforms = useMemo(() => [...new Set(consoles.map((item) => item.platform))], [consoles]);

  function saveGarage(next: GarageEntry[]) {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(GARAGE_EVENT));
  }

  async function persistCurrent() {
    const normalizedPhone = customerPhone.trim();
    if (!normalizedPhone || normalizedPhone.length < 6) {
      setError('Ingresa un número de teléfono válido para identificar tu Garage.');
      return;
    }
    const entry: GarageEntry = {
      id: window.crypto.randomUUID(),
      consoleId,
      nickname: nickname.trim(),
      customerPhone: normalizedPhone,
    };
    saveGarage([...items, entry]);
    setStep(0);
    setNickname('');
    setCustomerPhone('');
    setSyncNotice('');
    setError('');
    setBusy(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3002';
    try {
      const response = await fetch(`${apiBase}/api/v1/garage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerName: entry.nickname || 'Cliente Neojapan',
          customerPhone: normalizedPhone,
          consoleModelId: consoleId,
          notes: entry.nickname || undefined,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
        throw new Error(message || 'No se pudo guardar la consola en el Garage.');
      }
    } catch (caught) {
      setSyncNotice(`Consola guardada en este navegador, pero no se pudo sincronizar con el servidor${caught instanceof Error ? `: ${caught.message}` : '.'}`);
    } finally {
      setBusy(false);
    }
  }

  const candidates = consoles.filter((item) => item.platform === platform && (!modelCode || `${item.name} ${item.revision ?? ''}`.toLowerCase().includes(modelCode.toLowerCase())));
  const exactByCode = modelCode.length >= 4
    ? consoles.filter((item) => item.revision?.toLowerCase() === modelCode.toLowerCase())
    : [];

  return (
    <div>
      <section className="garage-intro surface-card">
        <span className="mono-label">IDENTIFICACIÓN GUIADA · 3 PASOS</span>
        <h2 className="section-title">Registra tu consola.</h2>
        <p className="muted small">No necesitas conocer la revisión: revisamos plataforma, modelo y código antes de guardar.</p>
        <div className="stepper" aria-label={`Paso ${step + 1} de 3`}>{['Plataforma', 'Identificación', 'Confirmar'].map((label, index) => <span className={step === index ? 'active' : ''} key={label}>{String(index + 1).padStart(2, '0')} · {label}</span>)}</div>
        {step === 0 ? <div className="choice-grid">{platforms.map((item) => <button className="choice-card" key={item} type="button" aria-pressed={platform === item} onClick={() => { setPlatform(item); setConsoleId(''); setModelCode(''); }}>{item}<span className="small muted">Seleccionar plataforma →</span></button>)}</div> : null}
        {step === 1 ? (
          <div className="form-grid">
            <p className="notice">Busca el código impreso bajo la consola o en la etiqueta trasera. Ejemplo: {consoles.find((item) => item.platform === platform)?.revision ?? 'HAC-001'}.</p>
            <label className="field"><span>Código de modelo (opcional)</span><input className="input" value={modelCode} onChange={(event) => setModelCode(event.target.value.trim())} placeholder="Ej. HAC-001" /></label>
            <label className="field"><span>Modelo sugerido</span><select className="select" value={consoleId} onChange={(event) => setConsoleId(event.target.value)}><option value="">Elige el modelo más parecido</option>{(exactByCode.length ? exactByCode : candidates).map((item) => <option key={item.id} value={item.id}>{item.name}{item.revision ? ` · ${item.revision}` : ''}</option>)}</select></label>
            {modelCode && !exactByCode.length ? <p className="muted small">No encontramos un código exacto. Selecciona el modelo visualmente o déjalo sin guardar y vuelve a revisar la etiqueta.</p> : null}
          </div>
        ) : null}
        {step === 2 ? (
          <div className="form-grid">
            <p className="notice">Confirma el modelo que aparece impreso en tu consola. Si no coincide, vuelve al paso anterior.</p>
            <strong>{consoles.find((item) => item.id === consoleId)?.name ?? 'Selecciona primero un modelo'}</strong>
            <label className="field"><span>Nombre para identificarla (opcional)</span><input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} placeholder="Mi consola del living" /></label>
            <label className="field"><span>Teléfono para identificar tu Garage</span><input className="input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value.trim())} maxLength={32} placeholder="+56 9 12345678" autoComplete="tel" /></label>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
          </div>
        ) : null}
        <div className="step-actions">
          {step > 0 ? <button className="button-secondary" type="button" onClick={() => setStep(step - 1)}>Volver</button> : null}
          {step < 2 ? <button className="button-primary" type="button" disabled={step === 0 ? !platform : !consoleId} onClick={() => setStep(step + 1)}>Continuar</button> : <button className="button-primary" type="button" disabled={!consoleId || busy} onClick={persistCurrent}>{busy ? 'Guardando…' : 'Guardar en Garage'}</button>}
        </div>
      </section>
      <section className="section-tight">
        <div className="section-heading"><div><span className="eyebrow">Mis consolas</span><h2 className="section-title">Tu garage virtual.</h2></div><span className="mono-label">{items.length} REGISTRADAS</span></div>
        {syncNotice ? <p className="notice" role="status">{syncNotice}</p> : null}
        {!items.length ? <div className="empty-state"><h2>Tu garage empieza aquí.</h2><p className="muted">Registra una consola para consultar la compatibilidad del catálogo.</p></div> : <div className="garage-grid">{items.map((entry) => {
          const model = consoles.find((item) => item.id === entry.consoleId);
          if (!model) return null;
          return <article className="garage-card" key={entry.id}><div className="console-visual" aria-hidden="true">NJ</div><span className="mono-label">{model.platform} · {model.revision ?? 'MODELO'}</span><h3>{entry.nickname || model.name}</h3><p className="muted small">{model.name}</p><div className="inline-actions"><Link className="text-link" href={`/consola/${model.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}>Ver compatibles ↗</Link><Link className="text-link" href={`/catalogo?compatibleConsoleId=${encodeURIComponent(model.id)}`}>Filtrar catálogo ↗</Link></div><button className="button-quiet remove-button" type="button" onClick={() => saveGarage(items.filter((item) => item.id !== entry.id))}>Quitar</button></article>;
        })}</div>}
      </section>
    </div>
  );
}
