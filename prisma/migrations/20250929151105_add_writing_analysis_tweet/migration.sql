-- CreateTable
CREATE TABLE "ManualTweetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ManualTweetText" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "userUsername" TEXT NOT NULL,
    "publishedAt" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualTweetText_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ManualTweetCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentPlatform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "description" TEXT,
    "wordCount" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArticleType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectedArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectedArticlePlatform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    CONSTRAINT "CollectedArticlePlatform_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "CollectedArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectedArticlePlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ContentPlatform" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectedArticleType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    CONSTRAINT "CollectedArticleType_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "CollectedArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectedArticleType_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ArticleType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentStructure_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ContentPlatform" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentStructure_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ArticleType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleGenerationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "referenceArticleIds" TEXT,
    "referenceArticleCount" INTEGER NOT NULL DEFAULT 0,
    "additionalRequirements" TEXT,
    "useContentStructure" BOOLEAN NOT NULL DEFAULT false,
    "contentStructureId" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'openai',
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "aiBaseURL" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleGenerationTask_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ContentPlatform" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleGenerationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleGenerationResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ArticleGenerationTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_comment_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemPromptTemplate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_provider_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "url2text_result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalUrl" TEXT NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "content" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "writing_analysis_tweet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "userUsername" TEXT NOT NULL,
    "publishedAt" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "retweetCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "analysisStatus" TEXT DEFAULT 'pending',
    "cleanedContent" TEXT,
    "textLength" INTEGER,
    "wordCount" INTEGER,
    "sentenceCount" INTEGER,
    "lexicalFeatures" TEXT,
    "syntaxFeatures" TEXT,
    "rhetoricalFeatures" TEXT,
    "topicClassification" TEXT,
    "contentDepthLevel" TEXT,
    "structurePattern" TEXT,
    "engagementScore" REAL,
    "contentQualityScore" REAL,
    "overallScore" REAL,
    "analyzedAt" DATETIME,
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualTweetCategory_name_key" ON "ManualTweetCategory"("name");

-- CreateIndex
CREATE INDEX "ManualTweetCategory_name_idx" ON "ManualTweetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ManualTweetText_tweetId_key" ON "ManualTweetText"("tweetId");

-- CreateIndex
CREATE INDEX "ManualTweetText_categoryId_idx" ON "ManualTweetText"("categoryId");

-- CreateIndex
CREATE INDEX "ManualTweetText_userUsername_idx" ON "ManualTweetText"("userUsername");

-- CreateIndex
CREATE INDEX "ManualTweetText_publishedAt_idx" ON "ManualTweetText"("publishedAt");

-- CreateIndex
CREATE INDEX "ManualTweetText_tweetId_idx" ON "ManualTweetText"("tweetId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPlatform_name_key" ON "ContentPlatform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPlatform_platformId_key" ON "ContentPlatform"("platformId");

-- CreateIndex
CREATE INDEX "ContentPlatform_isDefault_idx" ON "ContentPlatform"("isDefault");

-- CreateIndex
CREATE INDEX "ContentPlatform_platformId_idx" ON "ContentPlatform"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleType_name_key" ON "ArticleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleType_typeId_key" ON "ArticleType"("typeId");

-- CreateIndex
CREATE INDEX "ArticleType_isDefault_idx" ON "ArticleType"("isDefault");

-- CreateIndex
CREATE INDEX "ArticleType_typeId_idx" ON "ArticleType"("typeId");

-- CreateIndex
CREATE INDEX "CollectedArticle_collectedAt_idx" ON "CollectedArticle"("collectedAt");

-- CreateIndex
CREATE INDEX "CollectedArticle_author_idx" ON "CollectedArticle"("author");

-- CreateIndex
CREATE INDEX "CollectedArticlePlatform_articleId_idx" ON "CollectedArticlePlatform"("articleId");

-- CreateIndex
CREATE INDEX "CollectedArticlePlatform_platformId_idx" ON "CollectedArticlePlatform"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectedArticlePlatform_articleId_platformId_key" ON "CollectedArticlePlatform"("articleId", "platformId");

-- CreateIndex
CREATE INDEX "CollectedArticleType_articleId_idx" ON "CollectedArticleType"("articleId");

-- CreateIndex
CREATE INDEX "CollectedArticleType_typeId_idx" ON "CollectedArticleType"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectedArticleType_articleId_typeId_key" ON "CollectedArticleType"("articleId", "typeId");

-- CreateIndex
CREATE INDEX "ContentStructure_platformId_idx" ON "ContentStructure"("platformId");

-- CreateIndex
CREATE INDEX "ContentStructure_typeId_idx" ON "ContentStructure"("typeId");

-- CreateIndex
CREATE INDEX "ContentStructure_createdAt_idx" ON "ContentStructure"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleGenerationTask_status_idx" ON "ArticleGenerationTask"("status");

-- CreateIndex
CREATE INDEX "ArticleGenerationTask_createdAt_idx" ON "ArticleGenerationTask"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleGenerationTask_platformId_idx" ON "ArticleGenerationTask"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleGenerationResult_taskId_key" ON "ArticleGenerationResult"("taskId");

-- CreateIndex
CREATE INDEX "ArticleGenerationResult_taskId_idx" ON "ArticleGenerationResult"("taskId");

-- CreateIndex
CREATE INDEX "ArticleGenerationResult_generatedAt_idx" ON "ArticleGenerationResult"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_config_provider_key" ON "ai_provider_config"("provider");

-- CreateIndex
CREATE INDEX "ai_provider_config_provider_idx" ON "ai_provider_config"("provider");

-- CreateIndex
CREATE INDEX "ai_provider_config_isActive_idx" ON "ai_provider_config"("isActive");

-- CreateIndex
CREATE INDEX "url2text_result_originalUrl_idx" ON "url2text_result"("originalUrl");

-- CreateIndex
CREATE INDEX "url2text_result_createdAt_idx" ON "url2text_result"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "writing_analysis_tweet_tweetId_key" ON "writing_analysis_tweet"("tweetId");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_userUsername_idx" ON "writing_analysis_tweet"("userUsername");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_publishedAt_idx" ON "writing_analysis_tweet"("publishedAt");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_sourceType_idx" ON "writing_analysis_tweet"("sourceType");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_analysisStatus_idx" ON "writing_analysis_tweet"("analysisStatus");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_userUsername_publishedAt_idx" ON "writing_analysis_tweet"("userUsername", "publishedAt");

-- CreateIndex
CREATE INDEX "writing_analysis_tweet_createdAt_idx" ON "writing_analysis_tweet"("createdAt");
