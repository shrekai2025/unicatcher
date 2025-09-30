/**
 * 写作分析推文API路由
 * 提供推文查询和管理功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { StorageService } from "~/server/core/data/storage";

const storageService = new StorageService();

export const extractsRouter = createTRPCRouter({
  /**
   * 获取提取到的推文数据 (分页)
   */
  getExtractedTweets: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        batchId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getExtractedTweets(
          input.page,
          input.limit,
          input.batchId
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取提取推文失败");
      }
    }),

  /**
   * 删除提取到的推文
   */
  deleteTweet: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "推文ID不能为空"),
        deletedBy: z.string().min(1, "删除者不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await storageService.markTweetAsDeleted(input.id, input.deletedBy);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('删除推文失败:', error);
        throw new Error(`删除推文失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }),

});