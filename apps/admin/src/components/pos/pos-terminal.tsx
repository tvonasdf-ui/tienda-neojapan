"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Input } from "@neojapan/ui";
import { clientApi, formatCLP } from "@/lib/api";

interface ProductVariant {
  id: string;
  sku: string;
  condition: string;
  price: number;
  stock: number;
  name: string;
}

interface CatalogVariant {
  id: string;
  sku: string;
  condition: string;
  price: number;
  stock: Record<string, { onHand: number; reserved: number }>;
}

interface CatalogProduct {
  name: string;
  variants: CatalogVariant[];
}

interface CartLine extends ProductVariant {
  quantity: number;
}

export function PosTerminal() {
  const [products, setProducts] = useState<ProductVariant[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "TRANSFER"
  >("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void clientApi<{ items: CatalogProduct[] }>("/admin/products?limit=100")
      .then((payload) =>
        setProducts(
          payload.items.flatMap((product) =>
            product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              condition: variant.condition,
              price: variant.price,
              stock: Object.values(variant.stock).reduce(
                (sum, level) =>
                  sum + Math.max(level.onHand - level.reserved, 0),
                0,
              ),
              name: product.name,
            })),
          ),
        ),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el catálogo.",
        ),
      );
  }, []);

  function addProduct(product: ProductVariant) {
    const existing = cart.find((line) => line.id === product.id);
    if (
      product.stock === 0 ||
      (existing && existing.quantity >= product.stock)
    ) {
      setError(`No hay más unidades disponibles de ${product.name}.`);
      return;
    }

    setError(null);
    setCart((current) => {
      const currentLine = current.find((line) => line.id === product.id);
      if (currentLine) {
        return current.map((line) =>
          line.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.id === id ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function subtotal() {
    return cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await clientApi<{ code: string; total: number }>(
        "/orders/pos",
        {
          method: "POST",
          body: JSON.stringify({
            lines: cart.map(({ id, quantity }) => ({
              variantId: id,
              quantity,
            })),
            paymentMethod,
            paymentAmount: Number(paymentAmount || subtotal()),
            reference: undefined,
            customerName: customerName || "Cliente",
            customerPhone: customerPhone || "+00000000000",
          }),
        },
      );
      setCart([]);
      setPaymentAmount("");
      alert(`Venta ${result.code} registrada por ${formatCLP(result.total)}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar la venta.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-gray-100">
            Punto de venta
          </h1>
          <p className="text-gray-400">
            Selecciona productos y registra la venta con stock actualizado.
          </p>
        </div>
        <Card className="p-4">
          <Input
            label="Buscar producto"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SKU o nombre"
          />
          <div className="mt-4 grid gap-2">
            {products
              .filter((product) =>
                `${product.name} ${product.sku}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={
                    product.stock === 0 ||
                    (cart.find((line) => line.id === product.id)?.quantity ??
                      0) >= product.stock
                  }
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-left hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    <strong className="block text-gray-100">
                      {product.name}
                    </strong>
                    <span className="font-mono text-xs text-gray-500">
                      {product.sku} · {product.condition}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-gray-200">
                      {formatCLP(product.price)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {product.stock} unidades
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Carrito</h2>
            <Badge tone="neutral">
              {cart.reduce((sum, line) => sum + line.quantity, 0)} ítems
            </Badge>
          </div>
          <div className="space-y-2">
            {cart.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 p-3"
              >
                <div>
                  <p className="text-sm text-gray-100">{line.name}</p>
                  <p className="font-mono text-xs text-gray-500">
                    {line.sku} × {line.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Quitar una unidad de ${line.name}`}
                    onClick={() => changeQuantity(line.id, -1)}
                    className="h-8 w-8 rounded-lg border border-gray-700"
                  >
                    −
                  </button>
                  <span className="w-5 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Añadir una unidad de ${line.name}`}
                    disabled={line.quantity >= line.stock}
                    onClick={() => addProduct(line)}
                    className="h-8 w-8 rounded-lg border border-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Input
            label="Cliente"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nombre"
          />
          <Input
            label="Teléfono"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="+56 9..."
          />
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-3 text-sm">
              Medio de pago
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as typeof paymentMethod)
                }
                className="mt-1 block w-full rounded bg-gray-800 p-2"
              >
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </label>
          </div>
          <Input
            label="Monto pagado"
            type="number"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
          />
          <div className="flex justify-between border-t border-gray-700 pt-4">
            <strong>Total</strong>
            <strong className="font-mono">{formatCLP(subtotal())}</strong>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button
            type="submit"
            loading={loading}
            fullWidth
            disabled={cart.length === 0}
          >
            Registrar venta
          </Button>
        </form>
      </Card>
    </div>
  );
}
