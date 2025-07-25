import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StorageService } from '~/server/core/data/storage';

const storageService = new StorageService();

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 数据提取API
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
      batchId: z.string().min(1, "批次ID不能为空"),
      maxCount: z.number().int().min(1).max(10000, "最大获取数量不能超过10000"),
      listId: z.string().optional(),
      username: z.string().optional(),
      isExtracted: z.boolean().optional().default(false) // false=未提取(pending), true=已提取(synced)
    });

    const validatedData = schema.parse(body);

    console.log('[DATA EXTRACT] 开始数据提取:', {
      batchId: validatedData.batchId,
      maxCount: validatedData.maxCount,
      listId: validatedData.listId,
      username: validatedData.username,
      isExtracted: validatedData.isExtracted,
      timestamp: new Date().toISOString()
    });

    // 执行数据提取
    const extractResult = await storageService.extractTweetData({
      batchId: validatedData.batchId,
      maxCount: validatedData.maxCount,
      listId: validatedData.listId,
      username: validatedData.username,
      isExtracted: validatedData.isExtracted
    });

    console.log('[DATA EXTRACT] 提取完成:', {
      batchId: validatedData.batchId,
      extractedCount: extractResult.extractedCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Data extracted successfully',
      data: {
        batchId: extractResult.batchId,
        extractedCount: extractResult.extractedCount,
        tweets: extractResult.tweets,
        extractedAt: extractResult.extractedAt,
        filters: {
          listId: validatedData.listId,
          username: validatedData.username,
          isExtracted: validatedData.isExtracted
        }
      }
    });

  } catch (error) {
    console.error('External API - Data extract error:', error);
    
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