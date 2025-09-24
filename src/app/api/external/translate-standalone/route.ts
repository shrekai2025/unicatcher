import { NextRequest, NextResponse } from 'next/server';

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
      aiConfig,
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

    // 验证AI配置
    if (!aiConfig) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing aiConfig' }
        },
        { status: 400 }
      );
    }

    if (!aiConfig.apiKey || typeof aiConfig.apiKey !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig: apiKey is required' }
        },
        { status: 400 }
      );
    }

    if (!aiConfig.provider || !['openai', 'openai-badger', 'zhipu'].includes(aiConfig.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid aiConfig: provider must be openai|openai-badger|zhipu' }
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

    console.log(`[独立翻译API] 翻译内容长度: ${content.length}字符, 目标语言: ${targetLanguage}, AI供应商: ${aiConfig.provider}, 推文ID: ${tweetId || 'N/A'}`);

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
        translationProvider: aiConfig.provider,
        translationModel: aiConfig.model,
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