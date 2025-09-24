import { NextRequest, NextResponse } from 'next/server';

/**
 * 推文翻译外部API
 * POST /api/external/translate
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[外部翻译API] 收到请求');

    // 解析请求体
    const body = await request.json();
    const { content, aiConfig } = body;

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

    if (!aiConfig || !aiConfig.provider || !aiConfig.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_AI_CONFIG', message: 'Missing or invalid AI configuration' }
        },
        { status: 400 }
      );
    }

    console.log(`[外部翻译API] 翻译内容长度: ${content.length}字符, AI供应商: ${aiConfig.provider}`);

    // 调用内部翻译接口
    const internalResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tweet-processor/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, aiConfig })
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
        targetLanguage: result.data?.targetLanguage || 'zh-CN',
        translationProvider: result.data?.translationProvider,
        translationModel: result.data?.translationModel,
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