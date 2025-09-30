import { db } from '~/server/db';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';

export interface UserFeedback {
  taskId: string;
  userId: string;
  rating: number; // 1-5
  feedback: string;
  feedbackTags: string[];
  contentType: string;
  timestamp: Date;
}

export interface FeedbackPattern {
  userId: string;
  contentType: string;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    severity: number;
  }>;
  preferredStyles: Array<{
    style: string;
    strength: number;
  }>;
  adjustmentHistory: Array<{
    adjustmentType: string;
    effectivenesScore: number;
    timestamp: Date;
  }>;
}

export interface StyleAdjustment {
  type: 'overview' | 'profile';
  target: 'content_structure' | 'tone' | 'length' | 'keyword_usage' | 'opening_style' | 'conclusion_style';
  adjustment: string;
  reasoning: string;
  confidence: number;
  priority: number;
}

export class FeedbackAdjustmentService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('✅ FeedbackAdjustmentService 初始化完成');
  }

  // 提交用户反馈
  async submitFeedback(feedback: UserFeedback): Promise<void> {
    await this.initialize();

    try {
      // 1. 保存反馈到数据库
      await db.articleGenerationResult.update({
        where: { taskId: feedback.taskId },
        data: {
          userRating: feedback.rating,
          userFeedback: feedback.feedback,
          feedbackTags: JSON.stringify(feedback.feedbackTags),
          updatedAt: new Date()
        }
      });

      // 2. 异步处理反馈模式分析
      this.processFeedbackPattern(feedback).catch(error => {
        console.error('反馈模式分析失败:', error);
      });

      console.log(`📝 用户反馈已保存: 任务${feedback.taskId}, 评分${feedback.rating}`);
    } catch (error) {
      console.error('保存用户反馈失败:', error);
      throw new Error('反馈提交失败');
    }
  }

  // 分析反馈模式
  private async processFeedbackPattern(feedback: UserFeedback): Promise<void> {
    try {
      // 1. 获取用户历史反馈
      const historicalFeedbacks = await this.getUserHistoricalFeedback(
        feedback.userId,
        feedback.contentType
      );

      // 2. 分析反馈模式
      const patterns = await this.analyzeFeedbackPatterns(
        [...historicalFeedbacks, feedback]
      );

      // 3. 生成风格调整建议
      if (patterns.commonIssues.length > 0) {
        const adjustments = await this.generateStyleAdjustments(
          feedback.userId,
          feedback.contentType,
          patterns
        );

        // 4. 应用调整到用户风格档案
        await this.applyStyleAdjustments(
          feedback.userId,
          feedback.contentType,
          adjustments
        );
      }

    } catch (error) {
      console.error('反馈模式处理失败:', error);
    }
  }

  // 获取用户历史反馈
  private async getUserHistoricalFeedback(
    userId: string,
    contentType: string,
    limit: number = 20
  ): Promise<UserFeedback[]> {
    const results = await db.articleGenerationResult.findMany({
      where: {
        task: {
          username: userId,
          contentType: contentType
        },
        userRating: { not: null },
        userFeedback: { not: null }
      },
      include: {
        task: true
      },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });

    return results.map(result => ({
      taskId: result.taskId,
      userId: userId,
      rating: result.userRating!,
      feedback: result.userFeedback!,
      feedbackTags: result.feedbackTags ? JSON.parse(result.feedbackTags) : [],
      contentType: result.task.contentType || contentType,
      timestamp: result.updatedAt
    }));
  }

  // 分析反馈模式（LLM驱动）
  private async analyzeFeedbackPatterns(feedbacks: UserFeedback[]): Promise<FeedbackPattern> {
    if (feedbacks.length === 0) {
      return {
        userId: '',
        contentType: '',
        commonIssues: [],
        preferredStyles: [],
        adjustmentHistory: []
      };
    }

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const prompt = this.buildFeedbackAnalysisPrompt(feedbacks);
    const analysisResult = await aiService.generateText(prompt);

    try {
      const parsed = JSON.parse(analysisResult);
      return {
        userId: feedbacks[0]!.userId,
        contentType: feedbacks[0]!.contentType,
        commonIssues: parsed.commonIssues || [],
        preferredStyles: parsed.preferredStyles || [],
        adjustmentHistory: []
      };
    } catch (error) {
      console.error('反馈模式分析结果解析失败:', error);
      return {
        userId: feedbacks[0]!.userId,
        contentType: feedbacks[0]!.contentType,
        commonIssues: [],
        preferredStyles: [],
        adjustmentHistory: []
      };
    }
  }

  // 构建反馈分析提示词
  private buildFeedbackAnalysisPrompt(feedbacks: UserFeedback[]): string {
    const feedbackSummary = feedbacks.map((fb, index) =>
      `反馈${index + 1}: 评分${fb.rating}/5, 内容:"${fb.feedback}", 标签:${fb.feedbackTags.join(',')}`
    ).join('\n');

    return `请分析以下用户反馈，识别常见问题和偏好模式：

内容类型: ${feedbacks[0]!.contentType}
反馈总数: ${feedbacks.length}

用户反馈:
${feedbackSummary}

请分析并返回JSON格式结果：
{
  "commonIssues": [
    {
      "issue": "问题描述",
      "frequency": 0.8,
      "severity": 0.7
    }
  ],
  "preferredStyles": [
    {
      "style": "风格特征描述",
      "strength": 0.9
    }
  ]
}

分析要求：
1. 识别出现频率>=30%的问题作为commonIssues
2. frequency表示问题出现频率(0-1)
3. severity表示问题严重程度(0-1)
4. preferredStyles要基于高评分反馈中的正面元素
5. strength表示偏好强度(0-1)
6. 只返回JSON，不要其他文字`;
  }

  // 生成风格调整建议（LLM驱动）
  private async generateStyleAdjustments(
    userId: string,
    contentType: string,
    patterns: FeedbackPattern
  ): Promise<StyleAdjustment[]> {
    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const prompt = this.buildAdjustmentGenerationPrompt(userId, contentType, patterns);
    const adjustmentResult = await aiService.generateText(prompt);

    try {
      const parsed = JSON.parse(adjustmentResult);
      return parsed.adjustments || [];
    } catch (error) {
      console.error('风格调整建议解析失败:', error);
      return [];
    }
  }

  // 构建调整生成提示词
  private buildAdjustmentGenerationPrompt(
    userId: string,
    contentType: string,
    patterns: FeedbackPattern
  ): string {
    const issuesSummary = patterns.commonIssues
      .map(issue => `- ${issue.issue} (频率:${issue.frequency}, 严重度:${issue.severity})`)
      .join('\n');

    const stylesSummary = patterns.preferredStyles
      .map(style => `- ${style.style} (强度:${style.strength})`)
      .join('\n');

    return `基于用户反馈模式，生成针对性的风格调整建议：

用户ID: ${userId}
内容类型: ${contentType}

常见问题:
${issuesSummary}

偏好风格:
${stylesSummary}

请生成调整建议JSON：
{
  "adjustments": [
    {
      "type": "overview/profile",
      "target": "content_structure/tone/length/keyword_usage/opening_style/conclusion_style",
      "adjustment": "具体调整内容",
      "reasoning": "调整理由",
      "confidence": 0.85,
      "priority": 8
    }
  ]
}

调整要求：
1. overview调整影响整体策略，profile调整影响个人档案
2. target覆盖内容结构、语调、长度、关键词使用、开头结尾风格
3. adjustment要具体可执行
4. confidence表示调整有效性信心(0-1)
5. priority表示调整优先级(1-10)
6. 根据问题严重度和频率确定priority
7. 只返回JSON`;
  }

  // 应用风格调整
  private async applyStyleAdjustments(
    userId: string,
    contentType: string,
    adjustments: StyleAdjustment[]
  ): Promise<void> {
    for (const adjustment of adjustments) {
      try {
        if (adjustment.type === 'overview') {
          await this.applyOverviewAdjustment(userId, contentType, adjustment);
        } else if (adjustment.type === 'profile') {
          await this.applyProfileAdjustment(userId, contentType, adjustment);
        }

        // 记录调整历史
        await this.recordAdjustmentHistory(userId, contentType, adjustment);

        console.log(`✅ 风格调整已应用: ${adjustment.target} - ${adjustment.adjustment}`);
      } catch (error) {
        console.error(`风格调整应用失败 ${adjustment.target}:`, error);
      }
    }
  }

  // 应用Overview级别调整（影响整体策略）
  private async applyOverviewAdjustment(
    userId: string,
    contentType: string,
    adjustment: StyleAdjustment
  ): Promise<void> {
    // 查找或创建用户风格档案总览
    const existing = await db.userStyleProfile.findFirst({
      where: {
        username: userId,
        contentType: contentType
      }
    });

    const overviewData = existing?.generationConfig ?
      JSON.parse(existing.generationConfig) : {};

    // 应用调整到总览数据
    if (!overviewData.adjustments) {
      overviewData.adjustments = {};
    }

    overviewData.adjustments[adjustment.target] = {
      adjustment: adjustment.adjustment,
      reasoning: adjustment.reasoning,
      confidence: adjustment.confidence,
      appliedAt: new Date().toISOString()
    };

    // 更新数据库
    if (existing) {
      await db.userStyleProfile.update({
        where: { id: existing.id },
        data: {
          generationConfig: JSON.stringify(overviewData),
          updatedAt: new Date()
        }
      });
    } else {
      await db.userStyleProfile.create({
        data: {
          username: userId,
          contentType: contentType,
          generationConfig: JSON.stringify(overviewData)
        }
      });
    }
  }

  // 应用Profile级别调整（影响个人档案）
  private async applyProfileAdjustment(
    userId: string,
    contentType: string,
    adjustment: StyleAdjustment
  ): Promise<void> {
    // 查找或创建用户风格档案
    const existing = await db.userStyleProfile.findFirst({
      where: {
        username: userId,
        contentType: contentType
      }
    });

    const profileData = existing?.generationConfig ?
      JSON.parse(existing.generationConfig) : {};

    // 应用调整到档案数据
    if (!profileData.styleAdjustments) {
      profileData.styleAdjustments = {};
    }

    profileData.styleAdjustments[adjustment.target] = {
      adjustment: adjustment.adjustment,
      reasoning: adjustment.reasoning,
      confidence: adjustment.confidence,
      appliedAt: new Date().toISOString()
    };

    // 更新数据库
    if (existing) {
      await db.userStyleProfile.update({
        where: { id: existing.id },
        data: {
          generationConfig: JSON.stringify(profileData),
          updatedAt: new Date()
        }
      });
    } else {
      await db.userStyleProfile.create({
        data: {
          username: userId,
          contentType: contentType,
          generationConfig: JSON.stringify(profileData)
        }
      });
    }
  }

  // 记录调整历史
  private async recordAdjustmentHistory(
    userId: string,
    contentType: string,
    adjustment: StyleAdjustment
  ): Promise<void> {
    await db.feedbackPattern.create({
      data: {
        username: userId,
        contentType: contentType,
        feedbackType: 'suggestion',
        pattern: `${adjustment.type}_adjustment_${adjustment.target}`,
        frequency: 1,
        lastOccurred: new Date(),
        isResolved: false
      }
    });
  }

  // 获取用户反馈状态
  async getFeedbackStatus(userId: string, contentType?: string): Promise<{
    totalFeedbacks: number;
    averageRating: number;
    recentAdjustments: Array<{
      target: string;
      adjustment: string;
      appliedAt: string;
    }>;
    pendingIssues: Array<{
      issue: string;
      frequency: number;
    }>;
  }> {
    await this.initialize();

    const whereClause: any = {
      task: { username: userId },
      userRating: { not: null }
    };

    if (contentType) {
      whereClause.task.contentType = contentType;
    }

    // 统计反馈数据
    const feedbacks = await db.articleGenerationResult.findMany({
      where: whereClause,
      include: { task: true },
      orderBy: { updatedAt: 'desc' }
    });

    const totalFeedbacks = feedbacks.length;
    const averageRating = totalFeedbacks > 0
      ? feedbacks.reduce((sum, fb) => sum + fb.userRating!, 0) / totalFeedbacks
      : 0;

    // 获取最近调整
    const recentAdjustments = await db.feedbackPattern.findMany({
      where: {
        username: userId,
        contentType: contentType || undefined,
        pattern: { contains: 'adjustment' }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return {
      totalFeedbacks,
      averageRating: Math.round(averageRating * 100) / 100,
      recentAdjustments: recentAdjustments.map(adj => ({
        target: adj.pattern.split('_')[2] || 'general',
        adjustment: adj.pattern.split('_')[0] || 'style',
        appliedAt: adj.createdAt.toISOString()
      })),
      pendingIssues: [] // 暂时返回空数组，后续可扩展
    };
  }
}

export const feedbackAdjustmentService = new FeedbackAdjustmentService();