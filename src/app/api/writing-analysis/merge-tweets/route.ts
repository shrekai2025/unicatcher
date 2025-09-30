import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 合并Tweet和ManualTweetText数据到WritingAnalysisTweet表
export async function POST(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // 1. 从Tweet表获取指定username的数据
    const tweetData = await db.tweet.findMany({
      where: {
        userUsername: username,
        isDeleted: false // 排除已删除的推文
      },
      select: {
        id: true,
        content: true,
        userUsername: true,
        publishedAt: true
      }
    });

    // 2. 从ManualTweetText表获取指定username的数据
    const manualData = await db.manualTweetText.findMany({
      where: {
        userUsername: username
      },
      select: {
        id: true,
        tweetId: true,
        content: true,
        userUsername: true,
        publishedAt: true
      }
    });

    // 3. 合并数据并排重
    const mergedTweets = new Map<string, any>();

    // 添加Tweet表的数据
    for (const tweet of tweetData) {
      mergedTweets.set(tweet.id, {
        content: tweet.content,
        tweetId: tweet.id,
        userUsername: tweet.userUsername,
        publishedAt: tweet.publishedAt,
        sourceType: 'tweet',
        sourceId: tweet.id
      });
    }

    // 添加ManualTweetText表的数据（如果tweetId重复，优先保留Tweet表的数据）
    for (const manual of manualData) {
      if (!mergedTweets.has(manual.tweetId)) {
        mergedTweets.set(manual.tweetId, {
          content: manual.content,
          tweetId: manual.tweetId,
          userUsername: manual.userUsername,
          publishedAt: manual.publishedAt,
          sourceType: 'manual',
          sourceId: manual.id.toString()
        });
      }
    }

    // 4. 按publishedAt时间排序
    const sortedTweets = Array.from(mergedTweets.values()).sort((a, b) => {
      return Number(a.publishedAt) - Number(b.publishedAt);
    });

    // 5. 检查是否已存在数据，避免重复插入
    const existingTweets = await db.writingAnalysisTweet.findMany({
      where: {
        userUsername: username
      },
      select: {
        tweetId: true
      }
    });

    const existingTweetIds = new Set(existingTweets.map(t => t.tweetId));

    // 6. 过滤出需要插入的新数据
    const newTweets = sortedTweets.filter(tweet => !existingTweetIds.has(tweet.tweetId));

    let insertedCount = 0;

    // 7. 批量插入到WritingAnalysisTweet表
    if (newTweets.length > 0) {
      await db.writingAnalysisTweet.createMany({
        data: newTweets.map(tweet => ({
          content: tweet.content,
          tweetId: tweet.tweetId,
          userUsername: tweet.userUsername,
          publishedAt: tweet.publishedAt,
          sourceType: tweet.sourceType,
          sourceId: tweet.sourceId
        }))
      });
      insertedCount = newTweets.length;
    }

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      message: `Successfully merged tweets for user: ${username}`,
      data: {
        username,
        totalFound: sortedTweets.length,
        newInserted: insertedCount,
        existingSkipped: sortedTweets.length - insertedCount,
        fromTweetTable: tweetData.length,
        fromManualTable: manualData.length,
        mergedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Writing Analysis - Merge tweets error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to merge tweet data for writing analysis'
      },
      { status: 500 }
    );
  }
}

// 获取指定用户的写作分析推文数据
export async function GET(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // 查询指定用户的写作分析推文数据
    const tweets = await db.writingAnalysisTweet.findMany({
      where: {
        userUsername: username
      },
      orderBy: {
        publishedAt: 'asc' // 按发布时间升序排列
      },
      skip: offset,
      take: limit
    });

    // 统计总数
    const total = await db.writingAnalysisTweet.count({
      where: {
        userUsername: username
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        tweets,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + tweets.length < total
        },
        queriedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Writing Analysis - Get tweets error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to retrieve writing analysis tweets'
      },
      { status: 500 }
    );
  }
}