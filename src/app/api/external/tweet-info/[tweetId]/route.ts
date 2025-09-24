import { NextRequest, NextResponse } from 'next/server';

/**
 * 推文信息查询外部API
 * GET /api/external/tweet-info/[tweetId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tweetId: string }> }
) {
  try {
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

    const { tweetId } = await params;
    console.log(`[外部推文信息API] 查询推文信息: ${tweetId}`);

    // 验证推文ID格式
    if (!tweetId || !/^\d{10,20}$/.test(tweetId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TWEET_ID', message: 'Invalid tweet ID format' }
        },
        { status: 400 }
      );
    }

    // 调用内部推文信息接口
    const internalResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/tweet-processor/tweet-info/${tweetId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const result = await internalResponse.json();

    if (!internalResponse.ok) {
      console.error('[外部推文信息API] 内部接口错误:', result);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code || 'QUERY_FAILED',
            message: result.error?.message || '推文信息查询失败'
          }
        },
        { status: internalResponse.status }
      );
    }

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tweet not found' }
        },
        { status: 404 }
      );
    }

    console.log(`[外部推文信息API] 成功获取推文信息: ${result.data.userUsername} - ${result.data.content?.substring(0, 50)}...`);

    // 格式化响应数据
    const tweetData = result.data;

    return NextResponse.json({
      success: true,
      message: '推文信息获取成功',
      data: {
        // 基本信息
        tweetId: tweetData.id,
        content: tweetData.content,
        author: {
          username: tweetData.userUsername,
          nickname: tweetData.userNickname,
          profileImage: tweetData.profileImageUrl
        },

        // 互动数据
        stats: {
          replyCount: tweetData.replyCount || 0,
          retweetCount: tweetData.retweetCount || 0,
          likeCount: tweetData.likeCount || 0,
          viewCount: tweetData.viewCount || 0,
          commentCount: tweetData.commentCount || 0
        },

        // 媒体内容
        media: {
          images: tweetData.imageUrls || [],
          videos: tweetData.videoUrls || null
        },

        // 翻译信息
        translation: tweetData.isTranslated ? {
          translatedContent: tweetData.translatedContent,
          originalLanguage: tweetData.originalLanguage,
          isTranslated: true,
          translationProvider: tweetData.translationProvider,
          translationModel: tweetData.translationModel,
          translatedAt: tweetData.translatedAt
        } : {
          isTranslated: false
        },

        // AI分析结果
        aiAnalysis: tweetData.aiProcessedAt ? {
          keywords: tweetData.keywords || [],
          topicTags: tweetData.topicTags || [],
          contentTypes: tweetData.contentTypes || [],
          isValueless: tweetData.isValueless || false,
          processedAt: tweetData.aiProcessedAt
        } : null,

        // 最近评论
        recentComments: tweetData.recentComments || [],

        // 时间信息
        publishedAt: tweetData.publishedAt,
        publishedAtFormatted: tweetData.publishedAtFormatted,
        tweetUrl: tweetData.tweetUrl,

        // 系统信息
        listId: tweetData.listId,
        createdAt: tweetData.createdAt,
        updatedAt: tweetData.updatedAt
      }
    });

  } catch (error) {
    console.error('[外部推文信息API] 处理失败:', error);

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