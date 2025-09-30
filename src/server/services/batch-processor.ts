import { db } from '~/server/db';
import { createAnalysisError, withRetry, checkMemoryUsage } from './error-handling';

// 批量处理器
export class BatchProcessor {
  constructor(
    private batchSize: number = 50,
    private maxConcurrency: number = 3,
    private memoryThreshold: number = 0.8
  ) {}

  // 批量分析推文类型
  async batchAnalyzeTweetTypes(
    username: string,
    processor: (tweets: any[]) => Promise<any[]>,
    limit?: number
  ) {
    try {
      // 获取待处理的推文ID列表
      const tweetIds = await this.getUnprocessedTweetIds(username, 'type', limit);

      if (tweetIds.length === 0) {
        return { processed: 0, message: '没有需要处理的推文' };
      }

      console.log(`开始批量处理 ${tweetIds.length} 条推文的类型分析...`);

      const results = await this.processBatches(
        tweetIds,
        async (batch) => {
          // 获取批次推文数据
          const tweets = await db.writingAnalysisTweet.findMany({
            where: { id: { in: batch } },
            select: { id: true, content: true, userUsername: true }
          });

          // 处理推文
          return await processor(tweets);
        }
      );

      const successCount = results.filter(r => r.success).length;

      return {
        processed: successCount,
        failed: results.length - successCount,
        total: tweetIds.length
      };

    } catch (error) {
      throw createAnalysisError(
        'TYPE_ANALYSIS_FAILED',
        '批量类型分析失败',
        { username, error: error instanceof Error ? error.message : error }
      );
    }
  }

  // 批量风格分析
  async batchAnalyzeStyles(
    usernames: string[],
    processor: (username: string) => Promise<any>
  ) {
    try {
      console.log(`开始批量处理 ${usernames.length} 个用户的风格分析...`);

      const results = await this.processBatches(
        usernames,
        async (batch) => {
          const batchResults = [];

          for (const username of batch) {
            try {
              const result = await withRetry(() => processor(username), 2);
              batchResults.push({ username, success: true, result });
            } catch (error) {
              console.error(`用户 ${username} 风格分析失败:`, error);
              batchResults.push({
                username,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          return batchResults;
        }
      );

      const successCount = results.filter(r => r.success).length;

      return {
        processed: successCount,
        failed: results.length - successCount,
        total: usernames.length,
        results
      };

    } catch (error) {
      throw createAnalysisError(
        'STYLE_ANALYSIS_FAILED',
        '批量风格分析失败',
        { usernames, error: error instanceof Error ? error.message : error }
      );
    }
  }

  // 获取未处理的推文ID
  private async getUnprocessedTweetIds(
    username: string,
    processType: 'type' | 'style',
    limit?: number
  ): Promise<string[]> {
    if (processType === 'type') {
      // 获取未进行类型标注的推文
      const tweets = await db.writingAnalysisTweet.findMany({
        where: {
          userUsername: username,
          typeAnnotations: { none: {} }
        },
        select: { id: true },
        take: limit || 1000,
        orderBy: { publishedAt: 'asc' }
      });

      return tweets.map(t => t.id);
    }

    return [];
  }

  // 通用批量处理方法
  private async processBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches = this.createBatches(items, this.batchSize);
    const results: R[] = [];

    // 使用信号量控制并发
    const semaphore = new Semaphore(this.maxConcurrency);

    const batchPromises = batches.map(async (batch, index) => {
      await semaphore.acquire();

      try {
        // 内存检查
        checkMemoryUsage(this.memoryThreshold);

        console.log(`处理批次 ${index + 1}/${batches.length}, 大小: ${batch.length}`);

        const batchResults = await withRetry(
          () => processor(batch),
          2, // 最多重试2次
          1000 // 1秒延迟
        );

        results.push(...batchResults);

        // 批次间延迟，避免过载
        if (index < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        console.error(`批次 ${index + 1} 处理失败:`, error);
        throw error;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(batchPromises);
    return results;
  }

  // 创建批次
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

// 信号量实现（控制并发）
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      next?.();
    } else {
      this.permits++;
    }
  }
}

// 进度跟踪器
export class ProgressTracker {
  private progress: Map<string, {
    total: number;
    completed: number;
    failed: number;
    startTime: Date;
    lastUpdate: Date;
  }> = new Map();

  start(taskId: string, total: number) {
    this.progress.set(taskId, {
      total,
      completed: 0,
      failed: 0,
      startTime: new Date(),
      lastUpdate: new Date()
    });
  }

  update(taskId: string, completed: number, failed: number = 0) {
    const current = this.progress.get(taskId);
    if (current) {
      current.completed = completed;
      current.failed = failed;
      current.lastUpdate = new Date();
    }
  }

  getProgress(taskId: string) {
    const current = this.progress.get(taskId);
    if (!current) return null;

    const elapsed = Date.now() - current.startTime.getTime();
    const processed = current.completed + current.failed;
    const remaining = current.total - processed;
    const rate = processed / (elapsed / 1000); // 每秒处理数量
    const estimatedTimeLeft = remaining > 0 ? remaining / rate : 0;

    return {
      total: current.total,
      completed: current.completed,
      failed: current.failed,
      processed,
      remaining,
      percentage: Math.round((processed / current.total) * 100),
      rate: Math.round(rate * 100) / 100,
      estimatedTimeLeft: Math.round(estimatedTimeLeft),
      elapsed: Math.round(elapsed / 1000)
    };
  }

  finish(taskId: string) {
    this.progress.delete(taskId);
  }
}

// 全局进度跟踪器
export const globalProgressTracker = new ProgressTracker();

// 导出默认批量处理器
export const defaultBatchProcessor = new BatchProcessor(
  50,  // 批次大小
  3,   // 最大并发数
  0.8  // 内存阈值
);