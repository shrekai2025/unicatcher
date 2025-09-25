-- CreateTable
CREATE TABLE "ListIdRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ListIdRecord_listId_idx" ON "ListIdRecord"("listId");

-- CreateIndex
CREATE INDEX "ListIdRecord_createdAt_idx" ON "ListIdRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListIdRecord_listId_key" ON "ListIdRecord"("listId");
