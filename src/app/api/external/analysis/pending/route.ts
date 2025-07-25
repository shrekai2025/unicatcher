import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '~/server/core/data/storage';

const storageService = new StorageService();

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 获取待分析的推文数据
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // 最大1000条
    const requestSystem = searchParams.get('system') || 'unknown';

    // 生成批次ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 暂时返回示例数据，需要实现StorageService的相关方法
    return NextResponse.json({
      success: true,
      message: 'API endpoint created, awaiting StorageService implementation',
      data: {
        tweets: [],
        batchId,
        count: 0,
        syncedAt: new Date().toISOString(),
        note: 'This endpoint requires StorageService methods to be implemented'
      }
    });

    // TODO: 实现以下方法后取消注释
    // const pendingTweets = await storageService.getPendingAnalysisTweets(limit);
    // await storageService.markTweetsAsSynced(tweetIds, batchId);
    // await storageService.createSyncRecord({...});

  } catch (error) {
    console.error('External API - Get pending tweets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
} 