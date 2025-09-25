/**
 * 获取推文评论API
 * GET /api/tweet-processor/comments/{tweetId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorStorage } from '~/server/core/tweet-processor/storage/tweet-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tweetId: string }> }
) {
  try {
    // 验证API密钥
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { tweetId } = await params;

    if (!tweetId || typeof tweetId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid tweet ID' },
        { status: 400 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeReplies = searchParams.get('includeReplies') !== 'false';
    const includeStats = searchParams.get('includeStats') !== 'false';

    console.log(`获取推文评论: ${tweetId} (limit: ${limit}, includeReplies: ${includeReplies})`);

    // 获取存储服务实例
    const storage = new TweetProcessorStorage();

    // 检查推文是否存在
    const tweetExists = await storage.checkTweetExists(tweetId);
    if (!tweetExists) {
      return NextResponse.json(
        { error: 'Tweet not found in database' },
        { status: 404 }
      );
    }

    // 获取评论数据
    const allComments = await storage.getCommentsByTweetId(tweetId);

    // 过滤评论
    let filteredComments = allComments;
    if (!includeReplies) {
      filteredComments = allComments.filter(comment => !comment.isReply);
    }

    // 限制返回数量
    const limitedComments = filteredComments.slice(0, limit);

    // 构建响应数据
    const responseData: any = {
      tweetId,
      comments: limitedComments,
      pagination: {
        total: filteredComments.length,
        returned: limitedComments.length,
        hasMore: filteredComments.length > limit,
      },
    };

    // 包含统计信息
    if (includeStats) {
      const stats = await storage.getCommentStats(tweetId);
      const crawlHistory = await storage.getCrawlSessionHistory(tweetId, 5);

      responseData.stats = {
        totalComments: stats.totalComments,
        replyComments: stats.replyComments,
        directComments: stats.totalComments - stats.replyComments,
        latestCommentAt: stats.latestCommentAt?.toISOString(),
      };

      responseData.crawlHistory = crawlHistory.map(session => ({
        sessionId: session.id,
        status: session.status,
        totalComments: session.totalComments,
        newComments: session.newComments,
        isIncremental: session.isIncremental,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      message: '评论数据获取成功',
      data: responseData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('获取评论API错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '获取评论数据失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}