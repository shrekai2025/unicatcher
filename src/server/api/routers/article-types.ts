import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const articleTypesRouter = createTRPCRouter({
  // 获取所有文章类型
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.articleType.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ],
    });
  }),

  // 获取单个文章类型
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.articleType.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建文章类型
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "类型名称不能为空"),
      typeId: z.string().min(1, "类型ID不能为空").regex(/^[a-zA-Z0-9_-]+$/, "类型ID只能包含字母、数字、下划线和短横线"),
      description: z.string().optional(),
      isDefault: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.articleType.create({
        data: {
          name: input.name,
          typeId: input.typeId,
          description: input.description,
          isDefault: input.isDefault,
        },
      });
    }),

  // 更新文章类型
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "类型名称不能为空").optional(),
      typeId: z.string().min(1, "类型ID不能为空").regex(/^[a-zA-Z0-9_-]+$/, "类型ID只能包含字母、数字、下划线和短横线").optional(),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return ctx.db.articleType.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除文章类型
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.articleType.delete({
        where: { id: input.id },
      });
    }),

  // 设置默认类型
  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 先清除所有默认项
      await ctx.db.articleType.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // 设置新的默认项
      return ctx.db.articleType.update({
        where: { id: input.id },
        data: { isDefault: true },
      });
    }),

  // 初始化默认数据
  initDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existingDefault = await ctx.db.articleType.findFirst({
      where: { isDefault: true },
    });

    if (!existingDefault) {
      return ctx.db.articleType.create({
        data: {
          name: "默认类型",
          typeId: "default",
          description: "系统默认文章类型",
          isDefault: true,
        },
      });
    }

    return existingDefault;
  }),
});