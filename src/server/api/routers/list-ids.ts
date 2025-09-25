/**
 * List ID 管理API路由
 * 提供List ID记录的创建、查询、更新、删除功能
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const listIdsRouter = createTRPCRouter({
  /**
   * 获取所有List ID记录
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const records = await ctx.db.listIdRecord.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : "获取List ID记录失败",
      });
    }
  }),

  /**
   * 根据ID获取单个List ID记录
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "ID不能为空"),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const record = await ctx.db.listIdRecord.findUnique({
          where: {
            id: input.id,
          },
        });

        if (!record) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "未找到指定的List ID记录",
          });
        }

        return {
          success: true,
          data: record,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "获取List ID记录失败",
        });
      }
    }),

  /**
   * 创建新的List ID记录
   */
  create: protectedProcedure
    .input(z.object({
      listId: z.string().min(1, "List ID不能为空").regex(/^\d+$/, "List ID必须是纯数字"),
      name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查是否已存在相同的listId
        const existing = await ctx.db.listIdRecord.findUnique({
          where: {
            listId: input.listId,
          },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: "该List ID已存在，请使用不同的List ID",
          });
        }

        const record = await ctx.db.listIdRecord.create({
          data: {
            listId: input.listId,
            name: input.name.trim(),
          },
        });

        return {
          success: true,
          message: "List ID记录创建成功",
          data: record,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "创建List ID记录失败",
        });
      }
    }),

  /**
   * 更新List ID记录
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "ID不能为空"),
      data: z.object({
        listId: z.string().min(1, "List ID不能为空").regex(/^\d+$/, "List ID必须是纯数字").optional(),
        name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符").optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查记录是否存在
        const existing = await ctx.db.listIdRecord.findUnique({
          where: {
            id: input.id,
          },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "未找到指定的List ID记录",
          });
        }

        // 如果要更新listId，检查是否与其他记录重复
        if (input.data.listId && input.data.listId !== existing.listId) {
          const duplicate = await ctx.db.listIdRecord.findUnique({
            where: {
              listId: input.data.listId,
            },
          });

          if (duplicate) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: "该List ID已存在，请使用不同的List ID",
            });
          }
        }

        const updateData: any = {};
        if (input.data.listId) {
          updateData.listId = input.data.listId;
        }
        if (input.data.name) {
          updateData.name = input.data.name.trim();
        }

        const record = await ctx.db.listIdRecord.update({
          where: {
            id: input.id,
          },
          data: updateData,
        });

        return {
          success: true,
          message: "List ID记录更新成功",
          data: record,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "更新List ID记录失败",
        });
      }
    }),

  /**
   * 删除List ID记录
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "ID不能为空"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查记录是否存在
        const existing = await ctx.db.listIdRecord.findUnique({
          where: {
            id: input.id,
          },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "未找到指定的List ID记录",
          });
        }

        await ctx.db.listIdRecord.delete({
          where: {
            id: input.id,
          },
        });

        return {
          success: true,
          message: "List ID记录删除成功",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "删除List ID记录失败",
        });
      }
    }),

  /**
   * 批量删除List ID记录
   */
  deleteMany: protectedProcedure
    .input(z.object({
      ids: z.array(z.string().min(1, "ID不能为空")).min(1, "至少选择一个记录"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.listIdRecord.deleteMany({
          where: {
            id: {
              in: input.ids,
            },
          },
        });

        return {
          success: true,
          message: `成功删除 ${result.count} 条List ID记录`,
          deletedCount: result.count,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "批量删除List ID记录失败",
        });
      }
    }),

  /**
   * 根据listId搜索记录（支持模糊搜索）
   */
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1, "搜索关键词不能为空"),
      limit: z.number().int().min(1).max(100).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const records = await ctx.db.listIdRecord.findMany({
          where: {
            OR: [
              {
                listId: {
                  contains: input.query,
                },
              },
              {
                name: {
                  contains: input.query,
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: input.limit,
        });

        return {
          success: true,
          data: records,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : "搜索List ID记录失败",
        });
      }
    }),
});
