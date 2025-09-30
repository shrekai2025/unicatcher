-- AlterTable
ALTER TABLE "ArticleGenerationTask" ADD COLUMN "contentType" TEXT;
ALTER TABLE "ArticleGenerationTask" ADD COLUMN "username" TEXT;

-- CreateTable
CREATE TABLE "user_writing_overview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "overview_content" TEXT NOT NULL,
    "total_tweets_analyzed" INTEGER NOT NULL DEFAULT 0,
    "last_updated" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "update_history" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "overview_update_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "update_type" TEXT NOT NULL,
    "new_tweets_count" INTEGER,
    "changes_made" TEXT,
    "llm_model" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "overview_update_log_username_fkey" FOREIGN KEY ("username") REFERENCES "user_writing_overview" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "writing_assistant_ai_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" REAL NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "analysisModel" TEXT,
    "generationModel" TEXT,
    "updateCheckModel" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "user_writing_overview_username_key" ON "user_writing_overview"("username");

-- CreateIndex
CREATE INDEX "user_writing_overview_username_idx" ON "user_writing_overview"("username");

-- CreateIndex
CREATE INDEX "user_writing_overview_last_updated_idx" ON "user_writing_overview"("last_updated");

-- CreateIndex
CREATE INDEX "user_writing_overview_version_idx" ON "user_writing_overview"("version");

-- CreateIndex
CREATE INDEX "overview_update_log_username_idx" ON "overview_update_log"("username");

-- CreateIndex
CREATE INDEX "overview_update_log_update_type_idx" ON "overview_update_log"("update_type");

-- CreateIndex
CREATE INDEX "overview_update_log_created_at_idx" ON "overview_update_log"("created_at");

-- CreateIndex
CREATE INDEX "overview_update_log_username_created_at_idx" ON "overview_update_log"("username", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "writing_assistant_ai_config_configName_key" ON "writing_assistant_ai_config"("configName");

-- CreateIndex
CREATE INDEX "writing_assistant_ai_config_configName_idx" ON "writing_assistant_ai_config"("configName");

-- CreateIndex
CREATE INDEX "writing_assistant_ai_config_isActive_idx" ON "writing_assistant_ai_config"("isActive");

-- CreateIndex
CREATE INDEX "writing_assistant_ai_config_isDefault_idx" ON "writing_assistant_ai_config"("isDefault");

-- CreateIndex
CREATE INDEX "ArticleGenerationTask_username_idx" ON "ArticleGenerationTask"("username");

-- CreateIndex
CREATE INDEX "ArticleGenerationTask_contentType_idx" ON "ArticleGenerationTask"("contentType");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_username_annotated_at_idx" ON "tweet_type_annotation"("username", "annotated_at");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_annotation_method_idx" ON "tweet_type_annotation"("annotation_method");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_confidence_score_idx" ON "tweet_type_annotation"("confidence_score");
