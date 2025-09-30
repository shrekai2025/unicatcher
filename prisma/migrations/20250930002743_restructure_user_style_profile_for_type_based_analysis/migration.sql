/*
  Warnings:

  - You are about to drop the column `topic_style_templates` on the `user_style_profile` table. All the data in the column will be lost.
  - You are about to drop the column `tweet_type_styles` on the `user_style_profile` table. All the data in the column will be lost.
  - You are about to drop the column `type_combination_patterns` on the `user_style_profile` table. All the data in the column will be lost.
  - Added the required column `content_type` to the `user_style_profile` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_style_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
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
    "common_openings" TEXT,
    "common_closings" TEXT,
    "avg_content_length" REAL,
    "tone_features" TEXT,
    "sample_count" INTEGER,
    "last_analyzed_at" DATETIME,
    "generation_config" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_user_style_profile" ("avg_sentence_length", "created_at", "data_citation_style", "generation_config", "id", "industry_knowledge_level", "professional_topic_style", "punctuation_pattern", "sentence_type_dist", "signature_words", "technical_term_usage", "updated_at", "username", "vocab_diversity", "word_complexity") SELECT "avg_sentence_length", "created_at", "data_citation_style", "generation_config", "id", "industry_knowledge_level", "professional_topic_style", "punctuation_pattern", "sentence_type_dist", "signature_words", "technical_term_usage", "updated_at", "username", "vocab_diversity", "word_complexity" FROM "user_style_profile";
DROP TABLE "user_style_profile";
ALTER TABLE "new_user_style_profile" RENAME TO "user_style_profile";
CREATE INDEX "user_style_profile_username_idx" ON "user_style_profile"("username");
CREATE INDEX "user_style_profile_content_type_idx" ON "user_style_profile"("content_type");
CREATE INDEX "user_style_profile_last_analyzed_at_idx" ON "user_style_profile"("last_analyzed_at");
CREATE UNIQUE INDEX "user_style_profile_username_content_type_key" ON "user_style_profile"("username", "content_type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
