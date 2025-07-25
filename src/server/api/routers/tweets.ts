/**
 * 推文数据API路由
 * 提供推文数据的查询、导出功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { StorageService } from "~/server/core/data/storage";

const storageService = new StorageService();

export const tweetsRouter = createTRPCRouter({
  /**
   * 根据任务ID获取推文数据
   */
  getByTaskId: protectedProcedure
    .input(
      z.object({
        taskId: z.string().min(1, "任务ID不能为空"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTweets(
          input.taskId,
          undefined,
          input.page,
          input.limit
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取推文数据失败");
      }
    }),

  /**
   * 根据List ID获取推文数据
   */
  getByListId: protectedProcedure
    .input(
      z.object({
        listId: z.string().min(1, "List ID不能为空"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTweets(
          undefined,
          input.listId,
          input.page,
          input.limit
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取推文数据失败");
      }
    }),

  /**
   * 获取推文列表（分页）
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        taskId: z.string().optional(),
        listId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTweets(
          input.taskId,
          input.listId,
          input.page,
          input.limit
        );

        return {
          success: true,
          data: {
            tweets: result.tweets,
            total: result.total,
            hasMore: result.page * result.limit < result.total,
          },
        };
      } catch (error) {
        throw new Error("获取推文数据失败");
      }
    }),

  /**
   * 获取所有推文数据（分页）- 别名方法
   */
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(), // 搜索关键词（可扩展功能）
      })
    )
    .query(async ({ input }) => {
      try {
        // 当前实现不支持搜索，直接获取所有数据
        const result = await storageService.getTweets(
          undefined,
          undefined,
          input.page,
          input.limit
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取推文数据失败");
      }
    }),

  /**
   * 获取推文详情
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "推文ID不能为空"),
      })
    )
    .query(async ({ input }) => {
      try {
        // 通过获取单页数据并筛选来实现
        // 这里可以优化为直接查询数据库
        const result = await storageService.getTweets(undefined, undefined, 1, 1000);
        const tweet = result.tweets.find(t => t.id === input.id);

        if (!tweet) {
          throw new Error("推文不存在");
        }

        return {
          success: true,
          data: tweet,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "获取推文详情失败"
        );
      }
    }),

  /**
   * 导出推文数据
   */
  export: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        listId: z.string().optional(),
        format: z.enum(['json', 'csv']).default('json'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (!input.taskId && !input.listId) {
          throw new Error("必须指定任务ID或List ID");
        }

        const exportData = await storageService.exportTweets(
          input.taskId,
          input.listId,
          input.format
        );

        return {
          success: true,
          data: {
            content: exportData,
            format: input.format,
            filename: `tweets-${input.taskId || input.listId}-${Date.now()}.${input.format}`,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "导出数据失败"
        );
      }
    }),

  /**
   * 获取推文统计信息
   */
  getStats: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        listId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // 获取指定范围的推文数据进行统计
        const result = await storageService.getTweets(
          input.taskId,
          input.listId,
          1,
          10000 // 获取大量数据进行统计
        );

        const tweets = result.tweets;
        
        // 计算统计信息
        const stats = {
          totalTweets: tweets.length,
          totalLikes: tweets.reduce((sum, tweet) => sum + (tweet.likeCount || 0), 0),
          totalRetweets: tweets.reduce((sum, tweet) => sum + (tweet.retweetCount || 0), 0),
          totalReplies: tweets.reduce((sum, tweet) => sum + (tweet.replyCount || 0), 0),
          totalViews: tweets.reduce((sum, tweet) => sum + (tweet.viewCount || 0), 0),
          tweetsWithImages: tweets.filter(tweet => tweet.imageUrls && tweet.imageUrls.length > 0).length,
          uniqueUsers: new Set(tweets.map(tweet => tweet.userUsername)).size,
                     dateRange: tweets.length > 0 ? {
             earliest: Math.min(...tweets.map((tweet: any) => tweet.publishedAt)),
             latest: Math.max(...tweets.map((tweet: any) => tweet.publishedAt)),
           } : null,
                     topUsers: getTopUsers(tweets, 5),
        };

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        throw new Error("获取统计信息失败");
      }
    }),

  /**
   * 删除推文数据
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "推文ID不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await storageService.deleteTweet(input.id);
        
        return {
          success: true,
          message: "推文删除成功",
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "删除推文失败"
        );
      }
    }),

  /**
   * 批量删除推文数据
   */
  batchDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1, "推文ID列表不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const deletedCount = await storageService.batchDeleteTweets(input.ids);
        
        return {
          success: true,
          message: `成功删除 ${deletedCount} 条推文`,
          data: {
            deletedCount,
          },
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "批量删除推文失败"
        );
      }
    }),

  /**
   * 搜索推文
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "搜索关键词不能为空"),
        taskId: z.string().optional(),
        listId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        // 获取数据并进行客户端搜索
        // 这里可以优化为数据库级别的搜索
        const result = await storageService.getTweets(
          input.taskId,
          input.listId,
          1,
          10000 // 获取更多数据进行搜索
        );

        const filteredTweets = result.tweets.filter(tweet =>
          tweet.content.toLowerCase().includes(input.query.toLowerCase()) ||
          tweet.userNickname.toLowerCase().includes(input.query.toLowerCase()) ||
          tweet.userUsername.toLowerCase().includes(input.query.toLowerCase())
        );

        // 手动分页
        const startIndex = (input.page - 1) * input.limit;
        const endIndex = startIndex + input.limit;
        const paginatedTweets = filteredTweets.slice(startIndex, endIndex);

        return {
          success: true,
          data: {
            tweets: paginatedTweets,
            total: filteredTweets.length,
            page: input.page,
            limit: input.limit,
          },
        };
      } catch (error) {
        throw new Error("搜索推文失败");
      }
    }),

  /**
   * 获取热门推文（按点赞数排序）
   */
  getTrending: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        listId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
        sortBy: z.enum(['likes', 'retweets', 'replies', 'views']).default('likes'),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTweets(
          input.taskId,
          input.listId,
          1,
          1000
        );

        // 根据指定字段排序
        const sortField = {
          likes: 'likeCount',
          retweets: 'retweetCount',
          replies: 'replyCount',
          views: 'viewCount',
        }[input.sortBy];

                 const sortedTweets = result.tweets
           .sort((a: any, b: any) => (b as any)[sortField] - (a as any)[sortField])
           .slice(0, input.limit);

        return {
          success: true,
          data: {
            tweets: sortedTweets,
            sortBy: input.sortBy,
          },
        };
      } catch (error) {
        throw new Error("获取热门推文失败");
      }
    }),

  /**
   * 获取用户排行榜
   */
  getUserRanking: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        listId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getTweets(
          input.taskId,
          input.listId,
          1,
          10000
        );

                 const userStats = getUserStats(result.tweets);
         const topUsers = userStats
           .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement)
           .slice(0, input.limit);

        return {
          success: true,
          data: topUsers,
        };
      } catch (error) {
        throw new Error("获取用户排行榜失败");
      }
    }),

});

// 辅助函数：获取热门用户
function getTopUsers(tweets: any[], limit: number) {
  const userStats = getUserStats(tweets);
  return userStats
    .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement)
    .slice(0, limit);
}

// 辅助函数：计算用户统计
function getUserStats(tweets: any[]) {
  const userMap = new Map();

  tweets.forEach((tweet: any) => {
    const username = tweet.userUsername;
    if (!userMap.has(username)) {
      userMap.set(username, {
        username,
        nickname: tweet.userNickname,
        tweetCount: 0,
        totalLikes: 0,
        totalRetweets: 0,
        totalReplies: 0,
        totalViews: 0,
        totalEngagement: 0,
      });
    }

    const userStat = userMap.get(username);
    if (userStat) {
      userStat.tweetCount++;
      userStat.totalLikes += tweet.likeCount || 0;
      userStat.totalRetweets += tweet.retweetCount || 0;
      userStat.totalReplies += tweet.replyCount || 0;
      userStat.totalViews += tweet.viewCount || 0;
      userStat.totalEngagement = userStat.totalLikes + userStat.totalRetweets + userStat.totalReplies;
    }
  });

  return Array.from(userMap.values());
} 