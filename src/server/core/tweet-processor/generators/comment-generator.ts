/**
 * AI评论生成器
 * 集成AI服务，生成推文评论
 */

import type { Tweet } from '@prisma/client';
import type { CommentGenerateRequest, CommentGenerateResult, CommentData } from '../types';
import { db } from '~/server/db';
import { CommentCrawler } from '../comments/comment-crawler';
import { AIServiceFactory } from '../../ai/ai-factory';
import type { AIConfig } from '../../ai/base/ai-types';

export class CommentGenerator {

  /**
   * 生成AI评论
   */
  async generateComments(
    request: CommentGenerateRequest,
    tweet: Tweet
  ): Promise<CommentGenerateResult> {
    try {
      console.log(`[评论生成器] 开始生成评论: ${request.tweetId}`);

      // 1. 准备评论数据（如果需要基于现有评论）
      let existingComments: CommentData[] = [];
      let existingCommentsCount = 0;

      if (request.includeExistingComments) {
        existingComments = await this.prepareExistingComments(request.tweetId);
        existingCommentsCount = existingComments.length;
        console.log(`[评论生成器] 获取到 ${existingCommentsCount} 条现有评论`);
      }

      // 2. 准备参考推文数据
      let referenceData: Array<{content: string}> = [];
      if (request.referenceTweetCategoryId && request.referenceCount && request.referenceCount > 0) {
        referenceData = await this.prepareReferenceData(request.referenceTweetCategoryId, request.referenceCount);
        console.log(`[评论生成器] 获取到 ${referenceData.length} 条参考推文数据`);
      }

      // 3. 获取AI配置
      const aiConfig = request.aiConfig || await this.getAIConfig();
      console.log(`[评论生成器] 使用AI供应商: ${aiConfig.provider}`);

      // 4. 构建AI提示词
      const prompt = this.buildPrompt(request, tweet, existingComments, referenceData);

      // 5. 调用AI服务生成评论
      const aiService = AIServiceFactory.createService(aiConfig);
      const aiResponse = await aiService.generateText(prompt);

      // 6. 解析AI响应
      const parsedComments = this.parseAIResponse(aiResponse, request.commentCount);

      const result: CommentGenerateResult = {
        success: true,
        message: `成功生成 ${parsedComments.length} 条评论`,
        data: {
          tweetId: request.tweetId,
          comments: parsedComments,
          basedOnExistingComments: request.includeExistingComments || false,
          existingCommentsCount,
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
          language: request.language,
          generatedAt: new Date().toISOString(),
        }
      };

      // 7. 保存AI生成评论到数据库
      try {
        await db.aIGeneratedComment.create({
          data: {
            tweetId: request.tweetId,
            userInfo: request.userInfo || null,
            systemPrompt: request.systemPrompt || null,
            commentLength: request.commentLength,
            commentCount: request.commentCount,
            generatedComments: JSON.stringify(parsedComments),
            basedOnExisting: request.includeExistingComments || false,
            existingCommentsSnapshot: existingComments.length > 0 ? JSON.stringify(existingComments.slice(0, 10)) : null,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          }
        });
        console.log(`[评论生成器] AI生成评论已保存到数据库`);
      } catch (dbError) {
        console.error('[评论生成器] 保存AI评论到数据库失败:', dbError);
        // 不影响主流程，只记录错误
      }

      console.log(`[评论生成器] 生成完成: ${parsedComments.length} 条评论`);
      return result;

    } catch (error) {
      console.error('[评论生成器] 生成失败:', error);

      return {
        success: false,
        message: '评论生成失败',
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 准备现有评论数据
   */
  private async prepareExistingComments(tweetId: string): Promise<CommentData[]> {
    // 首先检查数据库中是否已有评论
    const existingComments = await db.tweetComment.findMany({
      where: { tweetId },
      orderBy: { publishedAt: 'desc' },
      take: 20, // 最多取20条
    });

    if (existingComments.length > 0) {
      console.log(`[评论生成器] 从数据库获取到 ${existingComments.length} 条评论`);
      return existingComments.map(comment => ({
        commentId: comment.commentId,
        content: comment.content,
        authorUsername: comment.authorUsername,
        authorNickname: comment.authorNickname,
        authorProfileImage: comment.authorProfileImage || '',
        replyCount: comment.replyCount,
        likeCount: comment.likeCount,
        publishedAt: Number(comment.publishedAt),
        scrapedAt: Number(comment.scrapedAt),
        isReply: comment.isReply,
        parentCommentId: comment.parentCommentId || undefined,
        tweetId: comment.tweetId,
      }));
    }

    // 如果没有评论，则先爬取
    console.log(`[评论生成器] 数据库中无评论，开始爬取...`);
    const crawler = new CommentCrawler();
    const crawlResult = await crawler.crawlComments({
      tweetId,
      incremental: false,
      maxScrolls: 10, // 为生成评论使用较少的滚动次数
    });

    if (crawlResult.success && crawlResult.comments.length > 0) {
      console.log(`[评论生成器] 爬取到 ${crawlResult.comments.length} 条评论`);
      return crawlResult.comments;
    }

    console.log(`[评论生成器] 未能获取到现有评论`);
    return [];
  }

  /**
   * 准备参考推文数据
   */
  private async prepareReferenceData(categoryId: string, count: number): Promise<Array<{content: string}>> {
    try {
      console.log(`[评论生成器] 获取参考数据: 分类=${categoryId}, 数量=${count}`);

      // 从手采推文数据库中获取指定分类的推文数据
      const referenceTexts = await db.manualTweetText.findMany({
        where: { categoryId },
        select: { content: true },
        take: count,
        orderBy: { createdAt: 'desc' } // 按创建时间倒序，获取最新的数据
      });

      if (referenceTexts.length > 0) {
        console.log(`[评论生成器] 成功获取到 ${referenceTexts.length} 条参考推文`);
        return referenceTexts.map(text => ({ content: text.content }));
      }

      console.log(`[评论生成器] 未找到指定分类的参考数据: ${categoryId}`);
      return [];

    } catch (error) {
      console.error('[评论生成器] 获取参考数据失败:', error);
      return [];
    }
  }

  /**
   * 获取AI配置
   * 从AI批处理模块获取配置
   */
  private async getAIConfig(): Promise<AIConfig> {
    try {
      // 查询最新的AI配置
      const aiRecord = await db.aIProcessRecord.findFirst({
        orderBy: { startedAt: 'desc' },
        select: {
          aiProvider: true,
          aiModel: true,
          // 从AI批处理记录中获取配置信息
        },
      });

      if (aiRecord?.aiProvider && aiRecord?.aiModel) {
        // 构建AI配置 - 这里需要根据实际的配置存储方式调整
        return {
          provider: aiRecord.aiProvider as any,
          model: aiRecord.aiModel,
          apiKey: process.env.OPENAI_API_KEY || '', // 临时方案，需要改进
          baseURL: process.env.OPENAI_BASE_URL,
        };
      }

      // 默认配置
      return {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL,
      };

    } catch (error) {
      console.error('[评论生成器] 获取AI配置失败，使用默认配置:', error);

      return {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL,
      };
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(
    request: CommentGenerateRequest,
    tweet: Tweet,
    existingComments: CommentData[],
    referenceData: Array<{content: string}> = []
  ): string {
    const { language, commentLength, commentCount, userInfo, systemPrompt } = request;

    // 语言设置
    const isChineese = language === 'zh-CN';
    const langPrompt = isChineese ? '请用简体中文回复' : 'Please reply in American English';

    // 长度设置
    const lengthPrompts = {
      'zh-CN': {
        short: '20-60字符，简洁一句话',
        medium: '60-200字符，2-3句完整观点',
        long: '200-500字符，多句详细分析带个人观点'
      },
      'en-US': {
        short: '20-60 characters, concise one sentence',
        medium: '60-200 characters, 2-3 complete sentences',
        long: '200-500 characters, detailed analysis with personal opinion'
      }
    };

    const lengthPrompt = lengthPrompts[language][commentLength];

    // 构建基础提示词
    let prompt = systemPrompt || `你是一个社交媒体评论助手。${langPrompt}。

请为以下推文生成 ${commentCount} 条评论回复：

推文内容：
"${tweet.content}"

要求：
- 评论长度：${lengthPrompt}
- 评论数量：${commentCount} 条
- 语言：${language === 'zh-CN' ? '简体中文' : '美国英语'}
- 评论态度参考并跟随下面的'用户补充信息'（优先）和'现有评论'，如果没有明显倾向，则以平和、稍微肯定的态度来表达，但不要同现有评论过于雷同
- 可以使用口语化语言，自然、真实，避免AI生成的味道，且符合社交媒体风格`;

    // 添加用户信息
    if (userInfo) {
      prompt += `\n\n用户补充信息：\n${userInfo}`;
    }

    // 添加现有评论参考
    if (existingComments.length > 0) {
      prompt += `\n\n现有评论参考：\n`;
      existingComments.slice(0, 10).forEach((comment, index) => {
        prompt += `${index + 1}. ${comment.content}\n`;
      });
    }

    // 添加参考推文数据
    if (referenceData.length > 0) {
      prompt += `\n\n参考推文数据：\n以下是同类型推文的表达方式参考，请学习它们的语言风格和表达方式，但不要吸收与当前推文无关的具体信息：\n`;
      referenceData.forEach((ref, index) => {
        prompt += `${index + 1}. ${ref.content}\n`;
      });
      prompt += `\n请参考以上推文的表达风格和语言习惯来生成评论，但确保评论内容与当前推文内容相关。`;
    }

    // 输出格式要求
    prompt += `\n\n请严格按照以下JSON格式输出：
{
  "comments": [
    {"content": "评论内容1", "reasoning": "生成理由1"},
    {"content": "评论内容2", "reasoning": "生成理由2"}
  ]
}`;

    return prompt;
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(aiResponse: string, expectedCount: number): Array<{content: string; reasoning?: string}> {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(aiResponse);

      if (parsed.comments && Array.isArray(parsed.comments)) {
        return parsed.comments.slice(0, expectedCount).map((comment: any) => ({
          content: comment.content || '',
          reasoning: comment.reasoning || undefined,
        }));
      }

      // 如果JSON解析失败，尝试简单文本解析
      const lines = aiResponse.split('\n').filter(line => line.trim());
      const comments = [];

      for (let i = 0; i < Math.min(lines.length, expectedCount); i++) {
        const line = lines[i];
        if (line) {
          const content = line.replace(/^\d+\.\s*/, '').trim();
          if (content) {
            comments.push({ content });
          }
        }
      }

      return comments;

    } catch (error) {
      console.error('[评论生成器] 解析AI响应失败:', error);

      // 回退到简单解析
      return [{
        content: aiResponse.substring(0, 200), // 截取前200字符作为单条评论
        reasoning: '解析失败，使用原始响应'
      }];
    }
  }
}