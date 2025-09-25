/**
 * YouTube API路由
 * 提供YouTube频道监控和视频数据管理功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { UnifiedTaskManager } from "~/server/core/crawler/UnifiedTaskManager";
import { UnifiedStorageService } from "~/server/core/data/UnifiedStorageService";
import { db } from "~/server/db";

const storageService = new UnifiedStorageService();
const unifiedTaskManager = UnifiedTaskManager.getInstance();

export const youtubeRouter = createTRPCRouter({
  /**
   * 创建YouTube频道监控任务
   */
  createTask: protectedProcedure
    .input(
      z.object({
        channelHandle: z.string().min(1, "频道handle不能为空"),
        maxVideos: z.number().int().min(1).max(50).optional().default(20),
        duplicateStopCount: z.number().int().min(1).max(10).optional().default(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 验证频道handle格式 - 基本验证，只确保不为空且合理
        if (!input.channelHandle.trim() || input.channelHandle.length > 100) {
          throw new Error("频道handle不能为空且长度不能超过100个字符");
        }

        // 检查是否有相同频道的运行中任务
        const runningTasks = await storageService.getTasks(1, 100, 'running');
        const hasDuplicateRunning = runningTasks.tasks.some(
          task => task.type === 'youtube_channel' &&
                  task.channelHandle === input.channelHandle &&
                  task.status === 'running'
        );

        if (hasDuplicateRunning) {
          throw new Error("该频道已有正在运行的监控任务");
        }

        // 提交任务到统一管理器
        const taskId = await unifiedTaskManager.submitYouTubeTask({
          channelHandle: input.channelHandle,
          maxVideos: input.maxVideos,
          duplicateStopCount: input.duplicateStopCount,
        });

        return {
          success: true,
          taskId,
          message: `YouTube频道监控任务已创建: ${input.channelHandle}`,
        };
      } catch (error) {
        console.error('创建YouTube任务失败:', error);
        throw new Error(
          error instanceof Error ? error.message : '创建YouTube任务失败'
        );
      }
    }),

  /**
   * 获取YouTube任务列表
   */
  getTasks: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
        status: z.enum(['created', 'queued', 'running', 'completed', 'failed']).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const tasks = await storageService.getTasks(input.page, input.limit, input.status);

        // 只返回YouTube任务
        const youtubeTasks = {
          ...tasks,
          tasks: tasks.tasks.filter(task => task.type === 'youtube_channel')
        };

        return youtubeTasks;
      } catch (error) {
        console.error('获取YouTube任务列表失败:', error);
        throw new Error('获取任务列表失败');
      }
    }),

  /**
   * 获取YouTube视频数据列表
   */
  getVideos: protectedProcedure
    .input(
      z.object({
        channelHandle: z.string().optional(),
        taskId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = {
          isDeleted: false,
        };

        if (input.channelHandle) {
          where.channelHandle = input.channelHandle;
        }
        if (input.taskId) {
          where.taskId = input.taskId;
        }

        const skip = (input.page - 1) * input.limit;

        const [videos, total] = await Promise.all([
          db.youTubeVideo.findMany({
            where,
            orderBy: { publishedTimestamp: 'desc' },
            skip,
            take: input.limit,
            select: {
              id: true,
              title: true,
              channelName: true,
              channelHandle: true,
              channelUrl: true,
              videoUrl: true,
              thumbnailUrl: true,
              duration: true,
              viewCount: true,
              publishedAt: true,
              publishedTimestamp: true,
              scrapedAt: true,
              createdAt: true,
            },
          }),
          db.youTubeVideo.count({ where }),
        ]);

        // 转换BigInt为数字
        const formattedVideos = videos.map((video) => ({
          ...video,
          publishedTimestamp: video.publishedTimestamp ? Number(video.publishedTimestamp) : null,
          scrapedAt: Number(video.scrapedAt),
        }));

        return {
          videos: formattedVideos,
          total,
          page: input.page,
          limit: input.limit,
        };
      } catch (error) {
        console.error('获取YouTube视频失败:', error);
        throw new Error('获取视频数据失败');
      }
    }),

  /**
   * 获取频道记录列表
   */
  getChannelRecords: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = {};
        if (typeof input.isActive === 'boolean') {
          where.isActive = input.isActive;
        }

        const skip = (input.page - 1) * input.limit;

        const [channels, total] = await Promise.all([
          db.youTubeChannelRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: input.limit,
          }),
          db.youTubeChannelRecord.count({ where }),
        ]);

        return {
          channels,
          total,
          page: input.page,
          limit: input.limit,
        };
      } catch (error) {
        console.error('获取频道记录失败:', error);
        throw new Error('获取频道记录失败');
      }
    }),

  /**
   * 添加频道记录
   */
  addChannelRecord: protectedProcedure
    .input(
      z.object({
        channelHandle: z.string().min(1, "频道handle不能为空"),
        channelName: z.string().min(1, "频道名称不能为空"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 检查是否已存在
        const existing = await db.youTubeChannelRecord.findUnique({
          where: { channelHandle: input.channelHandle },
        });

        if (existing) {
          throw new Error("该频道已存在于监控列表中");
        }

        const channel = await db.youTubeChannelRecord.create({
          data: {
            channelHandle: input.channelHandle,
            channelName: input.channelName,
            channelUrl: `https://www.youtube.com/${input.channelHandle}`,
            notes: input.notes,
          },
        });

        return {
          success: true,
          channel,
          message: "频道已添加到监控列表",
        };
      } catch (error) {
        console.error('添加频道记录失败:', error);
        throw new Error(
          error instanceof Error ? error.message : '添加频道失败'
        );
      }
    }),

  /**
   * 更新频道记录
   */
  updateChannelRecord: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        channelName: z.string().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input;

        const channel = await db.youTubeChannelRecord.update({
          where: { id },
          data: updateData,
        });

        return {
          success: true,
          channel,
          message: "频道记录已更新",
        };
      } catch (error) {
        console.error('更新频道记录失败:', error);
        throw new Error('更新频道记录失败');
      }
    }),

  /**
   * 删除频道记录
   */
  deleteChannelRecord: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await db.youTubeChannelRecord.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: "频道记录已删除",
        };
      } catch (error) {
        console.error('删除频道记录失败:', error);
        throw new Error('删除频道记录失败');
      }
    }),

  /**
   * 取消YouTube任务
   */
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // 取消统一管理器中的任务
        await unifiedTaskManager.cancelTask(input.taskId);

        // 更新数据库任务状态
        await storageService.updateTaskStatus(input.taskId, 'failed', {
          success: false,
          message: '任务已被用户取消',
        });

        return {
          success: true,
          message: "YouTube任务已取消",
        };
      } catch (error) {
        console.error('取消YouTube任务失败:', error);
        throw new Error('取消任务失败');
      }
    }),

  /**
   * 获取YouTube统计信息
   */
  getStats: protectedProcedure.query(async () => {
    try {
      const [
        totalChannels,
        activeChannels,
        totalVideos,
        todayVideos,
        runningTasks,
      ] = await Promise.all([
        db.youTubeChannelRecord.count(),
        db.youTubeChannelRecord.count({ where: { isActive: true } }),
        db.youTubeVideo.count({ where: { isDeleted: false } }),
        db.youTubeVideo.count({
          where: {
            isDeleted: false,
            scrapedAt: {
              gte: BigInt(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
            },
          },
        }),
        db.spiderTask.count({
          where: {
            type: 'youtube_channel',
            status: 'running',
          },
        }),
      ]);

      return {
        totalChannels,
        activeChannels,
        totalVideos,
        todayVideos,
        runningTasks,
      };
    } catch (error) {
      console.error('获取YouTube统计信息失败:', error);
      throw new Error('获取统计信息失败');
    }
  }),
});