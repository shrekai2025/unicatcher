import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const collectedArticlesRouter = createTRPCRouter({
  // 获取采集文章列表 (支持筛选)
  getAll: protectedProcedure
    .input(z.object({
      // 筛选条件
      platformIds: z.array(z.string()).optional(),
      articleTypeIds: z.array(z.string()).optional(),
      startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
      endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
      author: z.string().optional(),
      title: z.string().optional(),

      // 分页
      page: z.number().min(1).optional().default(1),
      pageSize: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {};

      // 构建筛选条件
      if (input.platformIds && input.platformIds.length > 0) {
        where.platforms = {
          some: {
            platformId: {
              in: input.platformIds,
            },
          },
        };
      }

      if (input.articleTypeIds && input.articleTypeIds.length > 0) {
        where.articleTypes = {
          some: {
            typeId: {
              in: input.articleTypeIds,
            },
          },
        };
      }

      if (input.startDate || input.endDate) {
        where.collectedAt = {};
        if (input.startDate) {
          where.collectedAt.gte = input.startDate;
        }
        if (input.endDate) {
          where.collectedAt.lte = input.endDate;
        }
      }

      if (input.author) {
        where.author = {
          contains: input.author,
        };
      }

      if (input.title) {
        where.title = {
          contains: input.title,
        };
      }

      const [articles, total] = await Promise.all([
        ctx.db.collectedArticle.findMany({
          where,
          include: {
            platforms: {
              include: {
                platform: true,
              },
            },
            articleTypes: {
              include: {
                articleType: true,
              },
            },
          },
          orderBy: { collectedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.collectedArticle.count({ where }),
      ]);

      return {
        articles,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // 获取单个采集文章
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.collectedArticle.findUnique({
        where: { id: input.id },
        include: {
          platforms: {
            include: {
              platform: true,
            },
          },
          articleTypes: {
            include: {
              articleType: true,
            },
          },
        },
      });
    }),

  // 创建采集文章
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1, "标题不能为空"),
      author: z.string().min(1, "作者不能为空"),
      content: z.string().optional(),
      platformIds: z.array(z.string()).min(1, "请至少选择一个平台"),
      articleTypeIds: z.array(z.string()).min(1, "请至少选择一个类型"),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.collectedArticle.create({
        data: {
          title: input.title,
          author: input.author,
          platforms: {
            create: input.platformIds.map(platformId => ({
              platformId,
            })),
          },
          articleTypes: {
            create: input.articleTypeIds.map(typeId => ({
              typeId,
            })),
          },
        },
        include: {
          platforms: {
            include: {
              platform: true,
            },
          },
          articleTypes: {
            include: {
              articleType: true,
            },
          },
        },
      });
    }),

  // 更新采集文章
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1, "标题不能为空").optional(),
      author: z.string().min(1, "作者不能为空").optional(),
      content: z.string().optional(),
      platformIds: z.array(z.string()).optional(),
      articleTypeIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, platformIds, articleTypeIds, ...updateData } = input;

      // 更新基本信息
      const updateOperations: any = {
        where: { id },
        data: updateData,
      };

      // 如果提供了平台ID，更新平台关联
      if (platformIds) {
        // 先删除现有关联
        await ctx.db.collectedArticlePlatform.deleteMany({
          where: { articleId: id },
        });

        // 创建新关联
        updateOperations.data.platforms = {
          create: platformIds.map(platformId => ({
            platformId,
          })),
        };
      }

      // 如果提供了类型ID，更新类型关联
      if (articleTypeIds) {
        // 先删除现有关联
        await ctx.db.collectedArticleType.deleteMany({
          where: { articleId: id },
        });

        // 创建新关联
        updateOperations.data.articleTypes = {
          create: articleTypeIds.map(typeId => ({
            typeId,
          })),
        };
      }

      updateOperations.include = {
        platforms: {
          include: {
            platform: true,
          },
        },
        articleTypes: {
          include: {
            articleType: true,
          },
        },
      };

      return ctx.db.collectedArticle.update(updateOperations);
    }),

  // 删除采集文章
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.collectedArticle.delete({
        where: { id: input.id },
      });
    }),

  // 获取统计数据
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalArticles,
      totalPlatforms,
      totalTypes,
      recentArticles,
    ] = await Promise.all([
      ctx.db.collectedArticle.count(),
      ctx.db.contentPlatform.count(),
      ctx.db.articleType.count(),
      ctx.db.collectedArticle.count({
        where: {
          collectedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
          },
        },
      }),
    ]);

    return {
      totalArticles,
      totalPlatforms,
      totalTypes,
      recentArticles,
    };
  }),
});