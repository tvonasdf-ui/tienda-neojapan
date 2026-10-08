'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Input } from '@neojapan/ui';
import { clientApi } from '@/lib/api';

interface VariantRow {
  sku: string;
  condition: string;
  price: string;
  cost: string;
  barcode: string;
  initialSTORE: string;
  initialWAREHOUSE: string;
}

interface CreatedProduct {
  id: string;
  slug: string;
  name: string;
}

const EMPTY_VARIANT: VariantRow = {
  sku: '',
  condition: 'A',
  price: '',
  cost: '',
  barcode: '',
  initialSTORE: '',
  initialWAREHOUSE: '',
};

export function ProductCreateForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...EMPTY_VARIANT }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedProduct | null>(null);

  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setVariants((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addVariant() {
    setVariants((current) => [...current, { ...EMPTY_VARIANT }]);
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, i) => i !== index));
  }

  function deriveSlug() {
    const value = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(value);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug,
      name,
      description: null,
      category,
      platform,
      status,
      isFeatured,
      variants: variants.map((row) => ({
        sku: row.sku.trim(),
        condition: row.condition,
        price: Number(row.price),
        cost: Number(row.cost),
        barcode: row.barcode.trim() || null,
        initialStock: {
          STORE: row.initialSTORE ? Number(row.initialSTORE) : 0,
          WAREHOUSE: row.initialWAREHOUSE ? Number(row.initialWAREHOUSE) : 0,
        },
      })),
      compatibility: [],
      media: [],
    };

    try {
      const product = await clientApi<CreatedProduct>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCreated(product);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el producto.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Card className="p-6">
        <Badge tone="success">Creado</Badge>
        <p className="mt-3 text-gray-200">
          <strong>{created.name}</strong> fue creado correctamente.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/inventario/${created.id}`}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Completar ficha y cargar imágenes
          </Link>
          <Link href="/inventario" className="text-cyan-400 hover:text-cyan-300">
            Volver al inventario
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={deriveSlug}
          />
          <Input
            label="Slug"
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            hint="Ej: mario-kart-8-deluxe"
          />
          <Input
            label="Categoría"
            required
            maxLength={80}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Videojuego, Accesorio…"
          />
          <Input
            label="Plataforma"
            required
            maxLength={80}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            placeholder="Nintendo Switch, PS5…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-200">
              Estado
            </label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'DRAFT' | 'ACTIVE')}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <option value="DRAFT">Borrador</option>
              <option value="ACTIVE">Activo</option>
            </select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(event) => setIsFeatured(event.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Destacado en la tienda
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-gray-100">Variantes</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
              + Añadir variante
            </Button>
          </div>

          {variants.map((row, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 sm:grid-cols-8"
            >
              <div className="sm:col-span-2">
                <Input
                  label="SKU"
                  required
                  maxLength={64}
                  value={row.sku}
                  onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">
                  Condición
                </label>
                <select
                  value={row.condition}
                  onChange={(event) => updateVariant(index, 'condition', event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <option value="NEW">Nuevo</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <Input
                  label="Precio"
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={row.price}
                  onChange={(event) => updateVariant(index, 'price', event.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Costo"
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={row.cost}
                  onChange={(event) => updateVariant(index, 'cost', event.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Barcode"
                  maxLength={64}
                  value={row.barcode}
                  onChange={(event) => updateVariant(index, 'barcode', event.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Stock tienda"
                  type="number"
                  min={0}
                  step={1}
                  value={row.initialSTORE}
                  onChange={(event) => updateVariant(index, 'initialSTORE', event.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Stock bodega"
                  type="number"
                  min={0}
                  step={1}
                  value={row.initialWAREHOUSE}
                  onChange={(event) => updateVariant(index, 'initialWAREHOUSE', event.target.value)}
                />
              </div>
              {variants.length > 1 ? (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(index)}
                  >
                    Quitar
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {error ? (
          <div>
            <Badge tone="danger">Error</Badge>
            <p className="mt-2 text-sm text-gray-300">{error}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={submitting}>
            Crear producto
          </Button>
          <Link href="/inventario" className="text-sm text-gray-400 hover:text-gray-200">
            Cancelar
          </Link>
        </div>
      </form>
    </Card>
  );
}