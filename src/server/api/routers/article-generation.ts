import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AIServiceFactory } from "~/server/core/ai/ai-factory";
import { AIConfigLoader } from "~/server/core/ai/config-loader";
import { TWEET_TYPES } from "~/server/services/tweet-analysis";
import { feedbackAdjustmentService } from "~/server/services/feedback-adjustment-service";

export const articleGenerationRouter = createTRPCRouter({
  // 创建生成任务
  createTask: publicProcedure
    .input(z.object({
      topic: z.string().min(1, "内容主题不能为空"),
      platformId: z.string().min(1, "请选择内容平台"),
      username: z.string().optional(), // 用户名，用于获取个性化风格
      contentType: z.string().optional(), // 内容类型，如"科普"、"观点表达"等
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
      aiProvider: z.string().min(1, "请选择AI供应商"),
      aiModel: z.string().min(1, "请选择模型"),
      systemPrompt: z.string().optional(),
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
          username: input.username || null, // 保存用户名用于个性化
          contentType: input.contentType || null, // 保存内容类型
          referenceArticleIds: referenceArticleIds.length > 0 ? JSON.stringify(referenceArticleIds) : null,
          referenceArticleCount: referenceArticleIds.length,
          additionalRequirements: input.additionalRequirements,
          useContentStructure: input.enableContentStructure,
          contentStructureId,
          aiProvider: input.aiProvider,
          aiModel: input.aiModel,
          aiBaseURL: null,
          status: "pending",
        },
        include: {
          platform: true,
        },
      });

      // 4. 异步处理文章生成
      processArticleGeneration(task.id, input.aiProvider, input.aiModel, input.systemPrompt).catch(console.error);

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

  // 获取可用的内容类型
  getContentTypes: publicProcedure
    .query(async () => {
      return Object.entries(TWEET_TYPES).map(([type, config]) => ({
        value: type,
        label: type,
        category: config.category,
        description: config.patterns.join('，'),
        tone: config.tone
      }));
    }),

  // 获取用户在特定内容类型下的写作样本数量
  getUserTypeStats: publicProcedure
    .input(z.object({
      username: z.string().min(1, "用户名不能为空"),
    }))
    .query(async ({ ctx, input }) => {
      // 获取用户的类型标注数据
      const typeAnnotations = await ctx.db.tweetTypeAnnotation.findMany({
        where: { username: input.username },
        include: { tweet: { select: { content: true } } }
      });

      // 按类型统计
      const typeStats: Record<string, { count: number; samples: string[] }> = {};

      typeAnnotations.forEach(annotation => {
        try {
          const types = JSON.parse(annotation.tweetTypes);
          const primaryType = types[0] || 'unknown'; // 取第一个类型作为主要类型

          if (!typeStats[primaryType]) {
            typeStats[primaryType] = { count: 0, samples: [] };
          }
          typeStats[primaryType].count++;
          if (typeStats[primaryType].samples.length < 3) {
            typeStats[primaryType].samples.push(
              annotation.tweet.content.substring(0, 50) + (annotation.tweet.content.length > 50 ? '...' : '')
            );
          }
        } catch (e) {
          console.warn('解析推文类型失败:', e);
        }
      });

      return {
        username: input.username,
        totalAnnotated: typeAnnotations.length,
        typeStats,
        availableTypes: Object.keys(typeStats)
      };
    }),

  // 提交用户反馈
  submitFeedback: publicProcedure
    .input(z.object({
      taskId: z.string().min(1, "任务ID不能为空"),
      userId: z.string().min(1, "用户ID不能为空"),
      rating: z.number().int().min(1).max(5),
      feedback: z.string().min(1, "反馈内容不能为空"),
      feedbackTags: z.array(z.string()).default([]),
      contentType: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 验证任务存在性
        const task = await ctx.db.articleGenerationTask.findUnique({
          where: { id: input.taskId }
        });

        if (!task) {
          throw new Error("任务不存在");
        }

        // 提交反馈到处理服务
        await feedbackAdjustmentService.submitFeedback({
          taskId: input.taskId,
          userId: input.userId,
          rating: input.rating,
          feedback: input.feedback,
          feedbackTags: input.feedbackTags,
          contentType: input.contentType || task.contentType || '通用',
          timestamp: new Date()
        });

        return {
          success: true,
          message: "反馈提交成功，系统将根据您的反馈优化写作风格"
        };
      } catch (error) {
        console.error('提交反馈失败:', error);
        throw new Error(error instanceof Error ? error.message : "反馈提交失败");
      }
    }),

  // 获取用户反馈状态
  getFeedbackStatus: publicProcedure
    .input(z.object({
      userId: z.string().min(1, "用户ID不能为空"),
      contentType: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const status = await feedbackAdjustmentService.getFeedbackStatus(
          input.userId,
          input.contentType
        );

        return {
          success: true,
          data: status
        };
      } catch (error) {
        console.error('获取反馈状态失败:', error);
        throw new Error(error instanceof Error ? error.message : "获取反馈状态失败");
      }
    }),

});

