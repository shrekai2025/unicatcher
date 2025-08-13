/*
  Warnings:

  - Added the required column `updatedAt` to the `DataSyncRecord` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataSyncRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetIds" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" DATETIME,
    "requestSystem" TEXT,
    "tweetCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'synced',
    "errorMessage" TEXT,
    "extractType" TEXT NOT NULL DEFAULT 'analysis',
    "listId" TEXT,
    "username" TEXT,
    "isReExtract" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DataSyncRecord" ("analyzedAt", "batchId", "errorMessage", "id", "requestSystem", "status", "syncedAt", "tweetCount", "tweetIds") SELECT "analyzedAt", "batchId", "errorMessage", "id", "requestSystem", "status", "syncedAt", "tweetCount", "tweetIds" FROM "DataSyncRecord";
DROP TABLE "DataSyncRecord";
ALTER TABLE "new_DataSyncRecord" RENAME TO "DataSyncRecord";
CREATE UNIQUE INDEX "DataSyncRecord_batchId_key" ON "DataSyncRecord"("batchId");
CREATE INDEX "DataSyncRecord_status_idx" ON "DataSyncRecord"("status");
CREATE INDEX "DataSyncRecord_syncedAt_idx" ON "DataSyncRecord"("syncedAt");
CREATE INDEX "DataSyncRecord_batchId_idx" ON "DataSyncRecord"("batchId");
CREATE INDEX "DataSyncRecord_extractType_idx" ON "DataSyncRecord"("extractType");
CREATE INDEX "DataSyncRecord_createdAt_idx" ON "DataSyncRecord"("createdAt");
CREATE TABLE "new_Tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userNickname" TEXT NOT NULL,
    "userUsername" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "retweetCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isRT" BOOLEAN NOT NULL DEFAULT false,
    "imageUrls" TEXT,
    "tweetUrl" TEXT NOT NULL,
    "publishedAt" BIGINT NOT NULL,
    "listId" TEXT NOT NULL,
    "scrapedAt" BIGINT NOT NULL,
    "analysisStatus" TEXT,
    "syncedAt" DATETIME,
    "analyzedAt" DATETIME,
    "analysisBatchId" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tweet_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpiderTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tweet" ("analysisBatchId", "analysisStatus", "analyzedAt", "content", "createdAt", "id", "imageUrls", "likeCount", "listId", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "tweetUrl", "updatedAt", "userNickname", "userUsername", "viewCount") SELECT "analysisBatchId", "analysisStatus", "analyzedAt", "content", "createdAt", "id", "imageUrls", "likeCount", "listId", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "tweetUrl", "updatedAt", "userNickname", "userUsername", "viewCount" FROM "Tweet";
DROP TABLE "Tweet";
ALTER TABLE "new_Tweet" RENAME TO "Tweet";
CREATE INDEX "Tweet_listId_idx" ON "Tweet"("listId");
CREATE INDEX "Tweet_publishedAt_idx" ON "Tweet"("publishedAt");
CREATE INDEX "Tweet_taskId_idx" ON "Tweet"("taskId");
CREATE INDEX "Tweet_analysisStatus_idx" ON "Tweet"("analysisStatus");
CREATE INDEX "Tweet_syncedAt_idx" ON "Tweet"("syncedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
