CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_slug_trgm_idx"
  ON "Product" USING GIN ("slug" gin_trgm_ops);

ALTER TABLE "Sale"
  ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

CREATE INDEX "Sale_reservationExpiresAt_status_idx"
  ON "Sale"("reservationExpiresAt", "status");

CREATE TABLE "Cart" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartItem" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");
