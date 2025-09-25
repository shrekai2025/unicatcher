/**
 * YouTube任务管理 REST API
 *
 * POST /api/external/youtube/tasks - 创建YouTube监控任务
 * GET /api/external/youtube/tasks - 获取YouTube任务列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedTaskManager } from '~/server/core/crawler/UnifiedTaskManager';
import { UnifiedStorageService } from '~/server/core/data/UnifiedStorageService';

const unifiedTaskManager = UnifiedTaskManager.getInstance();
const storageService = new UnifiedStorageService();

/**
 * 创建YouTube监控任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHandle, maxVideos = 20, duplicateStopCount = 3 } = body;

    // 参数验证
    if (!channelHandle || typeof channelHandle !== 'string') {
      return NextResponse.json(
        { error: 'channelHandle 参数必需且必须为字符串' },
        { status: 400 }
      );
    }

    // 验证频道handle格式
    if (!channelHandle.match(/^(@[\w\-\.]+|[\w\-\.]+|UC[\w\-_]{22})$/)) {
      return NextResponse.json(
        { error: '频道handle格式无效，支持格式: @username、username 或 UC开头的频道ID' },
        { status: 400 }
      );
    }

    // 检查是否有相同频道的运行中任务
    const runningTasks = await storageService.getTasks(1, 100, 'running');
    const hasDuplicateRunning = runningTasks.tasks.some(
      task => task.type === 'youtube_channel' &&
              task.channelHandle === channelHandle &&
              task.status === 'running'
    );

    if (hasDuplicateRunning) {
      return NextResponse.json(
        { error: '该频道已有正在运行的监控任务' },
        { status: 409 }
      );
    }

    // 创建任务
    const taskId = await unifiedTaskManager.submitYouTubeTask({
      channelHandle,
      maxVideos: Math.min(Math.max(maxVideos || 20, 1), 50), // 限制范围1-50
      duplicateStopCount: Math.min(Math.max(duplicateStopCount || 3, 1), 10), // 限制范围1-10
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        channelHandle,
        maxVideos,
        duplicateStopCount,
        status: 'created',
        message: 'YouTube频道监控任务已创建',
      },
    });

  } catch (error) {
    console.error('创建YouTube任务失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '创建YouTube任务失败',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * 获取YouTube任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 50);
    const status = searchParams.get('status') as 'created' | 'queued' | 'running' | 'completed' | 'failed' | null;

    const tasks = await storageService.getTasks(page, limit, status || undefined);

    // 只返回YouTube任务
    const youtubeTasks = {
      ...tasks,
      tasks: tasks.tasks.filter(task => task.type === 'youtube_channel')
    };

    return NextResponse.json({
      success: true,
      data: youtubeTasks,
    });

  } catch (error) {
    console.error('获取YouTube任务列表失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取任务列表失败',
        success: false
      },
      { status: 500 }
    );
  }
}