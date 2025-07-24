import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '~/server/core/data/storage';

const storageService = new StorageService();

// 简单的API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 获取任务详情
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const { params } = context;
    const taskId = params.id;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // 通过getTasks获取所有任务，然后筛选出指定的任务
    const result = await storageService.getTasks(1, 1000);
    const task = result.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('External API - Get task by ID error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 