// 异步处理文章生成的函数（三阶段版本）
async function processArticleGeneration(taskId: string, aiProvider: string, aiModel: string, systemPrompt?: string) {
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

    // 使用三阶段生成流程
    await processThreeStageGeneration(task, aiProvider, aiModel, systemPrompt);

  } catch (error) {
    console.error(`文章生成失败 (任务ID: ${taskId}):`, error);
    await db.articleGenerationTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      },
    });
  }
}

// 三阶段生成主流程
async function processThreeStageGeneration(
  task: any,
  aiProvider: string,
  aiModel: string,
  systemPrompt?: string
): Promise<void> {
  const db = (await import("~/server/db")).db;
  const startTime = Date.now();

  try {
    // 首先检查并锁定任务状态，防止并发处理
    const currentTask = await db.articleGenerationTask.findUnique({
      where: { id: task.id },
      select: { status: true }
    });

    if (!currentTask) {
      throw new Error('任务不存在');
    }

    if (currentTask.status === "processing") {
      console.warn(`[${task.id}] 任务已在处理中，跳过重复处理`);
      return;
    }

    if (currentTask.status === "completed") {
      console.warn(`[${task.id}] 任务已完成，跳过重复处理`);
      return;
    }

    // 锁定任务状态为processing
    await db.articleGenerationTask.update({
      where: { id: task.id },
      data: { status: "processing" }
    });

    console.log(`[${task.id}] 开始三阶段生成流程...`);
    console.log(`[${task.id}] 任务配置: 主题="${task.topic}", 类型="${task.contentType}", 平台="${task.platform.name}"`);

    // 阶段1：大纲生成 (带重试机制)
    console.log(`[${task.id}] === 阶段1：生成大纲 ===`);
    let outline = '';
    let outlineAttempts = 0;
    const maxOutlineAttempts = 3;

    while (outlineAttempts < maxOutlineAttempts) {
      try {
        outlineAttempts++;
        console.log(`[${task.id}] 大纲生成尝试 ${outlineAttempts}/${maxOutlineAttempts}`);

        outline = await generateOutline(task);

        if (outline.length < 50) {
          throw new Error('生成的大纲过短，可能不完整');
        }

        console.log(`[${task.id}] 大纲生成成功`);
        break;
      } catch (error) {
        console.error(`[${task.id}] 大纲生成失败 (尝试 ${outlineAttempts}):`, error);
        if (outlineAttempts >= maxOutlineAttempts) {
          throw new Error(`大纲生成失败，已尝试 ${maxOutlineAttempts} 次: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * outlineAttempts)); // 递增延迟
      }
    }

    await saveGenerationStage(task.id, {
      stage: 'outline',
      content: outline,
      aiProvider,
      aiModel
    });

    // 阶段2：初稿扩展 (带重试机制)
    console.log(`[${task.id}] === 阶段2：基于大纲生成初稿 ===`);
    let draft = '';
    let draftAttempts = 0;
    const maxDraftAttempts = 2;

    while (draftAttempts < maxDraftAttempts) {
      try {
        draftAttempts++;
        console.log(`[${task.id}] 初稿生成尝试 ${draftAttempts}/${maxDraftAttempts}`);

        draft = await generateDraft(outline, task);

        if (draft.length < 200) {
          throw new Error('生成的初稿过短，可能不完整');
        }

        console.log(`[${task.id}] 初稿生成成功`);
        break;
      } catch (error) {
        console.error(`[${task.id}] 初稿生成失败 (尝试 ${draftAttempts}):`, error);
        if (draftAttempts >= maxDraftAttempts) {
          throw new Error(`初稿生成失败，已尝试 ${maxDraftAttempts} 次: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * draftAttempts)); // 递增延迟
      }
    }

    await saveGenerationStage(task.id, {
      stage: 'draft',
      content: draft,
      aiProvider,
      aiModel
    });

    // 阶段3：自查优化 (带重试机制)
    console.log(`[${task.id}] === 阶段3：进行自查优化 ===`);
    let finalContent = '';
    let reviewNotes = '';
    let optimizeAttempts = 0;
    const maxOptimizeAttempts = 2;

    while (optimizeAttempts < maxOptimizeAttempts) {
      try {
        optimizeAttempts++;
        console.log(`[${task.id}] 自查优化尝试 ${optimizeAttempts}/${maxOptimizeAttempts}`);

        const result = await selfReviewAndOptimize(draft, task);
        finalContent = result.content;
        reviewNotes = result.reviewNotes;

        if (finalContent.length < 100) {
          throw new Error('优化后的内容过短，可能不完整');
        }

        console.log(`[${task.id}] 自查优化成功`);
        break;
      } catch (error) {
        console.error(`[${task.id}] 自查优化失败 (尝试 ${optimizeAttempts}):`, error);
        if (optimizeAttempts >= maxOptimizeAttempts) {
          console.warn(`[${task.id}] 自查优化失败，使用原始初稿作为最终内容`);
          finalContent = draft;
          reviewNotes = `自查优化失败，返回原始初稿。错误: ${error instanceof Error ? error.message : '未知错误'}`;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * optimizeAttempts)); // 递增延迟
      }
    }

    await saveGenerationStage(task.id, {
      stage: 'final',
      content: finalContent,
      reviewNotes,
      aiProvider,
      aiModel
    });

    // 更新任务状态为完成
    await db.articleGenerationTask.update({
      where: { id: task.id },
      data: {
        status: "completed"
      },
    });

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[${task.id}] ✅ 三阶段生成完成！总耗时: ${totalTime.toFixed(1)}秒`);
    console.log(`[${task.id}] 最终内容长度: ${finalContent.length} 字符`);

  } catch (error) {
    console.error(`[${task.id}] ❌ 三阶段生成失败:`, error);

    // 更新任务状态为失败
    await db.articleGenerationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      },
    });

    throw error;
  }
}

// 三阶段生成的具体实现函数

// 阶段1: 大纲生成
async function generateOutline(task: any): Promise<string> {
  const { ContentTypeOutlineGenerator, OutlineValidator } = await import('~/server/services/content-type-outline-generator');

  const generator = new ContentTypeOutlineGenerator();
  const validator = new OutlineValidator();

  // 扩展task对象，添加参考文章和内容结构信息
  const enhancedTask = await enhanceTaskWithReferences(task);

  // 生成大纲
  let outline = await generator.generateOutline(enhancedTask);

  // 验证大纲质量
  if (task.contentType) {
    const validation = validator.validateOutline(outline, task.contentType);

    if (!validation.isValid && validation.warnings.length > 0) {
      console.log(`大纲验证警告: ${validation.warnings.join(', ')}`);

      // 如果有严重问题，尝试重新生成，最多重试2次
      let retryCount = 0;
      while (!validation.isValid && validation.warnings.length >= 2 && retryCount < 2) {
        console.log(`尝试重新生成大纲... (第${retryCount + 1}次重试)`);
        outline = await generator.generateOutline(enhancedTask);

        const newValidation = validator.validateOutline(outline, task.contentType);
        if (newValidation.isValid || newValidation.warnings.length < validation.warnings.length) {
          break;
        }
        retryCount++;
      }
    }
  }

  console.log(`大纲生成完成，长度: ${outline.length} 字符`);
  return outline;
}

// 增强任务对象，添加参考文章和内容结构信息
async function enhanceTaskWithReferences(task: any): Promise<any> {
  const enhancedTask = { ...task };

  // 添加参考文章内容
  if (task.referenceArticleIds) {
    try {
      const referenceIds = task.referenceArticleIds.split(',').map((id: string) => id.trim());
      const referenceArticles = await db.collectedArticle.findMany({
        where: { id: { in: referenceIds } },
        select: { content: true, title: true },
      });

      if (referenceArticles.length > 0) {
        enhancedTask.referenceArticlesContent = referenceArticles.map((article, index) => ({
          index: index + 1,
          title: article.title || `参考文章${index + 1}`,
          content: article.content || '',
        }));
      }
    } catch (error) {
      console.error('获取参考文章失败:', error);
    }
  }

  // 添加内容结构信息
  if (task.useContentStructure && task.contentStructureId) {
    try {
      const contentStructure = await db.contentStructure.findUnique({
        where: { id: task.contentStructureId },
      });

      if (contentStructure) {
        enhancedTask.contentStructureInfo = {
          title: contentStructure.title,
          content: contentStructure.content,
        };
      }
    } catch (error) {
      console.error('获取内容结构失败:', error);
    }
  }

  return enhancedTask;
}

// 阶段2: 初稿扩展
async function generateDraft(outline: string, task: any): Promise<string> {
  // 获取增强的任务信息
  const enhancedTask = await enhanceTaskWithReferences(task);

  let prompt = `基于以下大纲，撰写完整的初稿：

【大纲结构】
${outline}

【基本信息】
主题：${task.topic}
平台：${task.platform.name}
${task.platform.wordCount ? `字数要求：${task.platform.wordCount}` : '目标字数：800-1500字'}
内容类型：${task.contentType || '通用'}`;

  // 添加个性化风格指导
  if (task.username && task.contentType) {
    const stylePrompt = await buildDetailedStylePrompt(task.username, task.contentType);
    prompt += `\n\n【个性化风格要求】\n${stylePrompt}`;
  }

  // 添加参考文章的写作风格
  if (enhancedTask.referenceArticlesContent && enhancedTask.referenceArticlesContent.length > 0) {
    prompt += `\n\n【写作风格参考】`;
    prompt += `\n请参考以下文章的语言风格和表达方式：`;
    enhancedTask.referenceArticlesContent.forEach((ref: any) => {
      const styleExample = ref.content.length > 300 ? ref.content.substring(0, 300) + '...' : ref.content;
      prompt += `\n\n风格示例${ref.index}（来自：${ref.title}）：\n${styleExample}`;
    });
  }

  // 添加内容结构指导
  if (enhancedTask.contentStructureInfo) {
    prompt += `\n\n【结构指导】`;
    prompt += `\n参考结构：${enhancedTask.contentStructureInfo.title}`;
    prompt += `\n结构说明：${enhancedTask.contentStructureInfo.content}`;
  }

  // 添加附加要求
  if (task.additionalRequirements) {
    prompt += `\n\n【特殊要求】\n${task.additionalRequirements}`;
  }

  prompt += `\n\n【撰写要求】
1. 严格按照大纲结构逐段展开，不要跳过或合并段落
2. 每个段落要充实饱满，避免空洞的表述
3. 保持全文逻辑连贯，段落间要有自然的过渡
4. 语言要生动具体，多用实例和细节
5. 开头要引人入胜，结尾要有启发性
6. 保持个性化的语言风格和表达习惯
7. 确保内容对读者有实际价值和指导意义

请直接输出完整的文章正文（不需要标题）：`;

  console.log('开始生成初稿...');
  const draft = await callAI(prompt);
  console.log(`初稿生成完成，长度: ${draft.length} 字符`);

  return draft;
}

// 阶段3: 自查优化
async function selfReviewAndOptimize(draft: string, task: any): Promise<{content: string, reviewNotes: string}> {
  let prompt = `请对以下初稿进行深度自查和优化：

【初稿内容】
${draft}

【原始要求】
- 主题：${task.topic}
- 平台：${task.platform.name}
- 内容类型：${task.contentType || '通用'}
- 字数要求：${task.platform.wordCount || '800-1500字'}`;

  // 添加用户风格要求
  if (task.username && task.contentType) {
    const stylePrompt = await getStyleSummary(task.username, task.contentType);
    prompt += `\n- 个性化风格：${stylePrompt}`;
  }

  // 添加特殊要求
  if (task.additionalRequirements) {
    prompt += `\n- 特殊要求：${task.additionalRequirements}`;
  }

  prompt += `\n\n【多维度检查和优化】

请严格按照以下标准进行自查和优化：

1. **主题相关性** (权重25%)
   - 是否紧扣主题，没有偏离
   - 核心观点是否清晰明确
   - 论述是否充分深入

2. **逻辑结构** (权重20%)
   - 段落安排是否合理有序
   - 论证逻辑是否严密
   - 过渡衔接是否自然流畅

3. **语言表达** (权重20%)
   - 语言是否生动具体，避免空洞
   - 句式是否丰富多样
   - 用词是否准确恰当

4. **个性化风格** (权重15%)
   - 是否体现用户的写作风格特征
   - 语调是否符合用户习惯
   - 表达方式是否一致

5. **内容价值** (权重15%)
   - 信息是否有实用价值
   - 见解是否独特深刻
   - 对读者是否有启发意义

6. **读者体验** (权重5%)
   - 是否易于理解和阅读
   - 标点和格式是否规范
   - 整体是否引人入胜

【优化原则】
- 保持原文的核心思想和基本结构
- 重点提升表达的准确性和生动性
- 确保风格一致性
- 增强逻辑连贯性

【输出要求】
请严格按照以下JSON格式返回结果，确保JSON格式正确：

{
  "optimizedContent": "优化后的完整文章内容（保持完整性，不要省略任何部分）",
  "reviewNotes": "详细的优化说明，包括：\n1. 发现的主要问题\n2. 具体修改内容\n3. 优化的理由和效果\n4. 质量评估分数（满分100分）"
}

注意：optimizedContent字段必须包含完整的优化后文章，不能有任何省略。`;

  console.log('开始自查优化...');

  try {
    const result = await callAI(prompt);

    // 清理可能的Markdown代码块标记
    const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(cleanResult);

    if (!parsed.optimizedContent || !parsed.reviewNotes) {
      throw new Error('返回结果格式不完整');
    }

    console.log(`自查优化完成，优化后长度: ${parsed.optimizedContent.length} 字符`);

    return {
      content: parsed.optimizedContent,
      reviewNotes: parsed.reviewNotes
    };
  } catch (error) {
    console.error('自查优化过程中出现错误:', error);

    // 如果JSON解析失败，返回原始草稿和错误说明
    return {
      content: draft,
      reviewNotes: `自查优化过程中出现错误: ${error instanceof Error ? error.message : '未知错误'}。返回原始初稿内容。`
    };
  }
}

// 保存生成阶段结果
async function saveGenerationStage(taskId: string, stage: {
  stage: 'outline' | 'draft' | 'final';
  content: string;
  reviewNotes?: string;
  aiProvider: string;
  aiModel: string;
}): Promise<void> {
  const db = (await import("~/server/db")).db;

  const updateData: any = {
    generationStage: stage.stage,
    [stage.stage === 'outline' ? 'outlineContent' :
     stage.stage === 'draft' ? 'draftContent' :
     'finalContent']: stage.content,
    wordCount: stage.content.length,
  };

  if (stage.stage === 'final') {
    updateData.generatedContent = stage.content; // 向下兼容
    updateData.selfReviewNotes = stage.reviewNotes;
  }

  // 更新或创建结果记录
  await db.articleGenerationResult.upsert({
    where: { taskId },
    update: updateData,
    create: {
      taskId,
      ...updateData,
      aiProvider: stage.aiProvider,
      aiModel: stage.aiModel,
    }
  });
}


// AI调用函数
async function callAI(prompt: string): Promise<string> {
  const config = await (await import('~/server/core/ai/writing-assistant-config-loader')).WritingAssistantConfigLoader.getAnalysisConfig();
  const aiService = (await import('~/server/core/ai/ai-factory')).AIServiceFactory.createService({
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });

  return await aiService.generateText(prompt);
}


// 获取风格摘要
async function getStyleSummary(username: string, contentType: string): Promise<string> {
  const stylePrompt = await buildDetailedStylePrompt(username, contentType);
  return stylePrompt.replace(/【.*?】\n/g, '').replace(/\n\n/g, ' ').trim();
}

async function buildDetailedStylePrompt(username: string, contentType: string): Promise<string> {
  try {
    // 获取用户的写作概览
    const { llmWritingOverviewService } = await import("~/server/services/llm-writing-overview");
    const userOverview = await llmWritingOverviewService.getCurrentOverview(username);

    // 获取用户的类型化风格档案
    const styleProfile = await db.userStyleProfile.findUnique({
      where: {
        username_contentType: {
          username: username,
          contentType: contentType
        }
      }
    });

    let stylePrompt = `【用户"${username}"的个人写作风格指导】\n`;

    if (userOverview) {
      stylePrompt += `- 写作人格：${userOverview.overallStyle.writingPersonality}\n`;
      stylePrompt += `- 语调特征：${userOverview.overallStyle.toneCharacteristics.join('、')}\n`;
      stylePrompt += `- 常用开头方式：${userOverview.typicalStructure.openingPatterns.primaryPattern} - ${userOverview.typicalStructure.openingPatterns.description}\n`;
      stylePrompt += `- 内容展开模式：${userOverview.typicalStructure.developmentPatterns.primaryPattern} - ${userOverview.typicalStructure.developmentPatterns.description}\n`;
      stylePrompt += `- 结尾风格：${userOverview.typicalStructure.closingPatterns.primaryPattern} - ${userOverview.typicalStructure.closingPatterns.description}\n`;

      // 添加高频句式模板
      if (userOverview.typicalSentences.highFrequencyPatterns.length > 0) {
        const patterns = userOverview.typicalSentences.highFrequencyPatterns
          .slice(0, 3)
          .map(p => `"${p.pattern}" (${p.context})`)
          .join('、');
        stylePrompt += `- 常用句式模板：${patterns}\n`;
      }
    }

    // 添加类型化风格（如果有该类型的分析数据）
    if (styleProfile) {
      stylePrompt += `\n【"${contentType}"类型专属风格】\n`;

      if (styleProfile.commonOpenings) {
        try {
          const openings = JSON.parse(styleProfile.commonOpenings);
          if (openings.length > 0) {
            stylePrompt += `- 该类型常用开头：${openings.slice(0, 3).join('、')}\n`;
          }
        } catch (e) {
          console.warn('解析开头模式失败:', e);
        }
      }

      if (styleProfile.commonClosings) {
        try {
          const closings = JSON.parse(styleProfile.commonClosings);
          if (closings.length > 0) {
            stylePrompt += `- 该类型常用结尾：${closings.slice(0, 3).join('、')}\n`;
          }
        } catch (e) {
          console.warn('解析结尾模式失败:', e);
        }
      }

      if (styleProfile.avgContentLength && styleProfile.avgContentLength > 0) {
        stylePrompt += `- 该类型平均长度：约${Math.round(styleProfile.avgContentLength)}字符\n`;
      }

      if (styleProfile.toneFeatures) {
        try {
          const toneFeatures = JSON.parse(styleProfile.toneFeatures);
          const toneDescriptions = Object.entries(toneFeatures)
            .filter(([key, value]) => typeof value === 'number' && value > 0.3)
            .map(([key, value]) => `${key}(${(value as number * 100).toFixed(0)}%)`)
            .slice(0, 3);
          if (toneDescriptions.length > 0) {
            stylePrompt += `- 语调特征：${toneDescriptions.join('、')}\n`;
          }
        } catch (e) {
          console.warn('解析语调特征失败:', e);
        }
      }

      if (styleProfile.sampleCount) {
        stylePrompt += `- 分析样本：基于${styleProfile.sampleCount}条该类型推文\n`;
      }
    }

    return stylePrompt;
  } catch (error) {
    console.error('获取个性化风格数据失败:', error);
    return `【用户"${username}"的写作风格】（数据获取失败，将使用通用风格）\n`;
  }
}