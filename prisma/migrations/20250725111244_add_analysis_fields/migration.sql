-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpiderTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "tweetCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userNickname" TEXT NOT NULL,
    "userUsername" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "retweetCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "DataSyncRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetIds" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" DATETIME,
    "requestSystem" TEXT,
    "tweetCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'synced',
    "errorMessage" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "SpiderTask_status_idx" ON "SpiderTask"("status");

-- CreateIndex
CREATE INDEX "SpiderTask_type_idx" ON "SpiderTask"("type");

-- CreateIndex
CREATE INDEX "SpiderTask_listId_idx" ON "SpiderTask"("listId");

-- CreateIndex
CREATE INDEX "Tweet_listId_idx" ON "Tweet"("listId");

-- CreateIndex
CREATE INDEX "Tweet_publishedAt_idx" ON "Tweet"("publishedAt");

-- CreateIndex
CREATE INDEX "Tweet_taskId_idx" ON "Tweet"("taskId");

-- CreateIndex
CREATE INDEX "Tweet_analysisStatus_idx" ON "Tweet"("analysisStatus");

-- CreateIndex
CREATE INDEX "Tweet_syncedAt_idx" ON "Tweet"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataSyncRecord_batchId_key" ON "DataSyncRecord"("batchId");

-- CreateIndex
CREATE INDEX "DataSyncRecord_status_idx" ON "DataSyncRecord"("status");

-- CreateIndex
CREATE INDEX "DataSyncRecord_syncedAt_idx" ON "DataSyncRecord"("syncedAt");

-- CreateIndex
CREATE INDEX "DataSyncRecord_batchId_idx" ON "DataSyncRecord"("batchId");
