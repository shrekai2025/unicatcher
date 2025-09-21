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
      usernames: validatedData.usernames,
      batchSize: validatedData.batchSize,
      timestamp: new Date().toISOString()
    });

    // 检查是否有任务正在运行
    const globalStatus = await processManager.getGlobalStatus();
    if (globalStatus.hasActiveTask) {
      return NextResponse.json({
        success: false,
        error: 'AI批处理任务正在运行中',
        data: {
          status: 'processing',
          currentBatchId: globalStatus.currentBatchId,
          message: globalStatus.message
        }
      }, { status: 409 });
    }

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

    if (validatedData.usernames && validatedData.usernames.length > 0) {
      where.userUsername = { in: validatedData.usernames };
    }

    if (validatedData.publishedAfter) {
      where.publishedAt = { gte: BigInt(validatedData.publishedAfter.getTime()) };
    }

    // 检查是否还有待处理的推文
    const remainingTweets = await db.tweet.count({ where });

    if (remainingTweets === 0) {
      return NextResponse.json({
        success: false,
        error: '没有更多符合条件的推文需要处理',
        data: {
          remainingTweets: 0,
          message: '所有符合条件的推文已处理完成'
        }
      }, { status: 404 });
    }

    // 创建新的处理记录
    const processRecord = await db.aIProcessRecord.create({
      data: {
        batchId: newBatchId,
        status: 'processing',
        totalTweets: remainingTweets,
        filterConfig: JSON.stringify({
          usernames: validatedData.usernames,
          publishedAfter: validatedData.publishedAfter,
          isExtracted: validatedData.isExtracted,
          previousBatchId: validatedData.previousBatchId,
        }),
        aiProvider: validatedData.aiConfig.provider,
        aiModel: validatedData.aiConfig.model,
        systemPrompt: validatedData.systemPrompt,
        batchProcessingMode: validatedData.batchProcessingMode,
      },
    });

    // 启动新的批处理任务
    await processManager.startBatchProcess({
      batchId: newBatchId,
      filterConfig: {
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
