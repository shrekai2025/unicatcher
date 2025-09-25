import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { OpenAIService } from '~/server/core/ai/providers/openai-service';
import { ZhipuService } from '~/server/core/ai/providers/zhipu-service';
import type { AIConfig } from '~/server/core/ai/base/ai-types';

/**
 * 推文翻译API
 * POST /api/tweet-processor/translate-tweet
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[推文翻译API] 收到请求');

    // 解析请求体
    const body = await request.json();
    const {
      tweetId,
      aiConfig,
      targetLanguage = 'zh-CN'
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

    // 验证AI配置
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.provider || !aiConfig.model) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid aiConfig (apiKey, provider, model required)' }
        },
        { status: 400 }
      );
    }

    if (!['openai', 'openai-badger', 'zhipu'].includes(aiConfig.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig provider, must be openai|openai-badger|zhipu' }
        },
        { status: 400 }
      );
    }

    console.log(`[推文翻译API] 处理推文翻译: ${tweetId}, 供应商: ${aiConfig.provider}`);

    // 获取推文数据
    const tweet = await db.tweet.findUnique({
      where: { id: tweetId, isDeleted: false },
      select: {
        id: true,
        content: true,
        translatedContent: true,
        isTranslated: true,
        originalLanguage: true
      }
    });

    if (!tweet) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tweet not found or deleted' }
        },
        { status: 404 }
      );
    }

    // 创建AI服务实例
    let aiService;
    if (aiConfig.provider === 'zhipu') {
      aiService = new ZhipuService(aiConfig as AIConfig);
    } else {
      aiService = new OpenAIService(aiConfig as AIConfig);
    }

    // 执行翻译
    const translationResult = await aiService.translateTweet(tweet.content, targetLanguage);

    // 更新数据库
    const updatedTweet = await db.tweet.update({
      where: { id: tweetId },
      data: {
        translatedContent: translationResult.translatedContent,
        originalLanguage: translationResult.originalLanguage,
        isTranslated: translationResult.isTranslated,
        translationProvider: aiConfig.provider,
        translationModel: aiConfig.model,
        translatedAt: new Date()
      },
      select: {
        id: true,
        content: true,
        translatedContent: true,
        isTranslated: true,
        originalLanguage: true,
        translationProvider: true,
        translationModel: true,
        translatedAt: true
      }
    });

    console.log(`[推文翻译API] 翻译完成: ${tweetId}`);

    return NextResponse.json({
      success: true,
      data: {
        tweet: updatedTweet,
        translation: translationResult
      }
    });

  } catch (error) {
    console.error('[推文翻译API] 处理失败:', error);

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