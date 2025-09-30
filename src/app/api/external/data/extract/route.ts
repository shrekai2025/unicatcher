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
  let validatedData: any = null;
  let effectiveListIds: string[] | undefined = undefined;
  
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 验证请求参数 (支持新功能参数)
    const schema = z.object({
      batchId: z.string().min(1, "批次ID不能为空"),
      maxCount: z.number().int().min(1).max(10000, "最大获取数量不能超过10000"),
      listId: z.string().optional(), // 兼容旧的单个listId
      listIds: z.array(z.string()).optional(), // 新增：支持多个listIds
      username: z.string().optional(),
      isExtracted: z.boolean().optional().default(false), // false=未提取(pending), true=已提取(synced)
      isRT: z.boolean().optional(),      // 是否仅筛选转推
      isReply: z.boolean().optional(),   // 是否仅筛选回复
      dryRun: z.boolean().optional().default(false), // 获取数据但不标记为已输出
      requireFullAmount: z.boolean().optional().default(false) // 是否要求足额返回
    }).refine(
      (data) => {
        // 如果 requireFullAmount 为 true，则 maxCount 必须是大于 0 的数字
        return !(data.requireFullAmount && (!data.maxCount || data.maxCount <= 0));
      },
      {
        message: "使用 requireFullAmount 时，必须提供有效的 maxCount 参数",
        path: ["requireFullAmount"], // 报错关联到这个字段
      }
    );

    validatedData = schema.parse(body);

    // 处理listId兼容性：如果提供了listId，将其转换为listIds数组
    effectiveListIds = validatedData.listIds || (validatedData.listId ? [validatedData.listId] : undefined);

    console.log('[DATA EXTRACT] 开始数据提取:', {
      batchId: validatedData.batchId,
      maxCount: validatedData.maxCount,
      listId: validatedData.listId, // 保留旧字段用于兼容
      listIds: effectiveListIds,
      username: validatedData.username,
      isExtracted: validatedData.isExtracted,
      isRT: validatedData.isRT,
      isReply: validatedData.isReply,
      dryRun: validatedData.dryRun,
      requireFullAmount: validatedData.requireFullAmount,
      timestamp: new Date().toISOString()
    });

    // 执行数据提取 (传递新参数)
    const extractResult = await storageService.extractTweetData({
      batchId: validatedData.batchId,
      maxCount: validatedData.maxCount,
      listId: validatedData.listId,     // 保留兼容性
      listIds: effectiveListIds,        // 新增多listIds支持
      username: validatedData.username,
      isExtracted: validatedData.isExtracted,
      isRT: validatedData.isRT,
      isReply: validatedData.isReply,
      dryRun: validatedData.dryRun,
      requireFullAmount: validatedData.requireFullAmount
    });

    console.log('[DATA EXTRACT] 提取完成:', {
      batchId: validatedData.batchId,
      extractedCount: extractResult.extractedCount,
      isDryRun: extractResult.isDryRun,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: extractResult.isDryRun ? 'Data preview completed' : 'Data extracted successfully',
      data: {
        batchId: extractResult.batchId,
        extractedCount: extractResult.extractedCount,
        tweets: extractResult.tweets,
        extractedAt: extractResult.extractedAt,
        isDryRun: extractResult.isDryRun,
        filters: {
          listId: validatedData.listId,   // 保留兼容性
          listIds: effectiveListIds,      // 新增
          username: validatedData.username,
          isExtracted: validatedData.isExtracted,
          isRT: validatedData.isRT,
          isReply: validatedData.isReply,
          dryRun: validatedData.dryRun,
          requireFullAmount: validatedData.requireFullAmount
        }
      }
    });

  } catch (error) {
    console.error('External API - Data extract error:', error);
    
    // 处理数据不足的特殊错误 (返回 409 Conflict)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'INSUFFICIENT_DATA') {
      const insufficientDataError = error as {
        code: string;
        message: string;
        requiredCount: number;
        availableCount: number;
        shortage: number;
      };
      
      return NextResponse.json(
        { 
          error: insufficientDataError.message,
          statusCode: 'INSUFFICIENT_DATA',
          data: {
            requiredCount: insufficientDataError.requiredCount,
            availableCount: insufficientDataError.availableCount,
            shortage: insufficientDataError.shortage,
            filters: validatedData ? {
              listId: validatedData.listId,     // 保留兼容性
              listIds: effectiveListIds,        // 新增
              username: validatedData.username,
              isExtracted: validatedData.isExtracted,
              isRT: validatedData.isRT,
              isReply: validatedData.isReply,
              dryRun: validatedData.dryRun,
              requireFullAmount: validatedData.requireFullAmount,
              maxCount: validatedData.maxCount
            } : {}
          }
        },
        { status: 409 } // HTTP 409 Conflict
      );
    }

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