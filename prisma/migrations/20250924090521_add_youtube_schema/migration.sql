-- AlterTable
ALTER TABLE "TweetProcessTask" ADD COLUMN "aiComments" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "authorNickname" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "authorProfileImage" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "authorUsername" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "translatedContent" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "tweetContent" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "tweetUrl" TEXT;
ALTER TABLE "TweetProcessTask" ADD COLUMN "userExtraInfo" TEXT;

-- CreateTable
CREATE TABLE "YouTubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelHandle" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TEXT,
    "publishedTimestamp" BIGINT,
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
    "translatedTitle" TEXT,
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
    CONSTRAINT "YouTubeVideo_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpiderTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YouTubeChannelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelHandle" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCrawledAt" DATETIME,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpiderTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "listId" TEXT,
    "channelHandle" TEXT,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "tweetCount" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SpiderTask" ("completedAt", "createdAt", "id", "listId", "result", "startedAt", "status", "tweetCount", "type", "updatedAt") SELECT "completedAt", "createdAt", "id", "listId", "result", "startedAt", "status", "tweetCount", "type", "updatedAt" FROM "SpiderTask";
DROP TABLE "SpiderTask";
ALTER TABLE "new_SpiderTask" RENAME TO "SpiderTask";
CREATE INDEX "SpiderTask_status_idx" ON "SpiderTask"("status");
CREATE INDEX "SpiderTask_type_idx" ON "SpiderTask"("type");
CREATE INDEX "SpiderTask_listId_idx" ON "SpiderTask"("listId");
CREATE INDEX "SpiderTask_channelHandle_idx" ON "SpiderTask"("channelHandle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "YouTubeVideo_channelHandle_idx" ON "YouTubeVideo"("channelHandle");

-- CreateIndex
CREATE INDEX "YouTubeVideo_publishedTimestamp_idx" ON "YouTubeVideo"("publishedTimestamp");

-- CreateIndex
CREATE INDEX "YouTubeVideo_taskId_idx" ON "YouTubeVideo"("taskId");

-- CreateIndex
CREATE INDEX "YouTubeVideo_analysisStatus_idx" ON "YouTubeVideo"("analysisStatus");

-- CreateIndex
CREATE INDEX "YouTubeVideo_syncedAt_idx" ON "YouTubeVideo"("syncedAt");

-- CreateIndex
CREATE INDEX "YouTubeVideo_isDeleted_idx" ON "YouTubeVideo"("isDeleted");

-- CreateIndex
CREATE INDEX "YouTubeVideo_isDeleted_publishedTimestamp_idx" ON "YouTubeVideo"("isDeleted", "publishedTimestamp");

-- CreateIndex
CREATE INDEX "YouTubeVideo_isDeleted_channelHandle_idx" ON "YouTubeVideo"("isDeleted", "channelHandle");

-- CreateIndex
CREATE INDEX "YouTubeVideo_aiProcessStatus_idx" ON "YouTubeVideo"("aiProcessStatus");

-- CreateIndex
CREATE INDEX "YouTubeVideo_isDeleted_aiProcessStatus_idx" ON "YouTubeVideo"("isDeleted", "aiProcessStatus");

-- CreateIndex
CREATE INDEX "YouTubeVideo_isDeleted_channelHandle_publishedTimestamp_idx" ON "YouTubeVideo"("isDeleted", "channelHandle", "publishedTimestamp");

-- CreateIndex
CREATE INDEX "YouTubeVideo_viewCount_idx" ON "YouTubeVideo"("viewCount");

-- CreateIndex
CREATE INDEX "YouTubeChannelRecord_channelHandle_idx" ON "YouTubeChannelRecord"("channelHandle");

-- CreateIndex
CREATE INDEX "YouTubeChannelRecord_isActive_idx" ON "YouTubeChannelRecord"("isActive");

-- CreateIndex
CREATE INDEX "YouTubeChannelRecord_lastCrawledAt_idx" ON "YouTubeChannelRecord"("lastCrawledAt");

-- CreateIndex
CREATE INDEX "YouTubeChannelRecord_createdAt_idx" ON "YouTubeChannelRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeChannelRecord_channelHandle_key" ON "YouTubeChannelRecord"("channelHandle");

-- CreateIndex
CREATE INDEX "TweetProcessTask_taskType_idx" ON "TweetProcessTask"("taskType");
