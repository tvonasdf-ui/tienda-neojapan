import type { Metadata } from 'next';
import { connection } from 'next/server';
import { GarageManager } from '@/components/garage-manager';
import { getConsoles } from '@/lib/catalog';

export const instant = false;

export const metadata: Metadata = { title: 'Console Garage', description: 'Registra tus consolas e identifica piezas compatibles.' };

type Props = { searchParams: Promise<{ console?: string }> };

export default async function GaragePage({ searchParams }: Props) {
  await connection();
  const [{ console: preselected }, consoles] = await Promise.all([searchParams, getConsoles()]);
  return <main className="page-shell section"><span className="eyebrow">Neojapan / compatibilidad</span><h1 className="section-title">Console Garage.</h1><p className="lead">Un espacio para tus consolas. Las compatibilidades se basan en modelos y revisiones concretas, no en recomendaciones al azar.</p><GarageManager consoles={consoles} preselected={preselected} /></main>;
}
