import type { Metadata } from 'next';
import { connection } from 'next/server';
import { BuilderConfigurator } from '@/components/builder-configurator';
import { getConsoles, getProducts } from '@/lib/catalog';

export const instant = false;

export const metadata: Metadata = { title: 'Builder de kits', description: 'Configura una reparación con piezas disponibles para tu consola. La consola puede precargarse desde tu Console Garage.' };

type Props = { searchParams: Promise<{ console?: string }> };

export default async function BuilderPage({ searchParams }: Props) {
  await connection();
  const [{ console: preselected }, consoles, products] = await Promise.all([searchParams, getConsoles(), getProducts('limit=48&category=Repuestos')]);
  return <main className="page-shell section"><span className="eyebrow">Neojapan / configurador</span><h1 className="section-title">Arma tu kit.</h1><p className="lead">Elige consola y falla. La propuesta usa repuestos publicados y deja cada compatibilidad verificable en su ficha. La consola se puede precargar desde tu <a className="accent-text" href="/garage">Console Garage</a>.</p><div className="notice">El configurador genera una selección de piezas del catálogo. Las herramientas y descuentos por kit aparecerán cuando exista una receta de reparación verificada.</div><BuilderConfigurator consoles={consoles} products={products} preselected={preselected} /></main>;
}
