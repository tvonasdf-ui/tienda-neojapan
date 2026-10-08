'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Input } from '@neojapan/ui';
import type { AdminProductDetail, Condition, ProductStatus } from '@/lib/api';
import { clientApi } from '@/lib/api';

interface EditableVariant {
  id?: string;
  sku: string;
  condition: Condition;
  price: string;
  cost: string;
  barcode: string;
  stock: AdminProductDetail['variants'][number]['stock'];
}

type EditableVariantField = Exclude<keyof EditableVariant, 'id' | 'stock'>;

export function ProductEditForm({ product }: { product: AdminProductDetail }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [category, setCategory] = useState(product.category);
  const [platform, setPlatform] = useState(product.platform);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [variants, setVariants] = useState<EditableVariant[]>(
    product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      condition: variant.condition,
      price: String(variant.price),
      cost: String(variant.cost),
      barcode: variant.barcode ?? '',
      stock: variant.stock,
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        sku: '',
        condition: 'A',
        price: '0',
        cost: '0',
        barcode: '',
        stock: {},
      },
    ]);
  }

  function updateVariant(index: number, field: EditableVariantField, value: string) {
    setVariants((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
  }

  async function updateProduct(payload: Record<string, unknown>) {
    setSubmitting(true);
    setMessage(null);
    try {
      await clientApi<AdminProductDetail>(`/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setMessage({ tone: 'success', text: 'Cambios guardados.' });
      router.refresh();
    } catch (cause) {
      setMessage({
        tone: 'error',
        text: cause instanceof Error
          ? cause.message
          : 'No se pudo actualizar el producto.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateProduct({
      name,
      description: description.trim() || null,
      category,
      platform,
      status,
      isFeatured,
      variants: variants.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        sku: variant.sku.trim(),
        condition: variant.condition,
        price: Number(variant.price),
        cost: Number(variant.cost),
        barcode: variant.barcode.trim() || undefined,
      })),
    });
  }

  async function onArchive() {
    const nextStatus = status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    if (
      nextStatus === 'ARCHIVED' &&
      !window.confirm('¿Archivar este producto? Dejará de mostrarse en la tienda.')
    ) {
      return;
    }
    setStatus(nextStatus);
    await updateProduct({ status: nextStatus });
  }

  return (
    <Card className="space-y-6 p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Categoría"
            required
            maxLength={80}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <Input
            label="Plataforma"
            required
            maxLength={80}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          />
          <div>
            <label
              htmlFor="product-status"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Estado
            </label>
            <select
              id="product-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProductStatus)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <option value="DRAFT">Borrador</option>
              <option value="ACTIVE">Activo</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="product-description"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            Descripción
          </label>
          <textarea
            id="product-description"
            maxLength={5000}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Destacado en la tienda
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-gray-100">Variantes</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
              + Añadir variante
            </Button>
          </div>
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `new-${index}`}
              className="grid gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 sm:grid-cols-5"
            >
              <Input
                label="SKU"
                required
                maxLength={64}
                value={variant.sku}
                onChange={(event) => updateVariant(index, 'sku', event.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">
                  Condición
                </label>
                <select
                  value={variant.condition}
                  onChange={(event) =>
                    updateVariant(index, 'condition', event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <option value="NEW">Nuevo</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <Input
                label="Precio"
                type="number"
                min={0}
                step={1}
                required
                value={variant.price}
                onChange={(event) => updateVariant(index, 'price', event.target.value)}
              />
              <Input
                label="Costo"
                type="number"
                min={0}
                step={1}
                required
                value={variant.cost}
                onChange={(event) => updateVariant(index, 'cost', event.target.value)}
              />
              <Input
                label="Código de barras"
                maxLength={64}
                value={variant.barcode}
                onChange={(event) => updateVariant(index, 'barcode', event.target.value)}
              />
              <div className="text-xs text-gray-500 sm:col-span-5">
                {variant.id ? (
                  <>
                    Stock actual: tienda {variant.stock.STORE?.onHand ?? 0} · bodega{' '}
                    {variant.stock.WAREHOUSE?.onHand ?? 0}. El stock se cambia únicamente
                    desde Movimientos.
                  </>
                ) : (
                  'Variante nueva: registra su stock inicial después de guardar, desde Movimientos.'
                )}
              </div>
            </div>
          ))}
        </div>

        {message ? (
          <div role={message.tone === 'error' ? 'alert' : 'status'}>
            <Badge tone={message.tone === 'success' ? 'success' : 'danger'}>
              {message.tone === 'success' ? 'Listo' : 'Error'}
            </Badge>
            <p className="mt-2 text-sm text-gray-300">{message.text}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={submitting}>
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant={status === 'ARCHIVED' ? 'secondary' : 'danger'}
            disabled={submitting}
            onClick={onArchive}
          >
            {status === 'ARCHIVED' ? 'Reactivar producto' : 'Archivar producto'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
