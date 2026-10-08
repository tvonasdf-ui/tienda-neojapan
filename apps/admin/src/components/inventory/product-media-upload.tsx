'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Input } from '@neojapan/ui';
import { clientApi } from '@/lib/api';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset: string;
  publicId: string;
  allowedFormats: string;
}

interface CloudinaryUploadResponse {
  public_id?: string;
  error?: { message?: string };
}

interface ProductMedia {
  publicId: string;
  alt: string | null;
  isPrimary: boolean;
}

interface ProductMediaUploadProps {
  productId: string;
  productName: string;
  media: ProductMedia[];
}

export function ProductMediaUpload({
  productId,
  productName,
  media,
}: ProductMediaUploadProps) {
  const router = useRouter();
  const [alt, setAlt] = useState(productName);
  const [isPrimary, setIsPrimary] = useState(media.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('image');
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
      setMessage({ tone: 'error', text: 'Selecciona una imagen para continuar.' });
      return;
    }

    const file = fileInput.files[0];
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setMessage({ tone: 'error', text: 'Formato no permitido; usa JPG, PNG o WebP.' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage({ tone: 'error', text: 'La imagen no puede superar 10 MB.' });
      return;
    }

    setSubmitting(true);
    try {
      const signature = await clientApi<UploadSignature>('/media/sign', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('api_key', signature.apiKey);
      uploadData.append('timestamp', String(signature.timestamp));
      uploadData.append('signature', signature.signature);
      uploadData.append('upload_preset', signature.uploadPreset);
      uploadData.append('public_id', signature.publicId);
      uploadData.append('allowed_formats', signature.allowedFormats);
      uploadData.append('overwrite', 'false');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
        { method: 'POST', body: uploadData },
      );
      const uploaded = (await uploadResponse.json()) as CloudinaryUploadResponse;
      if (!uploadResponse.ok || !uploaded.public_id) {
        throw new Error(uploaded.error?.message ?? 'Cloudinary no pudo recibir la imagen.');
      }

      await clientApi<ProductMedia>('/media', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          publicId: uploaded.public_id,
          alt: alt.trim() || undefined,
          isPrimary,
        }),
      });
      setMessage({ tone: 'success', text: 'Imagen cargada y asociada al producto.' });
      fileInput.value = '';
      router.refresh();
    } catch (cause) {
      setMessage({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'No se pudo cargar la imagen.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div>
        <h2 className="font-display text-lg text-gray-100">Imágenes del producto</h2>
        <p className="mt-1 text-sm text-gray-400">
          JPG, PNG o WebP · máximo 10 MB. El archivo se sube directamente a Cloudinary.
        </p>
      </div>

      {media.length ? (
        <ul className="space-y-2">
          {media.map((asset) => (
            <li
              key={asset.publicId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 p-3 text-sm"
            >
              <span className="break-all font-mono text-gray-300">{asset.publicId}</span>
              <span className="flex items-center gap-2">
                {asset.isPrimary ? <Badge tone="success">Principal</Badge> : null}
                <span className="text-gray-500">{asset.alt ?? 'Sin texto alternativo'}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Todavía no hay imágenes asociadas.</p>
      )}

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="product-image" className="block text-sm font-medium text-gray-200">
            Archivo de imagen
          </label>
          <input
            id="product-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-gray-100"
          />
        </div>
        <Input
          label="Texto alternativo"
          maxLength={200}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(event) => setIsPrimary(event.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Usar como imagen principal
        </label>
        {message ? (
          <div className="sm:col-span-2" role={message.tone === 'error' ? 'alert' : 'status'}>
            <Badge tone={message.tone === 'success' ? 'success' : 'danger'}>
              {message.tone === 'success' ? 'Listo' : 'Error'}
            </Badge>
            <p className="mt-2 text-sm text-gray-300">{message.text}</p>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" loading={submitting}>
            Subir imagen
          </Button>
        </div>
      </form>
    </Card>
  );
}
