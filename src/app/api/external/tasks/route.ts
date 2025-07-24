import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TaskExecutorManager } from '~/server/core/tasks/executor';
import { StorageService } from '~/server/core/data/storage';

const taskManager = TaskExecutorManager.getInstance();
const storageService = new StorageService();

// 简单的API Key认证（生产环境建议使用更安全的方法）
const API_KEYS = ['unicatcher-api-key-demo']; // 实际应该从环境变量读取

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 创建爬取任务
export async function POST(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 验证请求参数
    const schema = z.object({
      listId: z.string().min(1, "List ID不能为空").regex(/^\d+$/, "List ID必须为纯数字"),
      maxTweets: z.number().int().min(1).max(100).optional().default(20),
    });

    const validatedData = schema.parse(body);

    // 检查是否有相同List ID的运行中任务
    const existingTasks = await storageService.getTasks(1, 100, 'running');
    const hasDuplicateRunning = existingTasks.tasks.some(
      task => task.listId === validatedData.listId && task.status === 'running'
    );

    if (hasDuplicateRunning) {
      return NextResponse.json(
        { error: 'Conflict: Task for this List ID is already running' },
        { status: 409 }
      );
    }

    // 提交任务
    const executorTaskId = await taskManager.submitTask({
      listId: validatedData.listId,
      maxTweets: validatedData.maxTweets,
    });

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      data: {
        taskId: executorTaskId,
        listId: validatedData.listId,
        maxTweets: validatedData.maxTweets,
        status: 'created'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('External API - Create task error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 获取任务列表
export async function GET(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const status = searchParams.get('status') as any;

    const result = await storageService.getTasks(page, limit, status);

    return NextResponse.json({
      success: true,
      data: {
        tasks: result.tasks,
        total: result.total,
        page,
        limit,
        hasMore: page * limit < result.total
      }
    });

  } catch (error) {
    console.error('External API - Get tasks error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 