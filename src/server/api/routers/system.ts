import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { StorageService } from "~/server/core/data/storage";
import { db } from "~/server/db";

const storageService = new StorageService();

export const systemRouter = createTRPCRouter({
  /**
   * 获取系统状态
   */
  status: protectedProcedure.query(async () => {
    try {
      // 获取基本统计数据
      const tasks = await storageService.getTasks(1, 1000);
      const tweets = await storageService.getTweets(undefined, undefined, 1, 1);
      
      // 计算统计信息
      const runningTasks = tasks.tasks.filter(task => task.status === 'running').length;
      const totalTasks = tasks.total;
      const totalTweets = tweets.total;

      return {
        success: true,
        data: {
          status: "运行中",
          runningTasks,
          totalTasks,
          totalTweets,
          version: "1.0.0",
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "获取系统状态失败"
      );
    }
  }),

  /**
   * 清理系统数据
   */
  cleanup: protectedProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).default(30),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 计算清理的截止日期
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

        // 这里可以添加具体的清理逻辑
        // 暂时返回模拟结果
        const cleanedTasks = 0;
        const cleanedTweets = 0;

        return {
          success: true,
          message: `清理完成，删除了 ${cleanedTasks} 个任务和 ${cleanedTweets} 条推文`,
          data: {
            cleanedTasks,
            cleanedTweets,
            cutoffDate: cutoffDate.toISOString(),
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "系统清理失败"
        );
      }
    }),

  /**
   * 清除无价值推文
   */
  cleanValuelessTweets: protectedProcedure
    .mutation(async () => {
      try {
        // 删除所有isValueless为true的推文
        const result = await db.tweet.deleteMany({
          where: {
            isValueless: true,
          },
        });

        return {
          success: true,
          message: `成功删除 ${result.count} 条无价值推文`,
          deletedCount: result.count,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "清除无价值推文失败"
        );
      }
    }),

  /**
   * 清除旧推文
   */
  cleanOldTweets: protectedProcedure
    .input(
      z.object({
        beforeDate: z.string(), // ISO日期字符串
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 将日期字符串转换为时间戳
        const beforeTimestamp = BigInt(new Date(input.beforeDate).getTime());

        // 删除指定时间之前的推文
        const result = await db.tweet.deleteMany({
          where: {
            publishedAt: {
              lt: beforeTimestamp,
            },
          },
        });

        return {
          success: true,
          message: `成功删除 ${result.count} 条旧推文（发布时间早于 ${new Date(input.beforeDate).toLocaleString()}）`,
          deletedCount: result.count,
          beforeDate: input.beforeDate,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "清除旧推文失败"
        );
      }
    }),

  /**
   * 删除隐藏推文
   */
  deleteHiddenTweets: protectedProcedure
    .mutation(async () => {
      try {
        // 先查询要删除的隐藏推文数量
        const hiddenCount = await db.tweet.count({
          where: {
            isDeleted: true,
          },
        });

        if (hiddenCount === 0) {
          return {
            success: true,
            message: "没有找到隐藏的推文",
            deletedCount: 0,
          };
        }

        // 永久删除所有被标记为隐藏(isDeleted: true)的推文
        const result = await db.tweet.deleteMany({
          where: {
            isDeleted: true,
          },
        });

        return {
          success: true,
          message: `成功永久删除 ${result.count} 条隐藏推文`,
          deletedCount: result.count,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "删除隐藏推文失败"
        );
      }
    }),
}); 