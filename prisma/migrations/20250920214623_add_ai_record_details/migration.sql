-- AlterTable
ALTER TABLE "AIProcessRecord" ADD COLUMN "batchProcessingMode" TEXT DEFAULT 'optimized';
ALTER TABLE "AIProcessRecord" ADD COLUMN "processingLogs" TEXT;
ALTER TABLE "AIProcessRecord" ADD COLUMN "requestDetails" TEXT;
ALTER TABLE "AIProcessRecord" ADD COLUMN "responseDetails" TEXT;

-- CreateIndex
CREATE INDEX "AIProcessRecord_createdAt_idx" ON "AIProcessRecord"("createdAt");
