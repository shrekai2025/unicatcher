import { NextRequest, NextResponse } from 'next/server';
import { TweetProcessorManager } from '~/server/core/tweet-processor/manager';
import type { CommentGenerateRequest } from '~/server/core/tweet-processor/types';

const manager = TweetProcessorManager.getInstance();

/**
 * AI生成评论API
 * POST /api/tweet-processor/generate-comments
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AI评论生成API] 收到请求');

    // 解析请求体
    const body = await request.json();
    const {
      tweetId,
      content,
      authorUsername,
      authorNickname,
      tweetUrl,
      userInfo,
      systemPrompt,
      type,
      includeExistingComments = false,
      commentCount = 2,
      commentLength = 'medium',
      language = 'zh-CN',
      aiConfig,
      referenceTweetCategoryId,
      referenceCount = 5
    } = body;

    // 验证必需参数
    if (!tweetId || typeof tweetId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid tweetId' }
        },
        { status: 400 }
      );
    }

    // 验证可选参数
    if (userInfo && typeof userInfo !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid userInfo parameter, must be string' }
        },
        { status: 400 }
      );
    }

    if (systemPrompt && typeof systemPrompt !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid systemPrompt parameter, must be string' }
        },
        { status: 400 }
      );
    }

    if (typeof includeExistingComments !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid includeExistingComments parameter, must be boolean' }
        },
        { status: 400 }
      );
    }

    if (typeof commentCount !== 'number' || commentCount < 1 || commentCount > 7) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid commentCount parameter, must be number between 1-7' }
        },
        { status: 400 }
      );
    }

    if (!['short', 'medium', 'long'].includes(commentLength)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid commentLength parameter, must be short|medium|long' }
        },
        { status: 400 }
      );
    }

    if (!['zh-CN', 'en-US'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid language parameter, must be zh-CN|en-US' }
        },
        { status: 400 }
      );
    }

    // 验证参考数据参数
    if (referenceTweetCategoryId && typeof referenceTweetCategoryId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid referenceTweetCategoryId parameter, must be string' }
        },
        { status: 400 }
      );
    }

    if (typeof referenceCount !== 'number' || referenceCount < 0 || referenceCount > 20) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid referenceCount parameter, must be number between 0-20' }
        },
        { status: 400 }
      );
    }

    // 验证AI配置
    if (aiConfig) {
      if (!aiConfig.apiKey || typeof aiConfig.apiKey !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig: apiKey is required' }
          },
          { status: 400 }
        );
      }

      if (!aiConfig.provider || !['openai', 'openai-badger', 'zhipu', 'anthropic'].includes(aiConfig.provider)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig: provider must be openai|openai-badger|zhipu|anthropic' }
          },
          { status: 400 }
        );
      }

      if (!aiConfig.model || typeof aiConfig.model !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig: model is required' }
          },
          { status: 400 }
        );
      }
    }

    console.log(`[AI评论生成API] 处理请求: ${tweetId} (用户信息: ${userInfo ? '有' : '无'}, 基于现有评论: ${includeExistingComments}, 数量: ${commentCount}, 长度: ${commentLength}, 语言: ${language}, 参考分类: ${referenceTweetCategoryId || '无'}, 参考数量: ${referenceCount}, 类型: ${type || '无'})`);

    // 构建请求对象
    const generateRequest: CommentGenerateRequest = {
      tweetId,
      content,
      authorUsername,
      authorNickname,
      tweetUrl,
      userInfo,
      systemPrompt,
      type,
      includeExistingComments,
      commentCount: commentCount as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      commentLength: commentLength as 'short' | 'medium' | 'long',
      language: language as 'zh-CN' | 'en-US',
      aiConfig,
      referenceTweetCategoryId,
      referenceCount
    };

    // 调用管理器处理
    const result = await manager.generateComments(generateRequest);

    console.log(`[AI评论生成API] 处理完成: ${result.success ? '成功' : '失败'}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[AI评论生成API] 处理失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal Server Error'
        }
      },
      { status: 500 }
    );
  }
}