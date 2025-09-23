/**
 * 推文评论爬取API
 * POST /api/tweet-processor/crawl-comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorManager } from '~/server/core/tweet-processor/manager';
import type { CommentCrawlRequest } from '~/server/core/tweet-processor/types';

export async function POST(request: NextRequest) {
  try {
    // 验证API密钥
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { tweetId, incremental = false, maxScrolls = 20 } = body;

    // 验证必需参数
    if (!tweetId || typeof tweetId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid tweetId' },
        { status: 400 }
      );
    }

    // 验证可选参数
    if (typeof incremental !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid incremental parameter, must be boolean' },
        { status: 400 }
      );
    }

    if (typeof maxScrolls !== 'number' || maxScrolls < 1 || maxScrolls > 50) {
      return NextResponse.json(
        { error: 'Invalid maxScrolls parameter, must be number between 1-50' },
        { status: 400 }
      );
    }

    console.log(`接收到评论爬取请求: ${tweetId} (增量: ${incremental}, 滚动: ${maxScrolls})`);

    // 构建请求对象
    const crawlRequest: CommentCrawlRequest = {
      tweetId,
      incremental,
      maxScrolls,
    };

    // 获取处理器管理器实例
    const manager = TweetProcessorManager.getInstance();

    // 提交爬取任务
    const taskId = await manager.submitCommentCrawlTask(crawlRequest);

    return NextResponse.json(
      {
        success: true,
        message: '评论爬取任务已提交',
        data: {
          taskId,
          tweetId,
          incremental,
          maxScrolls,
          status: 'queued',
          submittedAt: new Date().toISOString(),
        },
      },
      { status: 202 } // 202 Accepted
    );

  } catch (error) {
    console.error('评论爬取API错误:', error);

    // 检查是否为已知错误类型
    if (error && typeof error === 'object' && 'code' in error) {
      const knownError = error as { code: string; message: string };

      let statusCode = 400;
      switch (knownError.code) {
        case 'MAX_CONCURRENT_REACHED':
          statusCode = 429; // Too Many Requests
          break;
        case 'TASK_ALREADY_RUNNING':
          statusCode = 409; // Conflict
          break;
        case 'TWEET_NOT_IN_DATABASE':
          statusCode = 404; // Not Found
          break;
        case 'RECENTLY_UPDATED':
          statusCode = 429; // Too Many Requests
          break;
        default:
          statusCode = 400;
      }

      return NextResponse.json(
        {
          error: knownError.message,
          code: knownError.code,
        },
        { status: statusCode }
      );
    }

    // 未知错误
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '评论爬取任务提交失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}