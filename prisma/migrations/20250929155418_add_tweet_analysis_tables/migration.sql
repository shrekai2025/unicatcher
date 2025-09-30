-- CreateTable
CREATE TABLE "tweet_type_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type_name" TEXT NOT NULL,
    "type_category" TEXT NOT NULL,
    "description" TEXT,
    "typical_structure" TEXT,
    "common_openings" TEXT,
    "tone_characteristics" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tweet_type_annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweet_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tweet_types" TEXT NOT NULL,
    "confidence_score" REAL NOT NULL,
    "annotation_method" TEXT NOT NULL,
    "annotated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tweet_type_annotation_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "writing_analysis_tweet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_style_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "signature_words" TEXT,
    "vocab_diversity" REAL,
    "word_complexity" REAL,
    "avg_sentence_length" REAL,
    "sentence_type_dist" TEXT,
    "punctuation_pattern" TEXT,
    "technical_term_usage" REAL,
    "data_citation_style" TEXT,
    "professional_topic_style" TEXT,
    "industry_knowledge_level" TEXT,
    "tweet_type_styles" TEXT,
    "type_combination_patterns" TEXT,
    "topic_style_templates" TEXT,
    "generation_config" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tweet_type_config_type_name_key" ON "tweet_type_config"("type_name");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_username_idx" ON "tweet_type_annotation"("username");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_tweet_id_idx" ON "tweet_type_annotation"("tweet_id");

-- CreateIndex
CREATE INDEX "tweet_type_annotation_annotated_at_idx" ON "tweet_type_annotation"("annotated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_style_profile_username_key" ON "user_style_profile"("username");
