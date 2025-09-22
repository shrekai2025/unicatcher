/**
 * 推文处理相关的 tRPC 路由
 * 包括推文筛选、AI 处理、主题标签管理等功能
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { AIProcessManager } from '~/server/core/ai/process-manager';
import type { Prisma } from '@prisma/client';

// 全局实例，避免重复声明
const processManager = AIProcessManager.getInstance();

/**
 * 清理旧的AI处理记录，保留最近10条
 */
async function cleanupOldAIRecords(): Promise<void> {
  try {
    // 获取所有记录，按创建时间降序排列
    const allRecords = await db.aIProcessRecord.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    // 如果记录数超过10条，删除多余的
    if (allRecords.length > 10) {
      const recordsToDelete = allRecords.slice(10); // 保留前10条，删除其余的
      const idsToDelete = recordsToDelete.map(r => r.id);

      await db.aIProcessRecord.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });

      console.log(`[AI记录清理] 删除了 ${recordsToDelete.length} 条旧记录，保留最近 10 条`);
    }
  } catch (error) {
    console.error('[AI记录清理] 清理失败:', error);
  }
}

// 推文筛选参数 Schema
const TweetFilterSchema = z.object({
  listIds: z.array(z.string()).optional(),
  usernames: z.array(z.string()).optional(),
  publishedAfter: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  isExtracted: z.enum(['all', 'true', 'false']).default('all'),
  aiProcessStatus: z.enum(['all', 'pending', 'processing', 'completed', 'failed']).default('all'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  sortOrder: z.enum(['desc', 'asc']).default('desc'),
});

// 主题标签 Schema
const TopicTagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const tweetProcessingRouter = createTRPCRouter({
  // 获取筛选后的推文列表
  getFilteredTweets: protectedProcedure
    .input(TweetFilterSchema)
    .query(async ({ input }) => {
      const {
        listIds,
        usernames,
        publishedAfter,
        isExtracted,
        aiProcessStatus,
        page,
        limit,
        sortOrder,
      } = input;

      // 构建查询条件
      const where: Prisma.TweetWhereInput = {
        isDeleted: false,
      };

      // listIds 筛选
      if (listIds && listIds.length > 0) {
        where.listId = { in: listIds };
      }

      // 用户名筛选
      if (usernames && usernames.length > 0) {
        where.userUsername = { in: usernames };
      }

      // 发推时间筛选
      if (publishedAfter) {
        where.publishedAt = { gte: BigInt(publishedAfter.getTime()) };
      }

      // 是否被提取过筛选
      if (isExtracted !== 'all') {
        if (isExtracted === 'true') {
          where.analysisStatus = { in: ['synced', 'analyzed'] };
        } else {
          where.OR = [
            { analysisStatus: null },
            { analysisStatus: 'pending' }
          ];
        }
      }

      // AI 处理状态筛选
      if (aiProcessStatus !== 'all') {
        if (aiProcessStatus === 'pending') {
          where.OR = [
            { aiProcessStatus: null },
            { aiProcessStatus: 'pending' }
          ];
        } else {
          where.aiProcessStatus = aiProcessStatus;
        }
      }

      // 计算偏移量
      const skip = (page - 1) * limit;

      // 查询推文和总数
      const [tweets, total] = await Promise.all([
        db.tweet.findMany({
          where,
          orderBy: { publishedAt: sortOrder },
          skip,
          take: limit,
          select: {
            id: true,
            content: true,
            userNickname: true,
            userUsername: true,
            replyCount: true,
            retweetCount: true,
            likeCount: true,
            viewCount: true,
            isRT: true,
            isReply: true,
            imageUrls: true,
            profileImageUrl: true,
            videoUrls: true,
            tweetUrl: true,
            publishedAt: true,
            listId: true,
            analysisStatus: true,
            keywords: true,
            topicTags: true,
            contentTypes: true,
            aiProcessedAt: true,
            aiProcessStatus: true,
            aiRetryCount: true,
            createdAt: true,
          },
        }),
        db.tweet.count({ where }),
      ]);

      // 转换 BigInt 为字符串并解析 JSON 字段
      const processedTweets = tweets.map((tweet) => ({
        ...tweet,
        publishedAt: tweet.publishedAt.toString(),
        keywords: tweet.keywords ? JSON.parse(tweet.keywords) : null,
        topicTags: tweet.topicTags ? JSON.parse(tweet.topicTags) : null,
        contentTypes: tweet.contentTypes ? JSON.parse(tweet.contentTypes) : null,
        imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : null,
        videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
      }));

      return {
        tweets: processedTweets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // 获取推文统计信息
  getTweetStats: protectedProcedure
    .input(TweetFilterSchema.omit({ page: true, limit: true }))
    .query(async ({ input }) => {
      const {
        listIds,
        usernames,
        publishedAfter,
        isExtracted,
        aiProcessStatus,
      } = input;

      // 构建基础查询条件
      const baseWhere: Prisma.TweetWhereInput = {
        isDeleted: false,
      };

      if (listIds && listIds.length > 0) {
        baseWhere.listId = { in: listIds };
      }

      if (usernames && usernames.length > 0) {
        baseWhere.userUsername = { in: usernames };
      }

      if (publishedAfter) {
        baseWhere.publishedAt = { gte: BigInt(publishedAfter.getTime()) };
      }

      // 获取各种状态的统计
      const [
        totalTweets,
        extractedTweets,
        aiPendingTweets,
        aiProcessingTweets,
        aiCompletedTweets,
        aiFailedTweets,
      ] = await Promise.all([
        db.tweet.count({ where: baseWhere }),
        db.tweet.count({
          where: {
            ...baseWhere,
            analysisStatus: { in: ['synced', 'analyzed'] },
          },
        }),
        db.tweet.count({
          where: {
            ...baseWhere,
            OR: [
              { aiProcessStatus: null },
              { aiProcessStatus: 'pending' }
            ],
          },
        }),
        db.tweet.count({
          where: {
            ...baseWhere,
            aiProcessStatus: 'processing',
          },
        }),
        db.tweet.count({
          where: {
            ...baseWhere,
            aiProcessStatus: 'completed',
          },
        }),
        db.tweet.count({
          where: {
            ...baseWhere,
            aiProcessStatus: 'failed',
          },
        }),
      ]);

      return {
        total: totalTweets,
        extracted: extractedTweets,
        notExtracted: totalTweets - extractedTweets,
        aiPending: aiPendingTweets,
        aiProcessing: aiProcessingTweets,
        aiCompleted: aiCompletedTweets,
        aiFailed: aiFailedTweets,
      };
    }),

  // 获取主题标签列表
  getTopicTags: protectedProcedure
    .query(async () => {
      const tags = await db.topicTag.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      });
      return tags;
    }),

  // 创建主题标签
  createTopicTag: protectedProcedure
    .input(TopicTagSchema)
    .mutation(async ({ input }) => {
      const tag = await db.topicTag.create({
        data: input,
      });
      return tag;
    }),

  // 更新主题标签
  updateTopicTag: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: TopicTagSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const { id, data } = input;
      const tag = await db.topicTag.update({
        where: { id },
        data,
      });
      return tag;
    }),

  // 删除主题标签
  deleteTopicTag: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.topicTag.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  // 获取内容类型列表
  getContentTypes: protectedProcedure
    .query(async () => {
      return await db.contentType.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // 添加内容类型
  addContentType: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await db.contentType.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),

  // 更新内容类型
  updateContentType: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { id, data } = input;
      const type = await db.contentType.update({
        where: { id },
        data,
      });
      return type;
    }),

  // 删除内容类型
  deleteContentType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.contentType.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  // 获取 AI 处理记录
  getAIProcessRecords: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const records = await db.aIProcessRecord.findMany({
        orderBy: { startedAt: 'desc' },
        take: input.limit,
      });

      // 解析 JSON 字段
      const processedRecords = records.map((record) => ({
        ...record,
        filterConfig: record.filterConfig ? JSON.parse(record.filterConfig) : null,
        requestDetails: record.requestDetails ? JSON.parse(record.requestDetails) : null,
        responseDetails: record.responseDetails ? JSON.parse(record.responseDetails) : null,
        processingLogs: record.processingLogs ? JSON.parse(record.processingLogs) : [],
      }));

      return processedRecords;
    }),

  // 启动 AI 批处理
  startAIBatchProcess: protectedProcedure
    .input(z.object({
      filterConfig: TweetFilterSchema.omit({ page: true, limit: true }),
      batchSize: z.number().min(1).max(100).default(10),
      batchProcessingMode: z.enum(['optimized', 'traditional']).default('optimized'),
      systemPrompt: z.string().optional(),
      aiConfig: z.object({
        apiKey: z.string().min(1),
        provider: z.enum(['openai', 'openai-badger']).default('openai'),
        model: z.string().default('gpt-4o'),
        baseURL: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { filterConfig, batchSize, batchProcessingMode, systemPrompt, aiConfig } = input;
      
      // 生成批次ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 查询符合条件的推文
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

      const totalTweets = await db.tweet.count({ where });

      if (totalTweets === 0) {
        throw new Error('没有符合条件的推文需要处理');
      }

      // 清理旧记录，保留最近10条
      await cleanupOldAIRecords();

      // 🔥 重构：使用processManager统一启动任务，避免竞态条件
      // 不再手动创建数据库记录，让processManager内部处理
      try {
        await processManager.startBatchProcess({
          batchId,
          filterConfig,
          batchSize,
          batchProcessingMode,
          systemPrompt,
          aiConfig,
        });

        return {
          batchId,
          totalTweets,
          batchSize,
          estimatedBatches: Math.ceil(totalTweets / batchSize),
          mode: batchProcessingMode,
          status: 'processing',
          message: 'AI批处理任务启动成功（单批次模式）',
        };
      } catch (error) {
        // 🔥 改进错误处理：如果启动失败，返回具体错误信息
        console.error('[tRPC AI批处理] 启动任务失败:', error);
        
        if (error instanceof Error && error.message.includes('正在运行中')) {
          // 保持原有的错误格式，让前端能够识别
          throw error;
        }
        
        throw new Error(`启动AI批处理任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // 停止 AI 批处理
  stopAIBatchProcess: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(async ({ input }) => {
      await processManager.stopBatchProcess(input.batchId);
      return { success: true };
    }),

  // 继续 AI 批处理
  continueAIBatchProcess: protectedProcedure
    .input(z.object({
      previousBatchId: z.string().optional(),
      filterConfig: TweetFilterSchema.omit({ page: true, limit: true }),
      batchSize: z.number().min(1).max(100).default(10),
      batchProcessingMode: z.enum(['optimized', 'traditional']).default('optimized'),
      systemPrompt: z.string().optional(),
      aiConfig: z.object({
        apiKey: z.string().min(1),
        provider: z.enum(['openai', 'openai-badger']).default('openai'),
        model: z.string().default('gpt-4o'),
        baseURL: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { previousBatchId, filterConfig, batchSize, batchProcessingMode, systemPrompt, aiConfig } = input;
      
      // 生成新的批次ID
      const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 查询符合条件且未处理的推文
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

      const remainingTweets = await db.tweet.count({ where });

      if (remainingTweets === 0) {
        throw new Error('没有更多符合条件的推文需要处理');
      }

      // 🔥 重构：使用processManager统一启动任务，避免竞态条件
      // 不再手动创建数据库记录，让processManager内部处理
      try {
        await processManager.startBatchProcess({
          batchId: newBatchId,
          filterConfig,
          batchSize,
          batchProcessingMode,
          systemPrompt,
          aiConfig,
        });

        return {
          batchId: newBatchId,
          previousBatchId,
          remainingTweets,
          batchSize,
          estimatedBatches: Math.ceil(remainingTweets / batchSize),
          mode: batchProcessingMode,
          status: 'processing',
          message: '继续处理任务启动成功',
        };
      } catch (error) {
        // 🔥 改进错误处理：如果启动失败，返回具体错误信息
        console.error('[tRPC AI批处理] 继续处理任务失败:', error);
        
        if (error instanceof Error && error.message.includes('正在运行中')) {
          // 保持原有的错误格式，让前端能够识别
          throw error;
        }
        
        throw new Error(`继续AI批处理任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // 获取批处理状态
  getBatchProcessStatus: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .query(async ({ input }) => {
      const status = await processManager.getBatchStatus(input.batchId);
      return status;
    }),

  // 重试失败的推文处理
  retryFailedTweets: protectedProcedure
    .input(z.object({
      tweetIds: z.array(z.string()).optional(),
      batchId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { tweetIds, batchId } = input;

      let where: Prisma.TweetWhereInput = {
        aiProcessStatus: 'failed',
        aiRetryCount: { lt: 3 }, // 最多重试3次
      };

      if (tweetIds && tweetIds.length > 0) {
        where.id = { in: tweetIds };
      }

      // 重置失败推文的状态
      const result = await db.tweet.updateMany({
        where,
        data: {
          aiProcessStatus: 'pending',
        },
      });

      return { updatedCount: result.count };
    }),
});
