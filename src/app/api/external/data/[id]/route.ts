import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '~/server/core/data/storage';

interface RouteParams {
  params: { id: string };
}

const storageService = new StorageService();

// 简单的API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 获取任务爬取数据
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const taskId = params.id;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // 检查任务是否存在
    const tasksResult = await storageService.getTasks(1, 1000);
    const task = tasksResult.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const format = searchParams.get('format') || 'json';

    // 获取推文数据
    const result = await storageService.getTweets(taskId, undefined, page, limit);

    // 根据格式返回数据
    if (format === 'csv') {
      // 导出为CSV
      const csvData = await storageService.exportTweets(taskId, undefined, 'csv');
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="tweets-${taskId}-${Date.now()}.csv"`,
        },
      });
    }

    // 默认返回JSON格式
    return NextResponse.json({
      success: true,
      data: {
        task: {
          id: task.id,
          listId: task.listId,
          status: task.status,
          tweetCount: task.tweetCount,
          createdAt: task.createdAt,
          completedAt: task.completedAt
        },
        tweets: result.tweets,
        total: result.total,
        page,
        limit,
        hasMore: page * limit < result.total
      }
    });

  } catch (error) {
    console.error('External API - Get task data error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 