import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TweetResponse {
  tweet_id: string;
  content: string;
  publish_time: string;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limitStr = searchParams.get('limit');
    const cursorTweetId = searchParams.get('cursor'); // 可选：从某个推文ID开始（不包含该推文）

    // 验证必填参数
    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing required parameter: username' }
        },
        { status: 400 }
      );
    }

    if (!limitStr) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing required parameter: limit' }
        },
        { status: 400 }
      );
    }

    const limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit <= 0 || limit > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid limit: must be between 1 and 1000' }
        },
        { status: 400 }
      );
    }

    // 如果提供了cursor，先获取该推文的发布时间用于分页
    let cursorPublishedAt: bigint | null = null;
    if (cursorTweetId) {
      // 先从Tweet表查找
      const cursorTweetFromMain = await prisma.tweet.findUnique({
        where: { id: cursorTweetId },
        select: { publishedAt: true }
      });

      if (cursorTweetFromMain) {
        cursorPublishedAt = cursorTweetFromMain.publishedAt;
      } else {
        // 再从ManualTweetText表查找
        const cursorTweetFromManual = await prisma.manualTweetText.findUnique({
          where: { tweetId: cursorTweetId },
          select: { publishedAt: true }
        });

        if (cursorTweetFromManual) {
          cursorPublishedAt = cursorTweetFromManual.publishedAt;
        } else {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INVALID_REQUEST', message: 'Cursor tweet ID not found' }
            },
            { status: 400 }
          );
        }
      }
    }

    // 查询条件
    const whereCondition = {
      userUsername: username,
      isDeleted: false,
      ...(cursorPublishedAt ? { publishedAt: { lt: cursorPublishedAt } } : {})
    };

    // 从Tweet表查询（需要更多数据用于排序和去重）
    const tweetsFromMain = await prisma.tweet.findMany({
      where: whereCondition,
      select: {
        id: true,
        content: true,
        publishedAt: true
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: limit * 2 // 多取一些，考虑去重后可能不足
    });

    // 从ManualTweetText表查询
    const tweetsFromManual = await prisma.manualTweetText.findMany({
      where: {
        userUsername: username,
        ...(cursorPublishedAt ? { publishedAt: { lt: cursorPublishedAt } } : {})
      },
      select: {
        tweetId: true,
        content: true,
        publishedAt: true
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: limit * 2 // 多取一些，考虑去重后可能不足
    });

    // 合并数据并按推文ID去重
    const tweetMap = new Map<string, { id: string; content: string; publishedAt: bigint }>();

    // 先添加Tweet表的数据（优先级高）
    tweetsFromMain.forEach(tweet => {
      tweetMap.set(tweet.id, {
        id: tweet.id,
        content: tweet.content,
        publishedAt: tweet.publishedAt
      });
    });

    // 再添加ManualTweetText表的数据（如果tweetId已存在则跳过）
    tweetsFromManual.forEach(tweet => {
      if (!tweetMap.has(tweet.tweetId)) {
        tweetMap.set(tweet.tweetId, {
          id: tweet.tweetId,
          content: tweet.content,
          publishedAt: tweet.publishedAt
        });
      }
    });

    // 转换为数组并按publishedAt降序排序
    const mergedTweets = Array.from(tweetMap.values())
      .sort((a, b) => {
        if (a.publishedAt > b.publishedAt) return -1;
        if (a.publishedAt < b.publishedAt) return 1;
        return 0;
      })
      .slice(0, limit); // 取前limit条

    // 格式化返回数据
    const result: TweetResponse[] = mergedTweets.map(tweet => ({
      tweet_id: tweet.id,
      content: tweet.content,
      publish_time: new Date(Number(tweet.publishedAt)).toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        username,
        count: result.length,
        hasMore: result.length === limit // 如果返回数量等于limit，可能还有更多
      }
    });

  } catch (error) {
    console.error('Error fetching tweets by username:', error);
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
  } finally {
    await prisma.$disconnect();
  }
}