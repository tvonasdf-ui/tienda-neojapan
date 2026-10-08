'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCartItem } from '@/lib/cart';

interface AddToCartButtonProps {
  item: {
    variantId: string;
    slug: string;
    name: string;
    platform: string;
    condition: string;
    sku: string;
    price: number;
    image: string;
  };
  disabled?: boolean;
}

export function AddToCartButton({ item, disabled = false }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => addCartItem({ ...item, quantity: 1 }),
    onSuccess: () => {
      setAdded(true);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      window.setTimeout(() => setAdded(false), 1600);
    },
  });
  return (
    <div className="add-to-cart-wrap"><button className="button-primary" type="button" onClick={() => mutation.mutate()} disabled={disabled || mutation.isPending}>{mutation.isPending ? 'Agregando…' : added ? 'Agregado al carrito ✓' : 'Agregar al carrito'}</button>{mutation.error ? <span className="error-text" role="alert">{mutation.error instanceof Error ? mutation.error.message : 'No se pudo agregar el producto.'}</span> : null}</div>
  );
}
