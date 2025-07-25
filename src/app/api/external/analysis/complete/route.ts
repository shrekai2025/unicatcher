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

// 标记分析完成
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
      batchId: z.string().min(1, "Batch ID不能为空"),
      status: z.enum(['analyzed', 'failed']),
      errorMessage: z.string().optional(),
      analysisResult: z.record(z.any()).optional() // 分析结果，可选
    });

    const validatedData = schema.parse(body);

    // 暂时返回成功响应，需要实现实际的数据更新逻辑
    return NextResponse.json({
      success: true,
      message: 'Analysis status marked successfully',
      data: {
        batchId: validatedData.batchId,
        status: validatedData.status,
        markedAt: new Date().toISOString(),
        note: 'This endpoint requires StorageService methods to be implemented'
      }
    });

    // TODO: 实现以下逻辑后取消注释
    // await storageService.markBatchAsAnalyzed(validatedData.batchId, validatedData.status, validatedData.errorMessage);
    // await storageService.updateTweetAnalysisStatus(validatedData.batchId, validatedData.status);

  } catch (error) {
    console.error('External API - Mark analysis complete error:', error);
    
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