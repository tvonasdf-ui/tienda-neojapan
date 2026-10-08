'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { addCartItem } from '@/lib/cart';
import { formatCLP, productImage, type ConsoleModel, type ProductSummary } from '@/lib/catalog-shared';

const repairs = [
  { id: 'drift', title: 'Drift en joystick', issue: 'Joystick', icon: '01', keywords: ['joystick', 'palanca', 'stick', 'drift'] },
  { id: 'battery', title: 'Batería / carga', issue: 'Batería', icon: '02', keywords: ['bateria', 'carga', 'pila'] },
  { id: 'reader', title: 'Problema de lector', issue: 'Lector', icon: '03', keywords: ['lector', 'lente', 'disco'] },
  { id: 'cooling', title: 'Ventilación', issue: 'Ventilador', icon: '04', keywords: ['ventilador', 'fan', 'enfriamiento'] },
];
const shellColors = [
  { name: 'Grafito', value: '#303438' },
  { name: 'Carmín', value: '#a92d2e' },
  { name: 'Hielo', value: '#d8dddf' },
  { name: 'Índigo', value: '#404b75' },
];
const buttonColors = [
  { name: 'Marfil', value: '#e9e3d4' },
  { name: 'Carmesí', value: '#d64b45' },
  { name: 'Cian', value: '#53c4d0' },
  { name: 'Lima', value: '#a5c85a' },
];
const TEMPLATE_KEY = 'neojapan-builder-template-v1';

function availableOf(product?: ProductSummary): ProductSummary['variants'] {
  return (product?.variants.filter((variant) => variant.available > 0) ?? []);
}

