import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { StorageService } from "~/server/core/data/storage";

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
}); 