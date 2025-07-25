/**
 * 数据提取记录API路由
 * 提供提取记录的查询功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { StorageService } from "~/server/core/data/storage";

const storageService = new StorageService();

export const extractsRouter = createTRPCRouter({
  /**
   * 获取数据提取记录列表
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await storageService.getExtractRecords(
          input.page,
          input.limit
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new Error("获取提取记录失败");
      }
    }),

  /**
   * 获取提取记录统计信息
   */
  getStats: protectedProcedure
    .query(async () => {
      try {
        // 获取提取记录的统计信息
        const result = await storageService.getExtractRecords(1, 1000); // 获取大量数据进行统计
        
        const records = result.records;
        
        const stats = {
          totalExtracts: records.length,
          totalTweetsExtracted: records.reduce((sum, record) => sum + record.tweetCount, 0),
          successfulExtracts: records.filter(record => record.status === 'synced').length,
          failedExtracts: records.filter(record => record.status === 'failed').length,
          reExtracts: records.filter(record => record.isReExtract).length,
          uniqueBatches: new Set(records.map(record => record.batchId)).size,
          dateRange: records.length > 0 ? {
            earliest: new Date(Math.min(...records.map(record => new Date(record.createdAt).getTime()))),
            latest: new Date(Math.max(...records.map(record => new Date(record.createdAt).getTime()))),
          } : null,
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
   * 根据批次ID获取提取记录详情
   */
  getByBatchId: protectedProcedure
    .input(
      z.object({
        batchId: z.string().min(1, "批次ID不能为空"),
      })
    )
    .query(async ({ input }) => {
      try {
        // 这里需要在StorageService中添加根据batchId查询的方法
        // 暂时返回空结果
        return {
          success: true,
          data: null,
          message: "需要实现getExtractRecordByBatchId方法"
        };
      } catch (error) {
        throw new Error("获取提取记录详情失败");
      }
    }),
}); 