export function BuilderConfigurator({ consoles, products }: { consoles: ConsoleModel[]; products: ProductSummary[] }) {
  const router = useRouter();
  const [consoleId, setConsoleId] = useState('');
  const [repair, setRepair] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [mode, setMode] = useState<'repair' | 'custom'>('repair');
  const [shellColor, setShellColor] = useState(shellColors[0]!.value);
  const [buttonColor, setButtonColor] = useState(buttonColors[0]!.value);
  const [added, setAdded] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [error, setError] = useState('');
  const selectedConsole = consoles.find((item) => item.id === consoleId);
  const selectedRepair = repairs.find((item) => item.id === repair);
  const matching = useMemo(() => {
    const base = products.filter((product) => product.category.toLowerCase().includes('repuesto') && selectedConsole && product.compatibilities?.some((compatibility) => compatibility.consoleModelId === selectedConsole.id && compatibility.level === 'CONFIRMED'));
    if (!selectedRepair) return base;
    const keywords = selectedRepair.keywords;
    return base.filter((product) => keywords.some((keyword) => product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(keyword)));
  }, [products, selectedConsole, selectedRepair]);
  const selectedProduct = matching.find((product) => product.id === selectedProductId);
  const multiCondition = availableOf(selectedProduct).length > 1;

  function saveTemplate() {
    if (!selectedConsole) return;
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ consoleId: selectedConsole.id, shellColor, buttonColor }));
    setTemplateSaved(true);
  }

  function loadTemplate() {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? 'null');
      if (typeof value !== 'object' || value === null || !('consoleId' in value) || !('shellColor' in value) || !('buttonColor' in value)) return;
      if (typeof value.consoleId === 'string' && consoles.some((item) => item.id === value.consoleId)) setConsoleId(value.consoleId);
      if (typeof value.shellColor === 'string' && shellColors.some((item) => item.value === value.shellColor)) setShellColor(value.shellColor);
      if (typeof value.buttonColor === 'string' && buttonColors.some((item) => item.value === value.buttonColor)) setButtonColor(value.buttonColor);
      setTemplateSaved(true);
    } catch {
      setTemplateSaved(false);
    }
  }

  async function addKit() {
    setError('');
    const line = selectedProduct;
    if (!line) return;
    const available = availableOf(line);
    if (available.length > 1) {
      router.push(`/producto/${line.slug}`);
      return;
    }
    const variant = available[0];
    if (!variant) return;
    try {
      await addCartItem({ variantId: variant.id, quantity: 1, slug: line.slug, name: line.name, platform: line.platform, condition: variant.condition, sku: variant.sku, price: variant.price, image: productImage(line.media?.publicId) });
      setAdded(true);
    } catch (caught) {
      setAdded(false);
      setError(caught instanceof Error ? caught.message : 'No se pudo agregar el artículo al carrito.');
    }
  }

  return (
    <div className="builder-layout">
      <section className="surface-card builder-form">
        <div className="builder-tabs" role="tablist" aria-label="Tipo de configuración">
          <button className="button-secondary" type="button" role="tab" aria-selected={mode === 'repair'} onClick={() => setMode('repair')}>01 · Reparación</button>
          <button className="button-secondary" type="button" role="tab" aria-selected={mode === 'custom'} onClick={() => setMode('custom')}>02 · Mod / custom</button>
        </div>
        <label className="field"><span>Tu consola</span><select className="select" value={consoleId} onChange={(event) => { setConsoleId(event.target.value); setSelectedProductId(''); setAdded(false); setTemplateSaved(false); }}><option value="">Selecciona un modelo</option>{consoles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.revision ?? item.platform}</option>)}</select></label>
        {mode === 'repair' ? <>
          <div><span className="mono-label">REPAIR KIT / CONFIGURADOR GUIADO</span><h2 className="section-title">¿Qué necesitas reparar?</h2><p className="muted small">Elige el síntoma para filtrar. Solo se muestran repuestos con compatibilidad confirmada para el modelo exacto.</p></div>
          <div className="choice-grid">{repairs.map((item) => <button className="choice-card" type="button" key={item.id} aria-pressed={repair === item.id} onClick={() => { setRepair(item.id); setSelectedProductId(''); setAdded(false); }}><span className="mono-label">{item.icon} / REPAIR</span><br />{item.title}</button>)}</div>
        </> : <>
          <div><span className="mono-label">CUSTOM / PREVIEW POR CAPAS</span><h2 className="section-title">Combina colores.</h2><p className="muted small">Previsualización 2D de carcasa y botones. La plantilla queda guardada en este navegador.</p></div>
          <div className="color-fields">
            <fieldset className="color-group"><legend className="filter-heading">Carcasa</legend><div className="color-options">{shellColors.map((color) => <button key={color.value} className="color-choice" style={{ '--swatch': color.value } as React.CSSProperties} type="button" aria-pressed={shellColor === color.value} onClick={() => { setShellColor(color.value); setTemplateSaved(false); }} aria-label={`Color de carcasa: ${color.name}`}><span />{color.name}</button>)}</div></fieldset>
            <fieldset className="color-group"><legend className="filter-heading">Botones</legend><div className="color-options">{buttonColors.map((color) => <button key={color.value} className="color-choice" style={{ '--swatch': color.value } as React.CSSProperties} type="button" aria-pressed={buttonColor === color.value} onClick={() => { setButtonColor(color.value); setTemplateSaved(false); }} aria-label={`Color de botones: ${color.name}`}><span />{color.name}</button>)}</div></fieldset>
          </div>
        </>}
      </section>
      <aside className="builder-result summary-card">
        <span className="mono-label">{mode === 'repair' ? 'PIEZA SUGERIDA' : 'PLANTILLA DE COLOR'}</span>
        <h2>{selectedConsole?.name ?? 'Tu consola'}</h2>
        {mode === 'repair' ? <>
          <p className="muted small">{selectedRepair ? `Filtramos repuestos compatibles que coinciden con «${selectedRepair.title}». Sin una receta predefinida, eliges la pieza y la solicitas individualmente.` : selectedConsole ? 'Elige una falla para filtrar las piezas compatibles de la consola.' : 'Selecciona una consola y una falla para revisar piezas compatibles.'}</p>
          {selectedConsole && selectedRepair ? matching.length ? <div className="kit-items">{matching.slice(0, 3).map((product) => {
            const available = availableOf(product);
            const variant = available[0];
            const cheapest = available.reduce((acc, item) => (item.price < acc.price ? item : acc), available[0]!);
            return <button className="summary-row" type="button" aria-pressed={selectedProductId === product.id} key={product.id} onClick={() => { setSelectedProductId(product.id); setAdded(false); }}><span>{product.name}{available.length > 1 ? ' · varias condiciones' : variant ? ` · ${variant.condition}` : ' · Agotado'}</span><strong>{available.length > 1 ? `Desde ${formatCLP(cheapest.price)}` : variant ? formatCLP(variant.price) : 'Agotado'}</strong></button>;
          })}</div> : <p className="notice">No tenemos un repuesto confirmado que coincida con «{selectedRepair.title}» para este modelo. Escríbenos por WhatsApp y te lo conseguimos.</p> : <p className="notice">La disponibilidad y los precios se verifican con el servidor al agregar.</p>}
          <button className="button-primary" type="button" onClick={addKit} disabled={!selectedConsole || !selectedRepair || !selectedProduct || !multiCondition && !availableOf(selectedProduct).length}>{multiCondition ? 'Ver y elegir condición ↗' : added ? 'Pieza agregada al carrito ✓' : 'Agregar pieza seleccionada'}</button>
          {multiCondition ? <p className="muted small">Hay más de una condición disponible; te llevamos a la ficha para elegirla.</p> : null}
          {error ? <p className="error-text" role="alert">{error}</p> : null}
        </> : <>
          <div className="mod-preview" style={{ '--shell-color': shellColor, '--button-color': buttonColor } as React.CSSProperties} aria-label="Previsualización de colores seleccionados"><div className="mod-preview-shell"><span /><span /><span /><span /></div></div>
          <div className="summary-row"><span>Carcasa</span><strong>{shellColors.find((color) => color.value === shellColor)?.name}</strong></div>
          <div className="summary-row"><span>Botones</span><strong>{buttonColors.find((color) => color.value === buttonColor)?.name}</strong></div>
          <button className="button-primary" type="button" onClick={saveTemplate} disabled={!selectedConsole}>{templateSaved ? 'Plantilla guardada ✓' : 'Guardar plantilla'}</button>
          <button className="button-quiet" type="button" onClick={loadTemplate}>Cargar última plantilla guardada</button>
          <p className="muted small">La vista previa no constituye una cotización. Carcasas compatibles deben publicarse como variantes antes de agregarlas al carrito.</p>
        </>}
      </aside>
    </div>
  );
}