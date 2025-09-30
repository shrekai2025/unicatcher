/**
 * 用户风格档案API路由
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const styleProfilesRouter = createTRPCRouter({
  /**
   * 获取所有用户的风格档案列表
   */
  getAllProfiles: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const skip = (input.page - 1) * input.limit;

        const [profiles, total] = await Promise.all([
          db.userStyleProfile.findMany({
            orderBy: { updatedAt: 'desc' },
            skip,
            take: input.limit,
          }),
          db.userStyleProfile.count(),
        ]);

        // 统计每个用户的档案数量
        const userStats = await db.userStyleProfile.groupBy({
          by: ['username'],
          _count: {
            username: true,
          },
        });

        const userStatsMap = new Map(
          userStats.map(stat => [stat.username, stat._count.username])
        );

        return {
          success: true,
          data: {
            profiles,
            total,
            page: input.page,
            limit: input.limit,
            hasMore: skip + input.limit < total,
            userStats: Object.fromEntries(userStatsMap),
          },
        };
      } catch (error) {
        console.error('获取风格档案失败:', error);
        throw new Error('获取风格档案失败');
      }
    }),

  /**
   * 获取指定用户的所有风格档案
   */
  getByUsername: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const profiles = await db.userStyleProfile.findMany({
          where: {
            username: input.username,
          },
          orderBy: { updatedAt: 'desc' },
        });

        return {
          success: true,
          data: {
            username: input.username,
            profiles,
            totalProfiles: profiles.length,
          },
        };
      } catch (error) {
        console.error('获取用户风格档案失败:', error);
        throw new Error('获取用户风格档案失败');
      }
    }),

  /**
   * 获取所有唯一用户名列表
   */
  getUsernames: protectedProcedure.query(async () => {
    try {
      const usernames = await db.userStyleProfile.findMany({
        select: {
          username: true,
          updatedAt: true,
        },
        distinct: ['username'],
        orderBy: { updatedAt: 'desc' },
      });

      // 获取每个用户的档案数量
      const userCounts = await db.userStyleProfile.groupBy({
        by: ['username'],
        _count: {
          username: true,
        },
      });

      const countMap = new Map(
        userCounts.map(item => [item.username, item._count.username])
      );

      const usersWithCounts = usernames.map(user => ({
        username: user.username,
        profileCount: countMap.get(user.username) || 0,
        lastUpdated: user.updatedAt,
      }));

      return {
        success: true,
        data: {
          users: usersWithCounts,
          totalUsers: usersWithCounts.length,
        },
      };
    } catch (error) {
      console.error('获取用户名列表失败:', error);
      throw new Error('获取用户名列表失败');
    }
  }),

  /**
   * 删除指定的风格档案
   */
  deleteProfile: protectedProcedure
    .input(
      z.object({
        profileId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db.userStyleProfile.delete({
          where: {
            id: input.profileId,
          },
        });

        return {
          success: true,
          message: '风格档案已删除',
        };
      } catch (error) {
        console.error('删除风格档案失败:', error);
        throw new Error('删除风格档案失败');
      }
    }),

  /**
   * 批量删除用户的所有风格档案
   */
  deleteAllByUsername: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await db.userStyleProfile.deleteMany({
          where: {
            username: input.username,
          },
        });

        return {
          success: true,
          deletedCount: result.count,
          message: `已删除 ${result.count} 个风格档案`,
        };
      } catch (error) {
        console.error('批量删除风格档案失败:', error);
        throw new Error('批量删除风格档案失败');
      }
    }),
});