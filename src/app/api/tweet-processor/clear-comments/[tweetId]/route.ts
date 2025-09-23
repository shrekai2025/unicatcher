/**
 * 清理推文评论API
 * DELETE /api/tweet-processor/clear-comments/{tweetId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorStorage } from '~/server/core/tweet-processor/storage/tweet-storage';

export async function DELETE(
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

    console.log(`清理推文评论: ${tweetId}`);

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

    // 获取清理前的评论统计
    const beforeStats = await storage.getCommentStats(tweetId);

    // 清理评论
    const deletedCount = await storage.clearTweetComments(tweetId);

    return NextResponse.json({
      success: true,
      message: '评论清理完成',
      data: {
        tweetId,
        deletedComments: deletedCount,
        beforeStats: {
          totalComments: beforeStats.totalComments,
          replyComments: beforeStats.replyComments,
          latestCommentAt: beforeStats.latestCommentAt?.toISOString(),
        },
        clearedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('清理评论API错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '清理评论失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}