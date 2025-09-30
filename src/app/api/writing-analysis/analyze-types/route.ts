import { NextRequest, NextResponse } from 'next/server';
import { tweetAnalysisService } from '~/server/services/tweet-analysis';

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 批量分析推文类型
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
    const { username, limit } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const analysisLimit = Math.min(limit || 100, 500); // 最大500条

    // 执行批量分析
    await tweetAnalysisService.batchAnalyzeTweets(username, analysisLimit);

    // 获取分析后的类型分布
    const typeDistribution = await tweetAnalysisService.getUserTypeDistribution(username);

    return NextResponse.json({
      success: true,
      message: `Successfully analyzed tweet types for user: ${username}`,
      data: {
        username,
        analyzedLimit: analysisLimit,
        typeDistribution,
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Tweet type analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to analyze tweet types'
      },
      { status: 500 }
    );
  }
}

// 获取用户的推文类型分布
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

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // 获取用户的推文类型分布
    const typeDistribution = await tweetAnalysisService.getUserTypeDistribution(username);

    // 按百分比排序
    const sortedTypes = Object.entries(typeDistribution)
      .sort(([,a], [,b]) => b.percentage - a.percentage);

    return NextResponse.json({
      success: true,
      data: {
        username,
        typeDistribution,
        topTypes: sortedTypes.slice(0, 5).map(([type, stats]) => ({
          type,
          ...stats
        })),
        totalTypes: sortedTypes.length,
        queriedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get tweet types error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to retrieve tweet type distribution'
      },
      { status: 500 }
    );
  }
}