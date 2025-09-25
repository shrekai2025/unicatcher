-- CreateTable
CREATE TABLE "TweetProcessTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lastUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TweetComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "authorNickname" TEXT NOT NULL,
    "authorProfileImage" TEXT,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" BIGINT NOT NULL,
    "scrapedAt" BIGINT NOT NULL,
    "isReply" BOOLEAN NOT NULL DEFAULT false,
    "parentCommentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CommentCrawlSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "newComments" INTEGER NOT NULL DEFAULT 0,
    "lastCommentId" TEXT,
    "isIncremental" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIGeneratedComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT NOT NULL,
    "userInfo" TEXT,
    "systemPrompt" TEXT,
    "commentLength" TEXT NOT NULL,
    "commentCount" INTEGER NOT NULL,
    "generatedComments" TEXT NOT NULL,
    "basedOnExisting" BOOLEAN NOT NULL DEFAULT false,
    "existingCommentsSnapshot" TEXT,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TweetProcessTask_tweetId_taskType_idx" ON "TweetProcessTask"("tweetId", "taskType");

-- CreateIndex
CREATE INDEX "TweetProcessTask_status_idx" ON "TweetProcessTask"("status");

-- CreateIndex
CREATE INDEX "TweetProcessTask_lastUpdatedAt_idx" ON "TweetProcessTask"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "TweetProcessTask_createdAt_idx" ON "TweetProcessTask"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TweetComment_commentId_key" ON "TweetComment"("commentId");

-- CreateIndex
CREATE INDEX "TweetComment_tweetId_publishedAt_idx" ON "TweetComment"("tweetId", "publishedAt");

-- CreateIndex
CREATE INDEX "TweetComment_commentId_idx" ON "TweetComment"("commentId");

-- CreateIndex
CREATE INDEX "TweetComment_tweetId_idx" ON "TweetComment"("tweetId");

-- CreateIndex
CREATE INDEX "TweetComment_parentCommentId_idx" ON "TweetComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "CommentCrawlSession_tweetId_idx" ON "CommentCrawlSession"("tweetId");

-- CreateIndex
CREATE INDEX "CommentCrawlSession_status_idx" ON "CommentCrawlSession"("status");

-- CreateIndex
CREATE INDEX "CommentCrawlSession_startedAt_idx" ON "CommentCrawlSession"("startedAt");

-- CreateIndex
CREATE INDEX "AIGeneratedComment_tweetId_idx" ON "AIGeneratedComment"("tweetId");

-- CreateIndex
CREATE INDEX "AIGeneratedComment_createdAt_idx" ON "AIGeneratedComment"("createdAt");
