/**
 * 推文数据更新API
 * POST /api/tweet-processor/update
 */

import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorManager } from '~/server/core/tweet-processor/manager';
import { z } from 'zod';

// 请求参数验证schema
const updateRequestSchema = z.object({
  tweetId: z.string().min(1, '推文ID不能为空'),
  force: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // 验证API密钥（简单实现）
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();

    // 验证请求参数
    const validationResult = updateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { tweetId, force } = validationResult.data;

    console.log(`收到推文更新请求: ${tweetId} (force: ${force})`);

    // 获取处理器管理器实例
    const manager = TweetProcessorManager.getInstance();

    // 提交更新任务
    const taskId = await manager.submitUpdateTask({ tweetId, force });

    // 返回任务ID
    return NextResponse.json(
      {
        success: true,
        message: '推文更新任务已提交',
        data: {
          taskId,
          tweetId,
          force,
          submittedAt: new Date().toISOString(),
        },
      },
      { status: 202 } // 202 Accepted - 异步处理
    );

  } catch (error) {
    console.error('推文更新API错误:', error);

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
        case 'RECENTLY_UPDATED':
          statusCode = 429; // Too Many Requests
          break;
        case 'TWEET_NOT_IN_DATABASE':
          statusCode = 404; // Not Found
          break;
        case 'DATABASE_ERROR':
          statusCode = 500; // Internal Server Error
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
        error: '推文更新失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// 健康检查端点
export async function GET(request: NextRequest) {
  try {
    const manager = TweetProcessorManager.getInstance();
    const status = manager.getStatus();

    return NextResponse.json({
      success: true,
      service: 'tweet-processor-update',
      status: 'healthy',
      data: {
        runningTasks: status.runningTasks,
        maxConcurrentTasks: status.maxConcurrentTasks,
        runningTaskDetails: status.runningTaskDetails,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('推文处理器健康检查失败:', error);

    return NextResponse.json(
      {
        success: false,
        service: 'tweet-processor-update',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}