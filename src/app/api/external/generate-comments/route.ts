import { NextRequest, NextResponse } from 'next/server';

/**
 * 评论生成外部API
 * POST /api/external/generate-comments
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[外部评论生成API] 收到请求');

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
      tweetId,
      content,
      aiConfig,
      includeExistingComments = true,
      userInfo = '',
      systemPrompt = '',
      commentLength = 'medium',
      commentCount = 3,
      language = 'zh-CN',
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

    // 验证参数值
    if (!['short', 'medium', 'long'].includes(commentLength)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'commentLength must be short, medium, or long' }
        },
        { status: 400 }
      );
    }

    if (commentCount < 1 || commentCount > 10) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'commentCount must be between 1 and 10' }
        },
        { status: 400 }
      );
    }

    if (!['zh-CN', 'en-US'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'language must be zh-CN or en-US' }
        },
        { status: 400 }
      );
    }

    // 验证参考数据参数
    if (referenceTweetCategoryId && typeof referenceTweetCategoryId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'referenceTweetCategoryId must be string' }
        },
        { status: 400 }
      );
    }

    if (typeof referenceCount !== 'number' || referenceCount < 0 || referenceCount > 20) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'referenceCount must be number between 0-20' }
        },
        { status: 400 }
      );
    }

    console.log(`[外部评论生成API] 为推文 ${tweetId} 生成 ${commentCount} 条${commentLength}评论, 语言: ${language}, 参考分类: ${referenceTweetCategoryId || '无'}, 参考数量: ${referenceCount}`);

    // 调用内部评论生成接口
    const internalResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tweet-processor/generate-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweetId,
        content,
        aiConfig,
        includeExistingComments,
        userInfo,
        systemPrompt,
        commentLength,
        commentCount,
        language,
        referenceTweetCategoryId,
        referenceCount
      })
    });

    const result = await internalResponse.json();

    if (!internalResponse.ok) {
      console.error('[外部评论生成API] 内部接口错误:', result);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: result.error?.message || '评论生成服务失败'
          }
        },
        { status: internalResponse.status }
      );
    }

    console.log(`[外部评论生成API] 评论生成成功，生成 ${result.data?.comments?.length || 0} 条评论`);

    return NextResponse.json({
      success: true,
      message: `成功生成 ${result.data?.comments?.length || 0} 条评论`,
      data: {
        tweetId,
        comments: result.data?.comments || [],
        basedOnExistingComments: includeExistingComments,
        existingCommentsCount: result.data?.existingCommentsCount || 0,
        aiProvider: result.data?.aiProvider,
        aiModel: result.data?.aiModel,
        language,
        commentLength,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[外部评论生成API] 处理失败:', error);

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