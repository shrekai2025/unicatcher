import { NextRequest, NextResponse } from 'next/server';

/**
 * 推文评论生成独立外部API (无需数据库)
 * POST /api/external/generate-comments-standalone
 *
 * 此接口允许外部项目传入推文信息生成AI评论，无需将数据存储到unicatcher数据库中
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[独立评论生成API] 收到请求');

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
      // 必需参数
      content,
      aiConfig,

      // 可选的推文元数据
      tweetId,
      tweetUrl,
      authorUsername,
      authorNickname,

      // 生成配置参数
      commentCount = 3,
      commentLength = 'medium',
      language = 'zh-CN',
      userInfo = '',
      systemPrompt = '',

      // 现有评论相关（可选，一般不会使用因为是外部传入）
      existingComments = [],

      // 参考数据参数（可选）
      referenceTweetCategoryId,
      referenceCount = 5
    } = body;

    // 验证必需参数 - 内容
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

    // 验证生成参数
    if (typeof commentCount !== 'number' || commentCount < 1 || commentCount > 10) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid commentCount: must be number between 1-10' }
        },
        { status: 400 }
      );
    }

    if (!['short', 'medium', 'long'].includes(commentLength)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid commentLength: must be short|medium|long' }
        },
        { status: 400 }
      );
    }

    if (!['zh-CN', 'en-US'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid language: must be zh-CN|en-US' }
        },
        { status: 400 }
      );
    }

    // 验证参考数据参数（可选）
    if (referenceTweetCategoryId && typeof referenceTweetCategoryId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid referenceTweetCategoryId: must be string' }
        },
        { status: 400 }
      );
    }

    if (typeof referenceCount !== 'number' || referenceCount < 0 || referenceCount > 20) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid referenceCount: must be number between 0-20' }
        },
        { status: 400 }
      );
    }

    console.log(`[独立评论生成API] 为推文生成 ${commentCount} 条${commentLength}评论, 语言: ${language}, AI供应商: ${aiConfig.provider}, 推文ID: ${tweetId || 'N/A'}, 参考分类: ${referenceTweetCategoryId || '无'}, 参考数量: ${referenceCount}`);

    // 为了调用内部API，我们需要提供一个临时tweetId（不会存储到数据库）
    const tempTweetId = tweetId || `temp-${Date.now()}`;

    // 调用内部评论生成接口，使用临时ID和传入的内容
    const internalResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tweet-processor/generate-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweetId: tempTweetId,
        content: content,
        authorUsername: authorUsername,
        authorNickname: authorNickname,
        tweetUrl: tweetUrl,
        userInfo: userInfo,
        systemPrompt: systemPrompt,
        includeExistingComments: existingComments.length > 0,
        commentCount: commentCount,
        commentLength: commentLength,
        language: language,
        aiConfig: aiConfig,
        referenceTweetCategoryId: referenceTweetCategoryId,
        referenceCount: referenceCount
      })
    });

    const result = await internalResponse.json();

    if (!internalResponse.ok) {
      console.error('[独立评论生成API] 内部接口错误:', result);
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

    const generatedComments = result.data?.comments || [];
    console.log(`[独立评论生成API] 评论生成成功，生成 ${generatedComments.length} 条评论`);

    // 返回结果，包含原始推文信息但不存储到数据库
    return NextResponse.json({
      success: true,
      message: `成功生成 ${generatedComments.length} 条评论`,
      data: {
        // 原始推文信息 (如果提供)
        tweetId: tweetId || null,
        tweetUrl: tweetUrl || null,
        authorUsername: authorUsername || null,
        authorNickname: authorNickname || null,

        // 推文内容
        tweetContent: content,

        // 生成的评论
        comments: generatedComments,
        commentCount: generatedComments.length,

        // 生成配置
        commentLength: commentLength,
        language: language,
        basedOnExistingComments: existingComments.length > 0,
        existingCommentsCount: existingComments.length,

        // AI配置信息
        aiProvider: aiConfig.provider,
        aiModel: aiConfig.model,

        // 时间信息
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[独立评论生成API] 处理失败:', error);

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