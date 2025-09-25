-- CreateTable
CREATE TABLE "TopicTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIProcessRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalTweets" INTEGER NOT NULL DEFAULT 0,
    "processedTweets" INTEGER NOT NULL DEFAULT 0,
    "failedTweets" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    "filterConfig" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'openai',
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "systemPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isReply" BOOLEAN NOT NULL DEFAULT false,
    "imageUrls" TEXT,
    "profileImageUrl" TEXT,
    "videoUrls" TEXT,
    "tweetUrl" TEXT NOT NULL,
    "publishedAt" BIGINT NOT NULL,
    "listId" TEXT NOT NULL,
    "scrapedAt" BIGINT NOT NULL,
    "analysisStatus" TEXT,
    "syncedAt" DATETIME,
    "analyzedAt" DATETIME,
    "analysisBatchId" TEXT,
    "keywords" TEXT,
    "topicTags" TEXT,
    "aiProcessedAt" DATETIME,
    "aiProcessStatus" TEXT,
    "aiRetryCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tweet_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpiderTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tweet" ("analysisBatchId", "analysisStatus", "analyzedAt", "content", "createdAt", "id", "imageUrls", "isRT", "isReply", "likeCount", "listId", "profileImageUrl", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "tweetUrl", "updatedAt", "userNickname", "userUsername", "videoUrls", "viewCount") SELECT "analysisBatchId", "analysisStatus", "analyzedAt", "content", "createdAt", "id", "imageUrls", "isRT", "isReply", "likeCount", "listId", "profileImageUrl", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "tweetUrl", "updatedAt", "userNickname", "userUsername", "videoUrls", "viewCount" FROM "Tweet";
DROP TABLE "Tweet";
ALTER TABLE "new_Tweet" RENAME TO "Tweet";
CREATE INDEX "Tweet_listId_idx" ON "Tweet"("listId");
CREATE INDEX "Tweet_publishedAt_idx" ON "Tweet"("publishedAt");
CREATE INDEX "Tweet_taskId_idx" ON "Tweet"("taskId");
CREATE INDEX "Tweet_analysisStatus_idx" ON "Tweet"("analysisStatus");
CREATE INDEX "Tweet_syncedAt_idx" ON "Tweet"("syncedAt");
CREATE INDEX "Tweet_isDeleted_idx" ON "Tweet"("isDeleted");
CREATE INDEX "Tweet_isDeleted_publishedAt_idx" ON "Tweet"("isDeleted", "publishedAt");
CREATE INDEX "Tweet_isDeleted_listId_idx" ON "Tweet"("isDeleted", "listId");
CREATE INDEX "Tweet_aiProcessStatus_idx" ON "Tweet"("aiProcessStatus");
CREATE INDEX "Tweet_userUsername_idx" ON "Tweet"("userUsername");
CREATE INDEX "Tweet_isDeleted_aiProcessStatus_idx" ON "Tweet"("isDeleted", "aiProcessStatus");
CREATE INDEX "Tweet_isDeleted_listId_publishedAt_idx" ON "Tweet"("isDeleted", "listId", "publishedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TopicTag_name_key" ON "TopicTag"("name");

-- CreateIndex
CREATE INDEX "TopicTag_isActive_idx" ON "TopicTag"("isActive");

-- CreateIndex
CREATE INDEX "TopicTag_name_idx" ON "TopicTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AIProcessRecord_batchId_key" ON "AIProcessRecord"("batchId");

-- CreateIndex
CREATE INDEX "AIProcessRecord_status_idx" ON "AIProcessRecord"("status");

-- CreateIndex
CREATE INDEX "AIProcessRecord_startedAt_idx" ON "AIProcessRecord"("startedAt");

-- CreateIndex
CREATE INDEX "AIProcessRecord_batchId_idx" ON "AIProcessRecord"("batchId");
