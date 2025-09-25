import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取推文信息API
 * GET /api/tweet-processor/tweet-info/[tweetId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tweetId: string }> }
) {
  try {
    const { tweetId } = await params;
    console.log(`[推文信息API] 获取推文信息: ${tweetId}`);

    // 验证推文ID格式
    if (!tweetId || !/^\d{10,20}$/.test(tweetId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TWEET_ID', message: 'Invalid tweet ID format' }
        },
        { status: 400 }
      );
    }

    // 查询推文数据
    const tweet = await db.tweet.findUnique({
      where: {
        id: tweetId,
        isDeleted: false
      },
      select: {
        id: true,
        content: true,
        userNickname: true,
        userUsername: true,
        profileImageUrl: true,
        replyCount: true,
        retweetCount: true,
        likeCount: true,
        viewCount: true,
        imageUrls: true,
        videoUrls: true,
        tweetUrl: true,
        publishedAt: true,
        listId: true,

        // 翻译相关字段
        translatedContent: true,
        originalLanguage: true,
        isTranslated: true,
        translationProvider: true,
        translationModel: true,
        translatedAt: true,

        // AI分析相关字段
        keywords: true,
        topicTags: true,
        contentTypes: true,
        isValueless: true,
        aiProcessedAt: true,

        createdAt: true,
        updatedAt: true
      }
    });

    if (!tweet) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tweet not found or deleted' }
        },
        { status: 404 }
      );
    }

    // 获取评论统计
    const commentCount = await db.tweetComment.count({
      where: { tweetId: tweetId }
    });

    // 获取最近的评论（前5条）
    const recentComments = await db.tweetComment.findMany({
      where: { tweetId: tweetId },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        commentId: true,
        content: true,
        authorUsername: true,
        authorNickname: true,
        authorProfileImage: true,
        replyCount: true,
        likeCount: true,
        publishedAt: true,
        isReply: true
      }
    });

    // 格式化时间戳
    const formatTweet = {
      ...tweet,
      publishedAt: Number(tweet.publishedAt),
      publishedAtFormatted: new Date(Number(tweet.publishedAt)).toLocaleString('zh-CN'),

      // 解析JSON字段
      imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : [],
      videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
      keywords: tweet.keywords ? JSON.parse(tweet.keywords) : [],
      topicTags: tweet.topicTags ? JSON.parse(tweet.topicTags) : [],
      contentTypes: tweet.contentTypes ? JSON.parse(tweet.contentTypes) : [],

      // 评论相关数据
      commentCount: commentCount,
      recentComments: recentComments.map(comment => ({
        ...comment,
        publishedAt: Number(comment.publishedAt),
        publishedAtFormatted: new Date(Number(comment.publishedAt)).toLocaleString('zh-CN')
      }))
    };

    console.log(`[推文信息API] 找到推文: ${tweet.userUsername} - ${tweet.content.substring(0, 50)}...`);

    return NextResponse.json({
      success: true,
      data: formatTweet
    });

  } catch (error) {
    console.error('[推文信息API] 处理失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal Server Error'
        }
      },
      { status: 500 }
    );
  }
}