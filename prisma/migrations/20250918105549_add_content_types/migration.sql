-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN "contentTypes" TEXT;

-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_name_key" ON "ContentType"("name");

-- CreateIndex
CREATE INDEX "ContentType_isActive_idx" ON "ContentType"("isActive");

-- CreateIndex
CREATE INDEX "ContentType_name_idx" ON "ContentType"("name");
