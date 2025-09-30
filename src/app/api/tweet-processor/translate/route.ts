import { NextRequest, NextResponse } from 'next/server';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';
import type { AIConfig } from '~/server/core/ai/base/ai-types';

/**
 * 独立翻译API
 * POST /api/tweet-processor/translate
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[独立翻译API] 收到请求');

    // 解析请求体
    const body = await request.json();
    const {
      content,
      aiConfig,
      targetLanguage = 'zh-CN'
    } = body;

    // 验证必需参数
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid content' }
        },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Content cannot be empty' }
        },
        { status: 400 }
      );
    }

    // 验证AI配置 (允许直接传入aiConfig，用于内部调用)
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.provider || !aiConfig.model) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid aiConfig (apiKey, provider, model required)' }
        },
        { status: 400 }
      );
    }

    if (!['openai', 'openai-badger', 'zhipu', 'anthropic'].includes(aiConfig.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig provider, must be openai|openai-badger|zhipu|anthropic' }
        },
        { status: 400 }
      );
    }

    // 验证目标语言
    if (!['zh-CN', 'en-US'].includes(targetLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid targetLanguage, must be zh-CN|en-US' }
        },
        { status: 400 }
      );
    }

    console.log(`[独立翻译API] 开始翻译: 供应商=${aiConfig.provider}, 模型=${aiConfig.model}, 目标语言=${targetLanguage}`);
    console.log(`[独立翻译API] 原文内容: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);

    // 创建AI服务实例
    const aiService = AIServiceFactory.createService(aiConfig as AIConfig);

    // 执行翻译
    const translationResult = await aiService.translateTweet(content, targetLanguage);

    console.log(`[独立翻译API] 翻译完成:`);
    console.log(`[独立翻译API] 原始语言: ${translationResult.originalLanguage}`);
    console.log(`[独立翻译API] 是否翻译: ${translationResult.isTranslated}`);
    console.log(`[独立翻译API] 译文: ${translationResult.translatedContent.substring(0, 100)}${translationResult.translatedContent.length > 100 ? '...' : ''}`);

    return NextResponse.json({
      success: true,
      data: {
        originalContent: content,
        translatedContent: translationResult.translatedContent,
        originalLanguage: translationResult.originalLanguage,
        isTranslated: translationResult.isTranslated,
        targetLanguage,
        provider: aiConfig.provider,
        model: aiConfig.model,
        translatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[独立翻译API] 处理失败:', error);

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