import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const contentStructuresRouter = createTRPCRouter({
  // 获取所有内容结构
  getAll: publicProcedure
    .input(z.object({
      platformId: z.string().optional(),
      typeId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const structures = await ctx.db.contentStructure.findMany({
        where: {
          ...(input?.platformId && { platformId: input.platformId }),
          ...(input?.typeId && { typeId: input.typeId }),
        },
        include: {
          platform: true,
          articleType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return structures;
    }),

  // 获取单个内容结构
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const structure = await ctx.db.contentStructure.findUnique({
        where: { id: input.id },
        include: {
          platform: true,
          articleType: true,
        },
      });

      if (!structure) {
        throw new Error("内容结构不存在");
      }

      return structure;
    }),

  // 创建内容结构
  create: publicProcedure
    .input(z.object({
      title: z.string().min(1, "标题不能为空"),
      content: z.string().min(1, "内容不能为空"),
      platformId: z.string().min(1, "请选择内容平台"),
      typeId: z.string().min(1, "请选择文章类型"),
    }))
    .mutation(async ({ ctx, input }) => {
      const structure = await ctx.db.contentStructure.create({
        data: {
          title: input.title,
          content: input.content,
          platformId: input.platformId,
          typeId: input.typeId,
        },
        include: {
          platform: true,
          articleType: true,
        },
      });

      return structure;
    }),

  // 更新内容结构
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1, "标题不能为空"),
      content: z.string().min(1, "内容不能为空"),
      platformId: z.string().min(1, "请选择内容平台"),
      typeId: z.string().min(1, "请选择文章类型"),
    }))
    .mutation(async ({ ctx, input }) => {
      const structure = await ctx.db.contentStructure.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
          platformId: input.platformId,
          typeId: input.typeId,
        },
        include: {
          platform: true,
          articleType: true,
        },
      });

      return structure;
    }),

  // 删除内容结构
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.contentStructure.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // 获取最新的内容结构（按平台和类型筛选）
  getLatest: publicProcedure
    .input(z.object({
      platformId: z.string().optional(),
      typeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const structure = await ctx.db.contentStructure.findFirst({
        where: {
          ...(input.platformId && { platformId: input.platformId }),
          ...(input.typeId && { typeId: input.typeId }),
        },
        include: {
          platform: true,
          articleType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return structure;
    }),
});