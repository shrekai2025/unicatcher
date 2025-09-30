-- 写作分析模块性能优化索引迁移
-- 执行时间: 2024-01-01

-- WritingAnalysisTweet 表索引优化
CREATE INDEX IF NOT EXISTS "idx_wat_user_published" ON "WritingAnalysisTweet"("userUsername", "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_wat_published" ON "WritingAnalysisTweet"("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_wat_user_created" ON "WritingAnalysisTweet"("userUsername", "createdAt");

-- TweetTypeAnnotation 表索引优化
CREATE INDEX IF NOT EXISTS "idx_tta_username_annotated" ON "TweetTypeAnnotation"("username", "annotatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_tta_tweet_username" ON "TweetTypeAnnotation"("tweetId", "username");
CREATE INDEX IF NOT EXISTS "idx_tta_method" ON "TweetTypeAnnotation"("annotationMethod");
CREATE INDEX IF NOT EXISTS "idx_tta_confidence" ON "TweetTypeAnnotation"("confidenceScore" DESC);

-- UserStyleProfile 表索引优化
CREATE INDEX IF NOT EXISTS "idx_usp_updated" ON "UserStyleProfile"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_usp_tweet_count" ON "UserStyleProfile"("analyzedTweetCount" DESC);

-- TweetTypeConfig 表索引优化
CREATE INDEX IF NOT EXISTS "idx_ttc_category_active" ON "TweetTypeConfig"("category", "isActive");

-- 复合查询优化索引
CREATE INDEX IF NOT EXISTS "idx_wat_user_source_published" ON "WritingAnalysisTweet"("userUsername", "sourceTable", "publishedAt" DESC);