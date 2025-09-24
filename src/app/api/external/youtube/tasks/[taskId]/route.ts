/**
 * 单个YouTube任务管理 REST API
 *
 * GET /api/external/youtube/tasks/[taskId] - 获取YouTube任务详情
 * DELETE /api/external/youtube/tasks/[taskId] - 取消YouTube任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedTaskManager } from '~/server/core/crawler/UnifiedTaskManager';
import { UnifiedStorageService } from '~/server/core/data/UnifiedStorageService';

const unifiedTaskManager = UnifiedTaskManager.getInstance();
const storageService = new UnifiedStorageService();

/**
 * 获取YouTube任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId 参数必需' },
        { status: 400 }
      );
    }

    // 获取任务详情
    const task = await storageService.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 确保是YouTube任务
    if (task.type !== 'youtube_channel') {
      return NextResponse.json(
        { error: '任务类型不匹配' },
        { status: 400 }
      );
    }

    // 获取任务运行时状态
    const runtimeStatus = unifiedTaskManager.getTaskStatus(taskId);

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        runtimeStatus,
      },
    });

  } catch (error) {
    console.error('获取YouTube任务详情失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取任务详情失败',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * 取消YouTube任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId 参数必需' },
        { status: 400 }
      );
    }

    // 检查任务是否存在
    const task = await storageService.getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 确保是YouTube任务
    if (task.type !== 'youtube_channel') {
      return NextResponse.json(
        { error: '任务类型不匹配' },
        { status: 400 }
      );
    }

    // 检查任务状态
    if (task.status !== 'running') {
      return NextResponse.json(
        { error: '只能取消正在运行的任务' },
        { status: 400 }
      );
    }

    // 取消任务
    await unifiedTaskManager.cancelTask(taskId);

    // 更新数据库状态
    await storageService.updateTaskStatus(taskId, 'failed', {
      success: false,
      message: '任务已被用户取消',
    });

    return NextResponse.json({
      success: true,
      message: 'YouTube任务已取消',
    });

  } catch (error) {
    console.error('取消YouTube任务失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '取消任务失败',
        success: false
      },
      { status: 500 }
    );
  }
}