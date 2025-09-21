/**
 * AI 处理管理器
 * 协调推文的批量 AI 处理任务，包括状态管理、重试机制等
 */

import { db } from '~/server/db';
import { OpenAIService, type AIConfig, type ProcessingStats } from './openai-service';
import type { Prisma } from '@prisma/client';

export interface ProcessBatchConfig {
  batchId: string;
  filterConfig: {
    listIds?: string[];
    usernames?: string[];
    publishedAfter?: Date;
    isExtracted?: 'all' | 'true' | 'false';
  };
  batchSize: number;
  batchProcessingMode?: 'optimized' | 'traditional';
  systemPrompt?: string;
  aiConfig: AIConfig;
}

export interface ProcessStatus {
  batchId: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: ProcessingStats & {
    total: number;
    currentBatch: number;
    totalBatches: number;
  };
  error?: string;
}

export class AIProcessManager {
  private static instance: AIProcessManager;
  private activeProcesses = new Map<string, { 
    cancel: () => void; 
    promise: Promise<void>;
  }>();
  private globalProcessingLock = false; // 全局处理锁
  private currentGlobalBatchId: string | null = null; // 当前全局处理的批次ID

  static getInstance(): AIProcessManager {
    if (!AIProcessManager.instance) {
      AIProcessManager.instance = new AIProcessManager();
    }
    return AIProcessManager.instance;
  }

  /**
   * 检查是否有AI处理任务正在运行
   */
  async isGlobalProcessing(): Promise<{ isProcessing: boolean; currentBatchId?: string; status?: any }> {
    // 先检查数据库中是否有正在处理的任务（数据库为准）
    const runningRecord = await db.aIProcessRecord.findFirst({
      where: { status: 'processing' },
      orderBy: { startedAt: 'desc' }
    });

    if (runningRecord) {
      // 数据库显示有任务在运行，同步内存状态
      if (!this.globalProcessingLock || this.currentGlobalBatchId !== runningRecord.batchId) {
        console.log(`[AI处理] 同步内存状态到数据库状态: ${runningRecord.batchId}`);
        this.globalProcessingLock = true;
        this.currentGlobalBatchId = runningRecord.batchId;
      }
      
      const status = await this.getBatchStatus(runningRecord.batchId);
      return { 
        isProcessing: true, 
        currentBatchId: runningRecord.batchId,
        status 
      };
    }

    // 数据库中没有处理中的任务，检查内存状态是否需要清理
    if (this.globalProcessingLock || this.currentGlobalBatchId) {
      console.log('[AI处理] 数据库无处理中任务，清理内存状态');
      this.globalProcessingLock = false;
      this.currentGlobalBatchId = null;
    }

    return { isProcessing: false };
  }

  /**
   * 获取全局处理状态（用于外部API）
   */
  async getGlobalStatus(): Promise<{
    hasActiveTask: boolean;
    currentBatchId?: string;
    status?: ProcessStatus;
    message: string;
  }> {
    const globalState = await this.isGlobalProcessing();
    
    if (globalState.isProcessing) {
      return {
        hasActiveTask: true,
        currentBatchId: globalState.currentBatchId,
        status: globalState.status,
        message: `AI批处理任务正在进行中: ${globalState.currentBatchId}`
      };
    }

    return {
      hasActiveTask: false,
      message: '当前没有AI批处理任务运行'
    };
  }

  /**
   * 启动批处理任务
   */
  async startBatchProcess(config: ProcessBatchConfig): Promise<void> {
    const { batchId, filterConfig, batchSize, batchProcessingMode = 'optimized', systemPrompt, aiConfig } = config;

    console.log(`[AI处理] 启动批处理任务: ${batchId}, 模式: ${batchProcessingMode}, 批次大小: ${batchSize}`);

    // 检查全局是否已有任务在运行
    const globalState = await this.isGlobalProcessing();
    if (globalState.isProcessing) {
      throw new Error(`AI批处理任务正在运行中: ${globalState.currentBatchId}，请等待当前任务完成`);
    }

    // 检查是否已有同名任务在运行
    if (this.activeProcesses.has(batchId)) {
      throw new Error(`批处理任务 ${batchId} 已在运行中`);
    }

    // 设置全局锁
    this.globalProcessingLock = true;
    this.currentGlobalBatchId = batchId;

    // 创建取消控制器
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      console.log(`[AI处理] 取消批处理任务: ${batchId}`);
    };

