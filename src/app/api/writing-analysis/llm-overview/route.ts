import { NextRequest, NextResponse } from 'next/server';
import { llmWritingOverviewService } from '~/server/services/llm-writing-overview';
import { db } from '~/server/db';

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 生成或更新LLM写作概览
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
    const {
      username,
      action = 'generate', // generate | update | regenerate
      newTweets = [] // 用于增量更新的新推文
    } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    console.log(`🎯 LLM概览请求: ${username}, 操作: ${action}`);

    // 检查用户是否有推文数据
    const tweetCount = await db.writingAnalysisTweet.count({
      where: { userUsername: username }
    });

    if (tweetCount === 0) {
      return NextResponse.json(
        {
          error: `No tweets found for user: ${username}`,
          suggestion: 'Please run merge-tweets first'
        },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'generate':
        // 生成初始概览（如果已存在则返回现有的）
        const existingOverview = await llmWritingOverviewService.getCurrentOverview(username);
        if (existingOverview) {
          result = {
            type: 'existing',
            overview: existingOverview,
            message: 'Overview already exists for this user'
          };
        } else {
          const overview = await llmWritingOverviewService.generateInitialOverview(username);
          result = {
            type: 'generated',
            overview,
            message: 'Successfully generated initial writing overview'
          };
        }
        break;

      case 'regenerate':
        // 强制重新生成概览
        const overview = await llmWritingOverviewService.generateInitialOverview(username);
        result = {
          type: 'regenerated',
          overview,
          message: 'Successfully regenerated writing overview'
        };
        break;

      case 'update':
        // 增量更新概览
        if (!newTweets || newTweets.length === 0) {
          return NextResponse.json(
            { error: 'newTweets array is required for update action' },
            { status: 400 }
          );
        }

        const updateResult = await llmWritingOverviewService.checkAndUpdateOverview(username, newTweets);
        result = {
          type: 'update',
          updated: updateResult.updated,
          changes: updateResult.changes,
          overview: updateResult.newOverview,
          message: updateResult.updated ? 'Overview updated successfully' : 'No update needed'
        };
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Supported actions: generate, update, regenerate` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('LLM写作概览错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to process LLM writing overview request'
      },
      { status: 500 }
    );
  }
}

// 获取LLM写作概览
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
    const includeStats = searchParams.get('stats') === 'true';

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // 获取概览数据
    const overview = await llmWritingOverviewService.getCurrentOverview(username);

    if (!overview) {
      return NextResponse.json(
        {
          error: `No LLM writing overview found for user: ${username}`,
          suggestion: 'Run POST /api/writing-analysis/llm-overview first'
        },
        { status: 404 }
      );
    }

    const responseData: any = {
      overview,
      hasOverview: true
    };

    // 如果需要统计信息
    if (includeStats) {
      const stats = await llmWritingOverviewService.getOverviewStats(username);
      responseData.stats = stats;
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('获取LLM写作概览错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to retrieve LLM writing overview'
      },
      { status: 500 }
    );
  }
}

// 删除LLM写作概览
export async function DELETE(request: NextRequest) {
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

    // 检查概览是否存在
    const overview = await llmWritingOverviewService.getCurrentOverview(username);
    if (!overview) {
      return NextResponse.json(
        { error: `No overview found for user: ${username}` },
        { status: 404 }
      );
    }

    // 删除概览和相关日志
    await db.userWritingOverview.delete({
      where: { username }
    });

    console.log(`🗑️ 已删除用户 ${username} 的LLM写作概览`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted writing overview for user: ${username}`
    });

  } catch (error) {
    console.error('删除LLM写作概览错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to delete LLM writing overview'
      },
      { status: 500 }
    );
  }
}