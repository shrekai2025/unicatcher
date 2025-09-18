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

  static getInstance(): AIProcessManager {
    if (!AIProcessManager.instance) {
      AIProcessManager.instance = new AIProcessManager();
    }
    return AIProcessManager.instance;
  }

  /**
   * 启动批处理任务
   */
  async startBatchProcess(config: ProcessBatchConfig): Promise<void> {
    const { batchId, filterConfig, batchSize, systemPrompt, aiConfig } = config;

    console.log(`[AI处理] 启动批处理任务: ${batchId}`);

    // 检查是否已有同名任务在运行
    if (this.activeProcesses.has(batchId)) {
      throw new Error(`批处理任务 ${batchId} 已在运行中`);
    }

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
      // 清理活跃任务记录
      this.activeProcesses.delete(batchId);
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
   * 执行批处理任务的核心逻辑
   */
  private async executeBatchProcess(
    config: ProcessBatchConfig,
    isCancelled: () => boolean
  ): Promise<void> {
    const { batchId, filterConfig, batchSize, systemPrompt, aiConfig } = config;

    try {
      // 创建 OpenAI 服务实例
      const aiService = new OpenAIService(aiConfig);

      // 验证 AI 配置
      const isValidConfig = await aiService.validateConfig();
      if (!isValidConfig) {
        throw new Error('AI 配置验证失败，请检查 API Key 是否正确');
      }

      // 获取主题标签
      const topicTags = await db.topicTag.findMany({
        where: { isActive: true },
        select: { name: true },
      });
      const topicTagNames = topicTags.map(tag => tag.name);

      // 获取内容类型
      const contentTypes = await db.contentType.findMany({
        where: { isActive: true },
        select: { name: true },
      });
      const contentTypeNames = contentTypes.map(type => type.name);

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

      // 按批次处理推文
      let offset = 0;
      let processedCount = 0;
      let failedCount = 0;

      while (true) {
        if (isCancelled()) {
          console.log(`[AI处理] 任务被取消: ${batchId}`);
          break;
        }

        // 获取下一批推文
        const tweets = await db.tweet.findMany({
          where,
          select: {
            id: true,
            content: true,
          },
          orderBy: { publishedAt: 'desc' },
          skip: offset,
          take: batchSize,
        });

        if (tweets.length === 0) {
          console.log(`[AI处理] 没有更多推文需要处理: ${batchId}`);
          break;
        }

        console.log(`[AI处理] 处理批次 ${Math.floor(offset / batchSize) + 1}: ${tweets.length} 条推文`);

        // 批量分析推文
        const results = await aiService.analyzeTweetsBatch(
          tweets,
          topicTagNames,
          contentTypeNames,
          systemPrompt,
          (stats) => {
            // 进度回调 - 可以在这里实时更新数据库状态
            console.log(`[AI处理] 进度更新: ${stats.processed}/${tweets.length}`);
          }
        );

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
              const { isValueless, topicTags: resultTopicTags, contentTypes: resultContentTypes } = result.result;
              
              await db.tweet.update({
                where: { id: result.tweetId },
                data: {
                  aiProcessStatus: 'completed',
                  aiProcessedAt: new Date(),
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

        // 更新处理记录
        await db.aIProcessRecord.update({
          where: { batchId },
          data: {
            processedTweets: processedCount,
            failedTweets: failedCount,
          },
        });

        offset += batchSize;

        // 避免过度频繁的数据库操作
        await this.delay(500);
      }

      if (!isCancelled()) {
        // 任务完成
        await db.aIProcessRecord.update({
          where: { batchId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            processedTweets: processedCount,
            failedTweets: failedCount,
          },
        });

        console.log(`[AI处理] 批处理任务完成: ${batchId}, 成功: ${processedCount}, 失败: ${failedCount}`);
      }

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
}
