/**
 * 推文生成 tRPC 路由
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { TWEET_TYPES } from "~/server/services/tweet-analysis";
import { loadUserStyleData, generateTweets } from "~/server/services/tweet-generation";
import { WritingAssistantConfigLoader } from "~/server/core/ai/writing-assistant-config-loader";

export const tweetGenerationRouter = createTRPCRouter({

  /**
   * 获取可用的用户列表
   */
  getAvailableUsers: publicProcedure
    .query(async () => {
      try {
        // 从WritingAnalysisTweet获取所有唯一用户名
        const users = await db.writingAnalysisTweet.groupBy({
          by: ['userUsername'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        });

        return {
          success: true,
          users: users.map(u => ({
            username: u.userUsername,
            tweetCount: u._count.id
          }))
        };
      } catch (error) {
        console.error('获取可用用户失败:', error);
        throw new Error('获取可用用户失败');
      }
    }),


  /**
   * 获取用户在各类型下的样本数量
   */
  getUserTypeStats: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      try {
        // 获取用户的风格档案
        const profiles = await db.userStyleProfile.findMany({
          where: { username: input.username },
          select: {
            contentType: true,
            sampleCount: true,
            lastAnalyzedAt: true
          }
        });

        // 获取用户写作概览
        const overview = await db.userWritingOverview.findUnique({
          where: { username: input.username },
          select: {
            totalTweetsAnalyzed: true,
            lastUpdated: true
          }
        });

        // 如果没有概览，从实际推文表统计
        let totalTweets = overview?.totalTweetsAnalyzed || 0;
        if (!overview) {
          totalTweets = await db.writingAnalysisTweet.count({
            where: { userUsername: input.username }
          });
        }

        return {
          success: true,
          data: {
            username: input.username,
            totalTweets,
            lastAnalyzed: overview?.lastUpdated || null,
            types: profiles.map(p => ({
              contentType: p.contentType,
              sampleCount: p.sampleCount,
              lastAnalyzed: p.lastAnalyzedAt
            }))
          }
        };
      } catch (error) {
        console.error('获取用户类型统计失败:', error);
        throw new Error('获取用户类型统计失败');
      }
    }),


  /**
   * 预览用户在特定类型下的风格特征
   */
  previewUserStyle: publicProcedure
    .input(z.object({
      username: z.string(),
      contentType: z.string()
    }))
    .query(async ({ input }) => {
      try {
        const styleContext = await loadUserStyleData(
          input.username,
          input.contentType
        );

        return {
          success: true,
          data: {
            username: input.username,
            contentType: input.contentType,
            preview: {
              commonOpenings: styleContext.typeSpecificStyle.commonOpenings.slice(0, 3),
              avgSentenceLength: styleContext.typeSpecificStyle.avgSentenceLength,
              signatureWords: styleContext.typeSpecificStyle.signatureWords.slice(0, 10).map((w: any) => w.word),
              toneFeatures: styleContext.typeSpecificStyle.toneFeatures,
              sampleCount: styleContext.typeSpecificStyle.sampleCount,
              exampleTweets: styleContext.exampleTweets.slice(0, 3)
            }
          }
        };
      } catch (error) {
        console.error('预览用户风格失败:', error);
        throw new Error(error instanceof Error ? error.message : '预览用户风格失败');
      }
    }),


  /**
   * 获取所有可用的内容类型
   */
  getContentTypes: publicProcedure
    .query(async () => {
      try {
        const types = Object.entries(TWEET_TYPES).map(([type, config]) => ({
          value: type,
          label: type,
          category: config.category,
          description: config.patterns.join('、'),
          tone: config.tone
        }));

        return {
          success: true,
          types
        };
      } catch (error) {
        console.error('获取内容类型失败:', error);
        throw new Error('获取内容类型失败');
      }
    }),


  /**
   * 创建生成任务
   */
  createGenerationTask: publicProcedure
    .input(z.object({
      username: z.string().min(1, '用户名不能为空'),
      contentType: z.string().min(1, '内容类型不能为空'),
      topic: z.string().optional(),
      generateCount: z.number().int().min(1).max(5).default(3),
      lengthPreference: z.enum(['auto', 'short', 'medium', 'long']).default('auto'),
    }))
    .mutation(async ({ input }) => {
      try {
        // 从AI设置获取配置
        const aiConfig = await WritingAssistantConfigLoader.getGenerationConfig();

        // 异步执行生成
        generateTweets(input.username, input.contentType, {
          topic: input.topic,
          count: input.generateCount,
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
          temperature: aiConfig.temperature
        }).catch(console.error);

        return {
          success: true,
          message: '生成任务已创建,请稍后查看结果'
        };
      } catch (error) {
        console.error('创建生成任务失败:', error);
        throw new Error('创建生成任务失败');
      }
    }),


  /**
   * 获取生成历史
   */
  getGenerationHistory: publicProcedure
    .input(z.object({
      username: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0)
    }))
    .query(async ({ input }) => {
      try {
        const where = input.username ? { username: input.username } : undefined;

        const [tasks, total] = await Promise.all([
          db.tweetGenerationTask.findMany({
            where,
            include: {
              results: {
                select: {
                  id: true,
                  generatedContent: true,
                  contentLength: true,
                  styleScore: true,
                  styleAnalysis: true,
                  userRating: true,
                  isSelected: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset
          }),
          db.tweetGenerationTask.count({ where })
        ]);

        return {
          success: true,
          data: {
            tasks,
            total,
            hasMore: input.offset + input.limit < total
          }
        };
      } catch (error) {
        console.error('获取生成历史失败:', error);
        throw new Error('获取生成历史失败');
      }
    }),


  /**
   * 获取单个任务详情
   */
  getTaskDetail: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      try {
        const task = await db.tweetGenerationTask.findUnique({
          where: { id: input.taskId },
          include: {
            results: true
          }
        });

        if (!task) {
          throw new Error('任务不存在');
        }

        return {
          success: true,
          data: task
        };
      } catch (error) {
        console.error('获取任务详情失败:', error);
        throw new Error(error instanceof Error ? error.message : '获取任务详情失败');
      }
    }),


  /**
   * 提交用户反馈
   */
  submitFeedback: publicProcedure
    .input(z.object({
      resultId: z.string(),
      rating: z.number().int().min(1).max(5),
      feedback: z.string().optional(),
      isSelected: z.boolean().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        await db.tweetGenerationResult.update({
          where: { id: input.resultId },
          data: {
            userRating: input.rating,
            userFeedback: input.feedback,
            isSelected: input.isSelected
          }
        });

        return {
          success: true,
          message: '反馈提交成功'
        };
      } catch (error) {
        console.error('提交反馈失败:', error);
        throw new Error('提交反馈失败');
      }
    }),


  /**
   * 删除生成任务
   */
  deleteTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await db.tweetGenerationTask.delete({
          where: { id: input.taskId }
        });

        return {
          success: true,
          message: '任务删除成功'
        };
      } catch (error) {
        console.error('删除任务失败:', error);
        throw new Error('删除任务失败');
      }
    })
});