import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const contentPlatformsRouter = createTRPCRouter({
  // 获取所有内容平台
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.contentPlatform.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ],
    });
  }),

  // 获取单个内容平台
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contentPlatform.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建内容平台
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "平台名称不能为空"),
      platformId: z.string().min(1, "平台ID不能为空").regex(/^[a-zA-Z0-9_-]+$/, "平台ID只能包含字母、数字、下划线和短横线"),
      description: z.string().optional(),
      wordCount: z.string().optional(),
      isDefault: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contentPlatform.create({
        data: {
          name: input.name,
          platformId: input.platformId,
          description: input.description,
          wordCount: input.wordCount,
          isDefault: input.isDefault,
        },
      });
    }),

  // 更新内容平台
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "平台名称不能为空").optional(),
      platformId: z.string().min(1, "平台ID不能为空").regex(/^[a-zA-Z0-9_-]+$/, "平台ID只能包含字母、数字、下划线和短横线").optional(),
      description: z.string().optional(),
      wordCount: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return ctx.db.contentPlatform.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除内容平台
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contentPlatform.delete({
        where: { id: input.id },
      });
    }),

  // 设置默认平台
  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 先清除所有默认项
      await ctx.db.contentPlatform.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // 设置新的默认项
      return ctx.db.contentPlatform.update({
        where: { id: input.id },
        data: { isDefault: true },
      });
    }),

  // 初始化默认数据
  initDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existingDefault = await ctx.db.contentPlatform.findFirst({
      where: { isDefault: true },
    });

    if (!existingDefault) {
      return ctx.db.contentPlatform.create({
        data: {
          name: "默认平台",
          platformId: "default",
          description: "系统默认内容平台",
          isDefault: true,
        },
      });
    }

    return existingDefault;
  }),
});