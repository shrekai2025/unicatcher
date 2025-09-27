import { NextRequest, NextResponse } from 'next/server';
import { AIConfigLoader } from '~/server/core/ai/config-loader';

/**
 * 推文翻译独立外部API (无需数据库)
 * POST /api/external/translate-standalone
 *
 * 此接口允许外部项目传入推文信息进行翻译，无需将数据存储到unicatcher数据库中
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[独立翻译API] 收到请求');

    // 验证API密钥
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || apiKey !== 'unicatcher-api-key-demo') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const {
      content,
      targetLanguage = 'zh-CN',
      aiProvider = 'openai',
      aiModel = 'gpt-4o',
      // 可选的推文元数据，用于记录但不存储到数据库
      tweetId,
      tweetUrl,
      authorUsername,
      authorNickname
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

    // 验证AI提供商
    if (!['openai', 'openai-badger', 'zhipu', 'anthropic'].includes(aiProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid aiProvider: must be openai|openai-badger|zhipu|anthropic' }
        },
        { status: 400 }
      );
    }

    // 从数据库加载统一配置
    let aiConfig;
    try {
      aiConfig = await AIConfigLoader.getConfig(aiProvider, aiModel);
    } catch (error) {
      console.error('[独立翻译API] 加载配置失败:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: error instanceof Error ? error.message : 'Failed to load AI config'
          }
        },
        { status: 500 }
      );
    }

    // 验证目标语言
    if (!['zh-CN', 'en-US'].includes(targetLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid targetLanguage: must be zh-CN or en-US' }
        },
        { status: 400 }
      );
    }

    console.log(`[独立翻译API] 翻译内容长度: ${content.length}字符, 目标语言: ${targetLanguage}, AI供应商: ${aiProvider}, 推文ID: ${tweetId || 'N/A'}`);

    // 调用内部翻译接口
    const internalResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tweet-processor/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        targetLanguage,
        aiConfig
      })
    });

    const result = await internalResponse.json();

    if (!internalResponse.ok) {
      console.error('[独立翻译API] 内部接口错误:', result);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TRANSLATION_FAILED',
            message: result.error?.message || '翻译服务失败'
          }
        },
        { status: internalResponse.status }
      );
    }

    console.log(`[独立翻译API] 翻译成功`);

    // 返回结果，包含原始推文信息但不存储到数据库
    return NextResponse.json({
      success: true,
      message: '翻译成功',
      data: {
        // 原始推文信息 (如果提供)
        tweetId: tweetId || null,
        tweetUrl: tweetUrl || null,
        authorUsername: authorUsername || null,
        authorNickname: authorNickname || null,

        // 翻译内容
        originalContent: content,
        translatedContent: result.data?.translatedContent,

        // 翻译配置信息
        originalLanguage: result.data?.originalLanguage,
        targetLanguage: result.data?.targetLanguage || targetLanguage,
        translationProvider: aiProvider,
        translationModel: aiModel,
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