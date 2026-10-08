-- Ticket de servicio técnico (plan §4.8)
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED', 'DIAGNOSED', 'QUOTED', 'APPROVED', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED', 'UNCLAIMED');

-- CreateTable
CREATE TABLE "RepairTicket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceModel" TEXT,
    "deviceSerialNumber" TEXT,
    "faultDescription" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "diagnosis" TEXT,
    "quoteAmount" INTEGER,
    "repairNotes" TEXT,
    "cancellationReason" TEXT,
    "createdByUserId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairTicket_code_key" ON "RepairTicket"("code");

-- CreateIndex
CREATE INDEX "RepairTicket_status_idx" ON "RepairTicket"("status");

-- CreateIndex
CREATE INDEX "RepairTicket_createdAt_idx" ON "RepairTicket"("createdAt");

-- CreateIndex
CREATE INDEX "RepairTicket_customerPhone_idx" ON "RepairTicket"("customerPhone");