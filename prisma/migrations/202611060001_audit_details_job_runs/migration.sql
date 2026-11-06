-- Additive only: no existing table, column or row is changed or removed.
ALTER TABLE "AuditLog" ADD COLUMN "details" JSONB;

CREATE TABLE "JobRun" (
    "name" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastResult" JSONB,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("name")
);

CREATE INDEX "Order_date_slotId_idx" ON "Order"("date", "slotId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_method_paymentStatus_status_reservedUntil_idx" ON "Order"("method", "paymentStatus", "status", "reservedUntil");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Server-side Prisma only, as with every other table. No browser or Data API policies.
ALTER TABLE "JobRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
