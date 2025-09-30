import { NextRequest, NextResponse } from 'next/server';

/**
 * 推文更新外部API
 * POST /api/external/update-tweet
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[外部推文更新API] 收到请求');

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
    const { tweetId, force = false } = body;

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

    // 验证推文ID格式
    if (!/^\d{10,20}$/.test(tweetId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TWEET_ID', message: 'Invalid tweet ID format' }
        },
        { status: 400 }
      );
    }

    // 验证可选参数
    if (typeof force !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'force must be boolean' }
        },
        { status: 400 }
      );
    }

    console.log(`[外部推文更新API] 更新推文: ${tweetId} (强制: ${force})`);

    // 调用内部推文更新接口
    const internalResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tweet-processor/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || 'unicatcher-api-key-2024'
      },
      body: JSON.stringify({
        tweetId,
        force
      })
    });

    const result = await internalResponse.json();

    if (!internalResponse.ok) {
      console.error('[外部推文更新API] 内部接口错误:', result);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.code || 'UPDATE_FAILED',
            message: result.error || result.message || '推文更新失败'
          }
        },
        { status: internalResponse.status }
      );
    }

    console.log(`[外部推文更新API] 更新任务提交成功，任务ID: ${result.data?.taskId}`);

    return NextResponse.json({
      success: true,
      message: '推文更新任务已提交',
      data: {
        tweetId,
        taskId: result.data?.taskId,
        force,
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[外部推文更新API] 处理失败:', error);

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