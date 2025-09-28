import { NextRequest, NextResponse } from 'next/server';
import { AIConfigLoader } from '~/server/core/ai/config-loader';

/**
 * 推文翻译外部API
 * POST /api/external/translate
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[外部翻译API] 收到请求');

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
      aiModel = 'gpt-4o'
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
      console.error('[外部翻译API] 加载配置失败:', error);
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

    console.log(`[外部翻译API] 翻译内容长度: ${content.length}字符, AI供应商: ${aiProvider}`);

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
      console.error('[外部翻译API] 内部接口错误:', result);
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

    console.log(`[外部翻译API] 翻译成功`);

    return NextResponse.json({
      success: true,
      message: '翻译成功',
      data: {
        originalContent: content,
        translatedContent: result.data?.translatedContent,
        originalLanguage: result.data?.originalLanguage,
        targetLanguage: result.data?.targetLanguage || targetLanguage,
        translationProvider: aiProvider,
        translationModel: aiModel,
        translatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[外部翻译API] 处理失败:', error);

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