    // 启动处理任务
    const promise = this.executeBatchProcess(
      config,
      () => cancelled
    ).catch(async (error) => {
      console.error(`[AI处理] 批处理任务失败: ${batchId}`, error);
      
      // 更新数据库状态
      await db.aIProcessRecord.update({
        where: { batchId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      
      throw error;
    }).finally(() => {
      // 清理活跃任务记录和全局锁
      this.activeProcesses.delete(batchId);
      this.globalProcessingLock = false;
      this.currentGlobalBatchId = null;
      console.log(`[AI处理] 清理全局锁: ${batchId}`);
    });

    // 记录活跃任务
    this.activeProcesses.set(batchId, { cancel, promise });

    // 不等待完成，直接返回
    promise.catch(() => {
      // 错误已在上面处理，这里防止 unhandled rejection
    });
  }

  /**
   * 停止批处理任务
   */
  async stopBatchProcess(batchId: string): Promise<void> {
    const process = this.activeProcesses.get(batchId);
    if (process) {
      process.cancel();
      try {
        await process.promise;
      } catch (error) {
        // 取消导致的错误是预期的，忽略
      }
    }

    // 更新数据库状态
    await db.aIProcessRecord.update({
      where: { batchId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  /**
   * 获取批处理状态
   */
  async getBatchStatus(batchId: string): Promise<ProcessStatus | null> {
    const record = await db.aIProcessRecord.findUnique({
      where: { batchId },
    });

    if (!record) {
      return null;
    }

    const isActive = this.activeProcesses.has(batchId);

    return {
      batchId: record.batchId,
      status: isActive ? 'processing' : record.status as any,
      progress: {
        total: record.totalTweets,
        processed: record.processedTweets,
        succeeded: record.processedTweets - record.failedTweets,
        failed: record.failedTweets,
        valueless: 0, // 这个字段暂时没有存储，可以后续添加
        currentBatch: Math.ceil(record.processedTweets / 10), // 假设每批10条
        totalBatches: Math.ceil(record.totalTweets / 10),
      },
      error: record.errorMessage || undefined,
    };
  }

  /**
   * 执行单批次处理任务的核心逻辑
   */
  private async executeBatchProcess(
    config: ProcessBatchConfig,
    isCancelled: () => boolean
  ): Promise<void> {
    const { batchId, filterConfig, batchSize, batchProcessingMode = 'optimized', systemPrompt, aiConfig } = config;

    try {
      // 创建 OpenAI 服务实例
      const aiService = new OpenAIService(aiConfig);

      // 验证 AI 配置
      const isValidConfig = await aiService.validateConfig();
      if (!isValidConfig) {
        throw new Error('AI 配置验证失败，请检查 API Key 是否正确');
      }

      // 获取主题标签（包含名称和描述）
      const topicTagsRaw = await db.topicTag.findMany({
        where: { isActive: true },
        select: { name: true, description: true },
      });
      const topicTags = topicTagsRaw.map(tag => ({
        name: tag.name,
        description: tag.description || undefined,
      }));

      // 获取内容类型（包含名称和描述）
      const contentTypesRaw = await db.contentType.findMany({
        where: { isActive: true },
        select: { name: true, description: true },
      });
      const contentTypes = contentTypesRaw.map(type => ({
        name: type.name,
        description: type.description || undefined,
      }));

      // 构建查询条件
      const where: Prisma.TweetWhereInput = {
        isDeleted: false,
        OR: [
          { aiProcessStatus: null },
          { aiProcessStatus: 'pending' },
          { aiProcessStatus: 'failed', aiRetryCount: { lt: 3 } },
        ],
      };

      if (filterConfig.listIds && filterConfig.listIds.length > 0) {
        where.listId = { in: filterConfig.listIds };
      }

      if (filterConfig.usernames && filterConfig.usernames.length > 0) {
        where.userUsername = { in: filterConfig.usernames };
      }

      if (filterConfig.publishedAfter) {
        where.publishedAt = { gte: BigInt(filterConfig.publishedAfter.getTime()) };
      }

      // 单批次处理推文
      let processedCount = 0;
      let failedCount = 0;

      if (isCancelled()) {
        console.log(`[AI处理] 任务被取消: ${batchId}`);
        return;
      }

      // 获取一批推文进行处理
      const tweets = await db.tweet.findMany({
        where,
        select: {
          id: true,
          content: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: batchSize,
      });

      if (tweets.length === 0) {
        console.log(`[AI处理] 没有符合条件的推文需要处理: ${batchId}`);
        await db.aIProcessRecord.update({
          where: { batchId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            processedTweets: 0,
            failedTweets: 0,
          },
        });
        return;
      }

      console.log(`[AI处理] 开始处理单批次: ${tweets.length} 条推文 (模式: ${batchProcessingMode})`);
      console.log(`[AI处理] 推文预览:`, tweets.slice(0, 2).map(t => ({ id: t.id, content: t.content.substring(0, 50) + '...' })));

      // 根据选择的处理模式调用不同的方法
      let results: Array<{ tweetId: string; result: any; error?: string }>;
      
      if (batchProcessingMode === 'optimized') {
        console.log(`[AI处理] 🚀 使用优化模式处理单批次 - 一次API调用处理 ${tweets.length} 条推文`);
        results = await aiService.analyzeTweetsBatchOptimized(
          tweets,
          topicTags,
          contentTypes,
          systemPrompt,
          (stats) => {
            console.log(`[AI处理] 批量模式进度更新: ${stats.processed}/${tweets.length}, 成功: ${stats.succeeded}, 失败: ${stats.failed}`);
          },
          batchId
        );
      } else {
        console.log(`[AI处理] 🔄 使用传统模式处理单批次 - 逐条调用API处理 ${tweets.length} 条推文`);
        results = await aiService.analyzeTweetsBatchFallback(
          tweets,
          topicTags,
          contentTypes,
          systemPrompt,
          (stats) => {
            console.log(`[AI处理] 传统模式进度更新: ${stats.processed}/${tweets.length}, 成功: ${stats.succeeded}, 失败: ${stats.failed}`);
          }
        );
      }

      console.log(`[AI处理] 单批次处理完成: 总共 ${results.length} 条，成功 ${results.filter(r => !r.error).length} 条，失败 ${results.filter(r => r.error).length} 条`);

      // 更新推文的 AI 处理结果
      for (const result of results) {
        if (isCancelled()) break;

        try {
          if (result.error) {
            // 处理失败，增加重试计数
            await db.tweet.update({
              where: { id: result.tweetId },
              data: {
                aiProcessStatus: 'failed',
                aiRetryCount: { increment: 1 },
              },
            });
            failedCount++;
          } else if (result.result) {
            // 处理成功，更新结果
            const { isValueless, keywords: resultKeywords, topicTags: resultTopicTags, contentTypes: resultContentTypes } = result.result;
            
            await db.tweet.update({
              where: { id: result.tweetId },
              data: {
                aiProcessStatus: 'completed',
                aiProcessedAt: new Date(),
                keywords: resultKeywords.length > 0 ? JSON.stringify(resultKeywords) : null,
                topicTags: resultTopicTags.length > 0 ? JSON.stringify(resultTopicTags) : null,
                contentTypes: resultContentTypes.length > 0 ? JSON.stringify(resultContentTypes) : null,
                isValueless: isValueless,
                aiRetryCount: 0, // 重置重试计数
              },
            });
            processedCount++;
          }
        } catch (error) {
          console.error(`[AI处理] 更新推文 ${result.tweetId} 失败:`, error);
          failedCount++;
        }
      }

      // 检查是否还有更多推文需要处理
      const remainingCount = await db.tweet.count({
        where: {
          ...where,
          id: { notIn: tweets.map(t => t.id) } // 排除已处理的推文
        }
      });

      // 更新处理记录
      await db.aIProcessRecord.update({
        where: { batchId },
        data: {
          processedTweets: processedCount,
          failedTweets: failedCount,
          status: remainingCount > 0 ? 'completed' : 'completed', // 单批次处理，状态都设为completed
          completedAt: new Date(),
        },
      });

      console.log(`[AI处理] 单批次任务完成: ${batchId}, 成功: ${processedCount}, 失败: ${failedCount}, 剩余: ${remainingCount}`);


    } catch (error) {
      console.error(`[AI处理] 批处理任务异常: ${batchId}`, error);
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取所有活跃的处理任务
   */
  getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  /**
   * 强制重置所有状态
   * 用于清理僵尸状态，当系统状态异常时使用
   */
  async forceReset(): Promise<void> {
    console.log('[AI处理管理器] 开始强制重置状态');
    
    // 1. 清理内存状态
    this.globalProcessingLock = false;
    this.currentGlobalBatchId = null;
    
    // 2. 取消所有活跃的处理任务
    const activeProcessIds = Array.from(this.activeProcesses.keys());
    for (const processId of activeProcessIds) {
      const process = this.activeProcesses.get(processId);
      if (process) {
        console.log(`[AI处理管理器] 取消活跃任务: ${processId}`);
        process.cancel();
        // 不等待Promise完成，直接移除
        this.activeProcesses.delete(processId);
      }
    }
    
    console.log('[AI处理管理器] 强制重置完成', {
      clearedProcesses: activeProcessIds.length,
      timestamp: new Date().toISOString()
    });
  }
}
