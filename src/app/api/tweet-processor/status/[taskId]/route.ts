/**
 * 推文处理任务状态查询API
 * GET /api/tweet-processor/status/{taskId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorManager } from '~/server/core/tweet-processor/manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    console.log(`查询任务状态: ${taskId}`);

    // 获取处理器管理器实例
    const manager = TweetProcessorManager.getInstance();

    // 获取任务状态
    const taskStatus = await manager.getTaskStatus(taskId);

    return NextResponse.json({
      success: true,
      message: '任务状态查询成功',
      data: taskStatus,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('任务状态查询API错误:', error);

    // 检查是否为已知错误类型
    if (error && typeof error === 'object' && 'code' in error) {
      const knownError = error as { code: string; message: string };

      let statusCode = 400;
      switch (knownError.code) {
        case 'INVALID_REQUEST':
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
        error: '任务状态查询失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// DELETE: 取消任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    console.log(`取消任务: ${taskId}`);

    // 获取处理器管理器实例
    const manager = TweetProcessorManager.getInstance();

    // 取消任务
    await manager.cancelTask(taskId);

    return NextResponse.json({
      success: true,
      message: '任务已取消',
      data: {
        taskId,
        cancelledAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('取消任务API错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '取消任务失败',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}