/**
 * 任务管理 tRPC 路由
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { deduplicationManager } from "~/server/services/cache-manager";

export const taskManagementRouter = createTRPCRouter({

  /**
   * 获取所有正在运行的任务
   */
  getRunningTasks: publicProcedure
    .query(async () => {
      try {
        const tasks = deduplicationManager.getRunningTasks();

        return {
          success: true,
          tasks,
          count: tasks.length
        };
      } catch (error) {
        console.error('获取运行任务失败:', error);
        throw new Error('获取运行任务失败');
      }
    }),


  /**
   * 获取任务历史
   */
  getTaskHistory: publicProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20)
    }))
    .query(async ({ input }) => {
      try {
        const history = deduplicationManager.getTaskHistory(input.limit);

        return {
          success: true,
          history,
          count: history.length
        };
      } catch (error) {
        console.error('获取任务历史失败:', error);
        throw new Error('获取任务历史失败');
      }
    }),


  /**
   * 取消特定任务
   */
  cancelTask: publicProcedure
    .input(z.object({
      taskKey: z.string().min(1, '任务key不能为空')
    }))
    .mutation(async ({ input }) => {
      try {
        const cancelled = deduplicationManager.cancelTask(input.taskKey);

        if (!cancelled) {
          throw new Error('任务不存在或无法取消');
        }

        return {
          success: true,
          message: '任务已取消'
        };
      } catch (error) {
        console.error('取消任务失败:', error);
        throw new Error(error instanceof Error ? error.message : '取消任务失败');
      }
    }),


  /**
   * 取消所有任务
   */
  cancelAllTasks: publicProcedure
    .mutation(async () => {
      try {
        const cancelledCount = deduplicationManager.cancelAllTasks();

        return {
          success: true,
          message: `已取消 ${cancelledCount} 个任务`,
          cancelledCount
        };
      } catch (error) {
        console.error('取消所有任务失败:', error);
        throw new Error('取消所有任务失败');
      }
    }),


  /**
   * 获取任务详情
   */
  getTaskDetail: publicProcedure
    .input(z.object({
      taskKey: z.string().min(1, '任务key不能为空')
    }))
    .query(async ({ input }) => {
      try {
        const task = deduplicationManager.getTaskDetail(input.taskKey);

        if (!task) {
          throw new Error('任务不存在');
        }

        return {
          success: true,
          task: {
            key: task.key,
            description: task.description,
            startTime: task.startTime,
            status: task.status
          }
        };
      } catch (error) {
        console.error('获取任务详情失败:', error);
        throw new Error(error instanceof Error ? error.message : '获取任务详情失败');
      }
    })
});