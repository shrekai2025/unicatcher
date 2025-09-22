import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIProcessManager } from '~/server/core/ai/process-manager';
import { db } from '~/server/db';

const processManager = AIProcessManager.getInstance();

// 简单的API Key认证（与现有外部API保持一致）
const API_KEYS = ['unicatcher-api-key-demo']; // 实际应该从环境变量读取

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 继续处理下一批次
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
      previousBatchId: z.string().optional(), // 可选：指定上一个批次ID用于参考
      // 使用与start接口相同的参数
      listIds: z.array(z.string()).optional(), // 支持多个List ID筛选
      usernames: z.array(z.string()).optional(),
      publishedAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
      isExtracted: z.enum(['all', 'true', 'false']).optional().default('all'),
      batchSize: z.number().int().min(1).max(100).default(10),
      batchProcessingMode: z.enum(['optimized', 'traditional']).default('optimized'),
      systemPrompt: z.string().optional(),
      aiConfig: z.object({
        apiKey: z.string().min(1),
        provider: z.enum(['openai', 'openai-badger']).default('openai'),
        model: z.string().default('gpt-4o'),
        baseURL: z.string().optional(),
      }),
    });

    const validatedData = schema.parse(body);

    console.log('[AI批处理API] 收到继续处理请求:', {
      previousBatchId: validatedData.previousBatchId,
      listIds: validatedData.listIds,
      usernames: validatedData.usernames,
      publishedAfter: validatedData.publishedAfter,
      isExtracted: validatedData.isExtracted,
      batchSize: validatedData.batchSize,
      batchProcessingMode: validatedData.batchProcessingMode,
      aiProvider: validatedData.aiConfig.provider,
      aiModel: validatedData.aiConfig.model,
      timestamp: new Date().toISOString()
    });

    // 生成新的批次ID
    const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 查询符合条件且未处理的推文
    const where: any = {
      isDeleted: false,
      OR: [
        { aiProcessStatus: null },
        { aiProcessStatus: 'pending' },
        { aiProcessStatus: 'failed', aiRetryCount: { lt: 3 } },
      ],
    };

    if (validatedData.listIds && validatedData.listIds.length > 0) {
      where.listId = { in: validatedData.listIds };
    }

    if (validatedData.usernames && validatedData.usernames.length > 0) {
      where.userUsername = { in: validatedData.usernames };
    }

    if (validatedData.publishedAfter) {
      where.publishedAt = { gte: BigInt(validatedData.publishedAfter.getTime()) };
    }

    // 🔥 修复：添加 isExtracted 过滤逻辑
    if (validatedData.isExtracted && validatedData.isExtracted !== 'all') {
      if (validatedData.isExtracted === 'true') {
        // 只处理已被外部系统提取过的推文
        where.analysisStatus = { in: ['synced', 'analyzed'] };
      } else if (validatedData.isExtracted === 'false') {
        // 只处理未被外部系统提取过的推文
        where.analysisStatus = { notIn: ['synced', 'analyzed'] };
      }
    }

    // 🔥 增强调试：输出查询条件和结果
    console.log('[AI批处理API] 查询条件:', JSON.stringify(where, null, 2));
    
    // 检查是否还有待处理的推文
    const remainingTweets = await db.tweet.count({ where });
    
    console.log('[AI批处理API] 查询结果:', {
      remainingTweets,
      queryConditions: {
        hasListIds: !!validatedData.listIds?.length,
        hasUsernames: !!validatedData.usernames?.length,
        hasPublishedAfter: !!validatedData.publishedAfter,
        isExtracted: validatedData.isExtracted,
      }
    });

    if (remainingTweets === 0) {
      return NextResponse.json({
        success: false,
        error: '没有更多符合条件的推文需要处理',
        data: {
          remainingTweets: 0,
          message: '所有符合条件的推文已处理完成',
          appliedFilters: {
            listIds: validatedData.listIds,
            usernames: validatedData.usernames,
            publishedAfter: validatedData.publishedAfter?.toISOString(),
            isExtracted: validatedData.isExtracted,
          }
        }
      }, { status: 404 });
    }

    // 🔥 重构：使用processManager统一启动任务，避免竞态条件
    // 不再手动创建数据库记录，让processManager内部处理
    try {
      await processManager.startBatchProcess({
        batchId: newBatchId,
        filterConfig: {
          listIds: validatedData.listIds,
          usernames: validatedData.usernames,
          publishedAfter: validatedData.publishedAfter,
          isExtracted: validatedData.isExtracted,
        },
        batchSize: validatedData.batchSize,
        batchProcessingMode: validatedData.batchProcessingMode,
        systemPrompt: validatedData.systemPrompt,
        aiConfig: validatedData.aiConfig,
      });

      console.log('[AI批处理API] 继续处理任务启动成功:', {
        newBatchId,
        previousBatchId: validatedData.previousBatchId,
        remainingTweets,
        batchSize: validatedData.batchSize,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: '继续处理任务启动成功',
        data: {
          batchId: newBatchId,
          previousBatchId: validatedData.previousBatchId,
          status: 'processing',
          remainingTweets,
          batchSize: validatedData.batchSize,
          estimatedBatches: Math.ceil(remainingTweets / validatedData.batchSize),
          mode: validatedData.batchProcessingMode,
          startedAt: new Date().toISOString()
        }
      }, { status: 201 });

    } catch (startError) {
      // 🔥 改进错误处理：如果启动失败，返回具体错误信息
      console.error('[AI批处理API] 启动任务失败:', startError);
      
      if (startError instanceof Error && startError.message.includes('正在运行中')) {
        return NextResponse.json({
          success: false,
          error: 'AI批处理任务正在运行中',
          data: {
            status: 'processing',
            message: startError.message
          }
        }, { status: 409 });
      }
      
      throw startError;
    }

  } catch (error) {
    console.error('[AI批处理API] 继续处理任务失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation Error', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}
