import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from '@neojapan/schemas';

const requestSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.REVALIDATE_SECRET;
  const providedSecret = request.headers.get('x-revalidate-secret') ?? '';
  const expectedBytes = Buffer.from(expectedSecret ?? '');
  const providedBytes = Buffer.from(providedSecret);
  if (!expectedSecret || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Se requiere productId y slug válidos.' }, { status: 400 });
  }

  revalidateTag('products', 'max');
  revalidateTag(`product:${parsed.data.productId}`, 'max');
  revalidateTag(`product:${parsed.data.slug}`, 'max');
  return NextResponse.json({ revalidated: true });
}
