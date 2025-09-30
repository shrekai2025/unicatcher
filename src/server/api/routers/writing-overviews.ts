/**
 * 写作概览管理 tRPC 路由
 */
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { llmWritingOverviewService } from "~/server/services/llm-writing-overview";

export const writingOverviewsRouter = createTRPCRouter({

  /**
   * 获取所有用户的写作概览列表
   */
  getAllUserOverviews: publicProcedure
    .query(async () => {
      try {
        const overviews = await db.userWritingOverview.findMany({
          select: {
            username: true,
            totalTweetsAnalyzed: true,
            lastUpdated: true,
            version: true,
            overviewContent: true
          },
          orderBy: { lastUpdated: 'desc' }
        });

        return {
          success: true,
          overviews: overviews.map(o => {
            // 解析概览内容以获取更多信息
            let parsedContent;
            try {
              parsedContent = JSON.parse(o.overviewContent);
            } catch {
              parsedContent = null;
            }

            return {
              username: o.username,
              totalTweetsAnalyzed: o.totalTweetsAnalyzed,
              lastUpdated: o.lastUpdated.toISOString(),
              version: o.version,
              writingPersonality: parsedContent?.overallStyle?.writingPersonality || '未知',
              primaryOpeningPattern: parsedContent?.typicalStructure?.openingPatterns?.primaryPattern || '未知',
              primaryHooks: parsedContent?.attractionMechanisms?.primaryHooks?.map((h: any) => h.type).slice(0, 3) || []
            };
          })
        };
      } catch (error) {
        console.error('获取用户概览列表失败:', error);
        throw new Error('获取用户概览列表失败');
      }
    }),


  /**
   * 获取单个用户的完整写作概览
   */
  getUserOverview: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      try {
        const overview = await llmWritingOverviewService.getCurrentOverview(input.username);

        if (!overview) {
          return {
            success: false,
            message: '该用户暂无写作概览'
          };
        }

        return {
          success: true,
          overview
        };
      } catch (error) {
        console.error('获取用户概览失败:', error);
        throw new Error('获取用户概览失败');
      }
    }),


  /**
   * 手动触发更新用户写作概览
   */
  triggerOverviewUpdate: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // 检查用户是否有推文
        const tweetCount = await db.writingAnalysisTweet.count({
          where: { userUsername: input.username }
        });

        if (tweetCount === 0) {
          throw new Error('该用户暂无推文数据');
        }

        // 检查是否已有概览
        const existingOverview = await llmWritingOverviewService.getCurrentOverview(input.username);

        if (!existingOverview) {
          // 生成初始概览
          await llmWritingOverviewService.generateInitialOverview(input.username);
          return {
            success: true,
            message: '初始概览生成成功'
          };
        } else {
          // 获取新推文并触发更新检查
          const lastUpdatedTimestamp = BigInt(new Date(existingOverview.lastUpdated).getTime());

          const newTweets = await db.writingAnalysisTweet.findMany({
            where: {
              userUsername: input.username,
              publishedAt: {
                gt: lastUpdatedTimestamp
              }
            },
            select: { content: true },
            take: 50
          });

          if (newTweets.length === 0) {
            // 强制重新生成概览（使用所有推文）
            await llmWritingOverviewService.generateInitialOverview(input.username);
            return {
              success: true,
              message: '概览已强制重新生成'
            };
          }

          // 检查并更新
          const result = await llmWritingOverviewService.checkAndUpdateOverview(
            input.username,
            newTweets
          );

          return {
            success: true,
            message: result.updated ? '概览已更新' : '概览无需更新',
            updated: result.updated,
            changes: result.changes
          };
        }
      } catch (error) {
        console.error('触发概览更新失败:', error);
        throw new Error(error instanceof Error ? error.message : '触发概览更新失败');
      }
    }),


  /**
   * 获取用户概览的更新历史
   */
  getUpdateHistory: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      try {
        const history = await db.overviewUpdateLog.findMany({
          where: { username: input.username },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            updateType: true,
            newTweetsCount: true,
            changesMade: true,
            llmModel: true,
            createdAt: true
          }
        });

        return {
          success: true,
          history: history.map(h => ({
            updateType: h.updateType,
            newTweetsCount: h.newTweetsCount || 0,
            changes: h.changesMade,
            llmModel: h.llmModel,
            createdAt: h.createdAt.toISOString()
          }))
        };
      } catch (error) {
        console.error('获取更新历史失败:', error);
        throw new Error('获取更新历史失败');
      }
    }),


  /**
   * 删除用户写作概览
   */
  deleteOverview: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await db.userWritingOverview.delete({
          where: { username: input.username }
        });

        return {
          success: true,
          message: '概览已删除'
        };
      } catch (error) {
        console.error('删除概览失败:', error);
        throw new Error('删除概览失败');
      }
    })
});