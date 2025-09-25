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
    "contentTypes" TEXT,
    "isValueless" BOOLEAN,
    "aiProcessedAt" DATETIME,
    "aiProcessStatus" TEXT,
    "aiRetryCount" INTEGER NOT NULL DEFAULT 0,
    "translatedContent" TEXT,
    "originalLanguage" TEXT,
    "isTranslated" BOOLEAN NOT NULL DEFAULT false,
    "translationProvider" TEXT,
    "translationModel" TEXT,
    "translatedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tweet_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpiderTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tweet" ("aiProcessStatus", "aiProcessedAt", "aiRetryCount", "analysisBatchId", "analysisStatus", "analyzedAt", "content", "contentTypes", "createdAt", "deletedAt", "deletedBy", "id", "imageUrls", "isDeleted", "isRT", "isReply", "isValueless", "keywords", "likeCount", "listId", "profileImageUrl", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "topicTags", "tweetUrl", "updatedAt", "userNickname", "userUsername", "videoUrls", "viewCount") SELECT "aiProcessStatus", "aiProcessedAt", "aiRetryCount", "analysisBatchId", "analysisStatus", "analyzedAt", "content", "contentTypes", "createdAt", "deletedAt", "deletedBy", "id", "imageUrls", "isDeleted", "isRT", "isReply", "isValueless", "keywords", "likeCount", "listId", "profileImageUrl", "publishedAt", "replyCount", "retweetCount", "scrapedAt", "syncedAt", "taskId", "topicTags", "tweetUrl", "updatedAt", "userNickname", "userUsername", "videoUrls", "viewCount" FROM "Tweet";
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
