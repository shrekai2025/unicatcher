/**
 * 任务管理API路由
 * 提供Twitter List爬取任务的创建、查询、管理功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TaskExecutorManager } from "~/server/core/tasks/executor";
import { UnifiedTaskManager } from "~/server/core/crawler/UnifiedTaskManager";
import { StorageService } from "~/server/core/data/storage";

const storageService = new StorageService();
const taskManager = TaskExecutorManager.getInstance();
const unifiedTaskManager = UnifiedTaskManager.getInstance();

export const tasksRouter = createTRPCRouter({
  /**
   * 创建爬取任务
   */
  create: protectedProcedure
    .input(
      z.object({
        listId: z.string().min(1, "List ID不能为空"),
        maxTweets: z.number().int().min(1).max(100).optional().default(20),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 验证List ID格式（应该是数字）
        if (!/^\d+$/.test(input.listId)) {
          throw new Error("List ID格式无效，应为纯数字");
        }

        // 检查是否有相同List ID的运行中任务
        const existingTasks = await storageService.getTasks(1, 100, 'running');
        const hasDuplicateRunning = existingTasks.tasks.some(
          task => task.listId === input.listId && task.status === 'running'
        );

        if (hasDuplicateRunning) {
          throw new Error("该List已有正在运行的爬取任务");
        }

        // 提交任务到统一管理器（使用新架构）
        const executorTaskId = await unifiedTaskManager.submitTwitterTask({
          listId: input.listId,
          maxTweets: input.maxTweets,
        });

        return {
          success: true,
          message: "任务创建成功",
          data: {
            executorTaskId,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "创建任务失败"
        );
      }
    }),

  /**
   * 创建Twitter List爬取任务 (别名方法)
   */
  createTwitterList: protectedProcedure
    .input(
      z.object({
        listId: z.string().min(1, "List ID不能为空"),
        maxTweets: z.number().int().min(1).max(100).optional().default(20),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 验证List ID格式（应该是数字）
        if (!/^\d+$/.test(input.listId)) {
          throw new Error("List ID格式无效，应为纯数字");
        }

        // 检查是否有相同List ID的运行中任务
        const existingTasks = await storageService.getTasks(1, 100, 'running');
        const hasDuplicateRunning = existingTasks.tasks.some(
          task => task.listId === input.listId && task.status === 'running'
        );

        if (hasDuplicateRunning) {
          throw new Error("该List已有正在运行的爬取任务");
        }

        // 提交任务到统一管理器（使用新架构）
        const executorTaskId = await unifiedTaskManager.submitTwitterTask({
          listId: input.listId,
          maxTweets: input.maxTweets,
        });

        return {
          success: true,
          message: "任务创建成功",
          data: {
            executorTaskId,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "创建任务失败"
        );
      }
    }),

  /**
   * 获取任务列表
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTasks(
          input.page,
          input.limit,
          input.status as any
        );

        return {
          success: true,
          data: {
            tasks: result.tasks,
            total: result.total,
            hasMore: result.page * result.limit < result.total,
          },
        };
      } catch (error) {
        throw new Error("获取任务列表失败");
      }
    }),

  /**
   * 获取任务列表 (别名方法)
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(['created', 'queued', 'running', 'completed', 'failed']).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTasks(
          input.page,
          input.limit,
          input.status
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取任务列表失败");
      }
    }),

  /**
   * 获取任务详情
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "任务ID不能为空"),
      })
    )
    .query(async ({ input }) => {
      try {
        const task = await storageService.getTask(input.id);
        
        if (!task) {
          throw new Error("任务不存在");
        }

        // 解析结果JSON
        let parsedResult = null;
        if (task.result) {
          try {
            parsedResult = JSON.parse(task.result);
          } catch (e) {
            console.warn("解析任务结果失败:", e);
          }
        }

        return {
          success: true,
          data: {
            ...task,
            result: parsedResult,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "获取任务详情失败"
        );
      }
    }),

  /**
   * 取消任务
   */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "任务ID不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 尝试从执行器管理器中取消任务
        await taskManager.cancelTask(input.id);

        // 更新数据库任务状态
        await storageService.updateTaskStatus(input.id, 'failed', {
          success: false,
          message: "任务已被用户取消",
          error: {
            code: 'TASK_CANCELLED',
            message: "任务已被用户取消",
          },
        });

        return {
          success: true,
          message: "任务已取消",
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "取消任务失败"
        );
      }
    }),

  /**
   * 强制清理僵尸任务
   */
  cleanupZombies: protectedProcedure
    .mutation(async () => {
      try {
        // 获取任务管理器实例
        const result = await taskManager.forceCleanupZombieTasks();

        return {
          success: true,
          message: `成功清理 ${result.total} 个僵尸任务`,
          data: result,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "清理僵尸任务失败"
        );
      }
    }),

  /**
   * 删除任务及其数据
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "任务ID不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 检查任务是否在运行
        const task = await storageService.getTask(input.id);
        if (task?.status === 'running') {
          // 先尝试取消任务
          console.log(`尝试取消正在运行的任务: ${input.id}`);
          try {
            await taskManager.cancelTask(input.id);

            // 更新数据库任务状态为已取消
            await storageService.updateTaskStatus(input.id, 'failed', {
              success: false,
              message: "任务已被取消并删除",
              error: {
                code: 'TASK_CANCELLED_AND_DELETED',
                message: "任务已被取消并删除",
              },
            });
          } catch (cancelError) {
            console.warn(`取消任务失败: ${input.id}`, cancelError);
            // 即使取消失败，也继续删除过程
          }
        }

        // 删除任务及相关数据
        await storageService.deleteTask(input.id);

        return {
          success: true,
          message: task?.status === 'running' ? "任务已取消并删除" : "任务及数据已删除",
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "删除任务失败"
        );
      }
    }),

  /**
   * 重新执行任务
   */
  retry: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "任务ID不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 获取原任务信息
        const originalTask = await storageService.getTask(input.id);
        if (!originalTask) {
          throw new Error("原任务不存在");
        }

        if (originalTask.status === 'running') {
          throw new Error("任务正在运行中，无需重试");
        }

        // 创建新的任务配置
        const taskConfig = {
          listId: originalTask.listId,
          maxTweets: 20, // 使用默认值，或者从原任务中解析
        };

        // 提交新任务到统一管理器
        const executorTaskId = await unifiedTaskManager.submitTwitterTask(taskConfig);

        return {
          success: true,
          message: "重试任务已创建",
          data: {
            executorTaskId,
            originalTaskId: input.id,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "重试任务失败"
        );
      }
    }),

  /**
   * 获取任务执行器状态
   */
  getExecutorStatus: protectedProcedure
    .query(() => {
      try {
        const status = taskManager.getStatus();
        return {
          success: true,
          data: status,
        };
      } catch (error) {
        throw new Error("获取执行器状态失败");
      }
    }),

  /**
   * 获取统计信息
   */
  getStats: protectedProcedure
    .query(async () => {
      try {
        const stats = await storageService.getStats();
        const executorStatus = taskManager.getStatus();

        return {
          success: true,
          data: {
            ...stats,
            currentRunning: executorStatus.runningTasks,
            maxConcurrent: executorStatus.maxConcurrentTasks,
          },
        };
      } catch (error) {
        throw new Error("获取统计信息失败");
      }
    }),

  /**
   * 批量操作：删除已完成的任务
   */
  batchCleanCompleted: protectedProcedure
    .input(
      z.object({
        olderThanDays: z.number().int().min(1).max(365).default(7),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await storageService.cleanupOldData(input.olderThanDays);

        return {
          success: true,
          message: `已清理 ${input.olderThanDays} 天前的已完成任务`,
        };
      } catch (error) {
        throw new Error("批量清理失败");
      }
    }),
}); 