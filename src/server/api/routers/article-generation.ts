import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { AIServiceFactory } from "~/server/core/ai/ai-factory";

export const articleGenerationRouter = createTRPCRouter({
  // 创建生成任务
  createTask: publicProcedure
    .input(z.object({
      topic: z.string().min(1, "内容主题不能为空"),
      platformId: z.string().min(1, "请选择内容平台"),
      enableReferenceArticles: z.boolean().default(false),
      referenceFilters: z.object({
        platformId: z.string().optional(),
        typeId: z.string().optional(),
      }).optional(),
      referenceArticleCount: z.number().min(1).max(10).default(3),
      enableContentStructure: z.boolean().default(false),
      structureFilters: z.object({
        platformId: z.string().optional(),
        typeId: z.string().optional(),
      }).optional(),
      additionalRequirements: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. 获取参考文章（如果启用）
      let referenceArticleIds: string[] = [];
      if (input.enableReferenceArticles) {
        const referenceArticles = await ctx.db.collectedArticle.findMany({
          where: {
            ...(input.referenceFilters?.platformId && {
              platforms: {
                some: { platformId: input.referenceFilters.platformId }
              }
            }),
            ...(input.referenceFilters?.typeId && {
              articleTypes: {
                some: { typeId: input.referenceFilters.typeId }
              }
            }),
          },
          take: input.referenceArticleCount,
          orderBy: { collectedAt: 'desc' },
          select: { id: true },
        });

        referenceArticleIds = referenceArticles.map(article => article.id);
      }

      // 2. 获取内容结构（如果启用）
      let contentStructureId: string | null = null;
      if (input.enableContentStructure) {
        const contentStructure = await ctx.db.contentStructure.findFirst({
          where: {
            ...(input.structureFilters?.platformId && { platformId: input.structureFilters.platformId }),
            ...(input.structureFilters?.typeId && { typeId: input.structureFilters.typeId }),
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        contentStructureId = contentStructure?.id || null;
      }

      // 3. 创建任务记录
      const task = await ctx.db.articleGenerationTask.create({
        data: {
          topic: input.topic,
          platformId: input.platformId,
          referenceArticleIds: referenceArticleIds.length > 0 ? JSON.stringify(referenceArticleIds) : null,
          referenceArticleCount: referenceArticleIds.length,
          additionalRequirements: input.additionalRequirements,
          useContentStructure: input.enableContentStructure,
          contentStructureId,
          status: "pending",
        },
        include: {
          platform: true,
        },
      });

      // 4. 异步处理文章生成
      processArticleGeneration(task.id).catch(console.error);

      return task;
    }),

  // 获取任务状态
  getTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.articleGenerationTask.findUnique({
        where: { id: input.taskId },
        include: {
          platform: true,
          result: true,
        },
      });

      if (!task) {
        throw new Error("任务不存在");
      }

      return task;
    }),

  // 获取任务历史
  getTaskHistory: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const [tasks, total] = await Promise.all([
        ctx.db.articleGenerationTask.findMany({
          include: {
            platform: true,
            result: true,
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.articleGenerationTask.count(),
      ]);

      return {
        tasks,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // 删除任务
  deleteTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.articleGenerationTask.delete({
        where: { id: input.taskId },
      });

      return { success: true };
    }),

  // 获取参考文章预览
  getReferenceArticles: publicProcedure
    .input(z.object({
      platformId: z.string().optional(),
      typeId: z.string().optional(),
      count: z.number().min(1).max(10).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const articles = await ctx.db.collectedArticle.findMany({
        where: {
          ...(input.platformId && {
            platforms: {
              some: { platformId: input.platformId }
            }
          }),
          ...(input.typeId && {
            articleTypes: {
              some: { typeId: input.typeId }
            }
          }),
        },
        include: {
          platforms: {
            include: { platform: true }
          },
          articleTypes: {
            include: { articleType: true }
          },
        },
        take: input.count,
        orderBy: { collectedAt: 'desc' },
      });

      return articles;
    }),
});

// 异步处理文章生成的函数
async function processArticleGeneration(taskId: string) {
  const db = (await import("~/server/db")).db;

  try {
    // 更新任务状态为处理中
    await db.articleGenerationTask.update({
      where: { id: taskId },
      data: { status: "processing" },
    });

    // 获取任务详情
    const task = await db.articleGenerationTask.findUnique({
      where: { id: taskId },
      include: {
        platform: true,
      },
    });

    if (!task) {
      throw new Error("任务不存在");
    }

    // 构建AI提示词
    let prompt = `请根据以下要求撰写文章：

主题：${task.topic}
平台：${task.platform.name}`;

    // 添加字数要求
    if (task.platform.wordCount) {
      prompt += `\n字数要求：${task.platform.wordCount}`;
    }

    // 添加参考文章
    if (task.referenceArticleIds) {
      const referenceIds: string[] = JSON.parse(task.referenceArticleIds);
      const referenceArticles = await db.collectedArticle.findMany({
        where: { id: { in: referenceIds } },
        select: { title: true, content: true, author: true },
      });

      if (referenceArticles.length > 0) {
        prompt += `\n\n参考文章（请参考其行文方式，但不要引入与主题无关的信息）：`;
        referenceArticles.forEach((article, index) => {
          prompt += `\n\n参考文章${index + 1}：
标题：${article.title}
作者：${article.author}
内容：${article.content || "（无正文内容）"}`;
        });
      }
    }

    // 添加内容结构
    if (task.useContentStructure && task.contentStructureId) {
      const contentStructure = await db.contentStructure.findUnique({
        where: { id: task.contentStructureId },
      });

      if (contentStructure) {
        prompt += `\n\n请参考以下内容结构（此结构占决策比重50%，可根据实际情况灵活调整）：
结构标题：${contentStructure.title}
结构内容：${contentStructure.content}`;
      }
    }

    // 添加附加要求
    if (task.additionalRequirements) {
      prompt += `\n\n附加要求：${task.additionalRequirements}`;
    }

    prompt += `\n\n请直接输出文章内容，不需要额外的说明或格式标记。`;

    // 调用AI服务生成文章
    const aiConfig = {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o',
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    };

    const aiService = AIServiceFactory.createService(aiConfig);
    const generatedContent = await aiService.generateText(prompt);

    // 计算字数
    const wordCount = generatedContent.length;

    // 保存生成结果
    await db.articleGenerationResult.create({
      data: {
        taskId: task.id,
        generatedContent,
        wordCount,
        aiProvider: aiConfig.provider,
        aiModel: aiConfig.model,
      },
    });

    // 更新任务状态为完成
    await db.articleGenerationTask.update({
      where: { id: taskId },
      data: { status: "completed" },
    });

  } catch (error) {
    console.error(`文章生成失败 (任务ID: ${taskId}):`, error);

    // 更新任务状态为失败
    await db.articleGenerationTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      },
    });
  }
}