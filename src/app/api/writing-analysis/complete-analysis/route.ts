import { NextRequest, NextResponse } from 'next/server';
import { tweetAnalysisService } from '~/server/services/tweet-analysis';
import { styleAnalysisService } from '~/server/services/style-analysis';
import { db } from '~/server/db';

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 完整的写作风格分析流程
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
      steps = ['merge', 'types', 'style'],
      options = {}
    } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const {
      forceUpdate = false,
      typeAnalysisLimit = 200,
      styleAnalysisLimit = 500
    } = options;

    const results: Record<string, any> = {};
    const startTime = Date.now();

    try {
      // 步骤1: 数据合并（如果需要）
      if (steps.includes('merge')) {
        console.log(`[${username}] 开始数据合并...`);

        // 检查是否已有数据
        const existingCount = await db.writingAnalysisTweet.count({
          where: { userUsername: username }
        });

        if (existingCount === 0 || forceUpdate) {
          // 执行数据合并 - 调用之前的合并接口逻辑
          const tweetData = await db.tweet.findMany({
            where: {
              userUsername: username,
              isDeleted: false
            },
            select: {
              id: true,
              content: true,
              userUsername: true,
              replyCount: true,
              retweetCount: true,
              likeCount: true,
              viewCount: true,
              publishedAt: true
            }
          });

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

          // 合并数据并排重
          const mergedTweets = new Map<string, any>();

          // 添加Tweet表的数据
          for (const tweet of tweetData) {
            mergedTweets.set(tweet.id, {
              content: tweet.content,
              tweetId: tweet.id,
              userUsername: tweet.userUsername,
              publishedAt: tweet.publishedAt,
              sourceType: 'tweet',
              sourceId: tweet.id,
              replyCount: tweet.replyCount,
              retweetCount: tweet.retweetCount,
              likeCount: tweet.likeCount,
              viewCount: tweet.viewCount
            });
          }

          // 添加ManualTweetText表的数据
          for (const manual of manualData) {
            if (!mergedTweets.has(manual.tweetId)) {
              mergedTweets.set(manual.tweetId, {
                content: manual.content,
                tweetId: manual.tweetId,
                userUsername: manual.userUsername,
                publishedAt: manual.publishedAt,
                sourceType: 'manual',
                sourceId: manual.id.toString(),
                replyCount: 0,
                retweetCount: 0,
                likeCount: 0,
                viewCount: 0
              });
            }
          }

          const sortedTweets = Array.from(mergedTweets.values()).sort((a, b) => {
            return Number(a.publishedAt) - Number(b.publishedAt);
          });

          // 清理旧数据（如果强制更新）
          if (forceUpdate && existingCount > 0) {
            await db.writingAnalysisTweet.deleteMany({
              where: { userUsername: username }
            });
          }

          // 批量插入
          if (sortedTweets.length > 0) {
            await db.writingAnalysisTweet.createMany({
              data: sortedTweets.map(tweet => ({
                content: tweet.content,
                tweetId: tweet.tweetId,
                userUsername: tweet.userUsername,
                publishedAt: tweet.publishedAt,
                sourceType: tweet.sourceType,
                sourceId: tweet.sourceId,
                replyCount: tweet.replyCount,
                retweetCount: tweet.retweetCount,
                likeCount: tweet.likeCount,
                viewCount: tweet.viewCount
              }))
            });
          }

          results.merge = {
            success: true,
            totalMerged: sortedTweets.length,
            fromTweetTable: tweetData.length,
            fromManualTable: manualData.length
          };
        } else {
          results.merge = {
            success: true,
            skipped: true,
            existingCount,
            message: 'Data already exists, use forceUpdate=true to regenerate'
          };
        }
      }

      // 步骤2: 推文类型分析
      if (steps.includes('types')) {
        console.log(`[${username}] 开始推文类型分析...`);

        const analysisResult = await tweetAnalysisService.batchAnalyzeTweets(username, typeAnalysisLimit);
        const typeDistribution = await tweetAnalysisService.getUserTypeDistribution(username);

        results.types = {
          success: true,
          typeDistribution,
          analyzedCount: analysisResult.analyzedCount, // 实际分析的推文数量
          requestedLimit: typeAnalysisLimit, // 请求的限制数量
          autoStyleUpdateTriggered: true // 标记已自动触发风格更新
        };
      }

      // 步骤3: 风格特征分析（类型化）
      if (steps.includes('style')) {
        console.log(`[${username}] 检查风格特征分析...`);

        // 如果类型分析刚执行过，风格档案已经自动更新，无需重复执行
        if (steps.includes('types')) {
          console.log(`[${username}] 风格档案已在类型分析后自动更新，跳过重复更新`);
        } else {
          // 只有在没有执行类型分析时才手动更新风格档案
          console.log(`[${username}] 开始类型化风格特征分析...`);
          await styleAnalysisService.updateUserAllTypeProfiles(username);
        }

        // 获取生成的风格档案统计
        const styleProfiles = await db.userStyleProfile.findMany({
          where: { username }
        });

        results.style = {
          success: true,
          typeBasedProfilesCount: styleProfiles.length,
          contentTypes: styleProfiles.map(p => p.contentType),
          message: steps.includes('types')
            ? '风格档案已在类型分析后自动更新'
            : '已生成类型化风格档案，每个内容类型都有独立的风格分析'
        };
      }

      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        message: `Complete analysis finished for user: ${username}`,
        data: {
          username,
          steps: steps,
          results,
          processingTime: `${processingTime}ms`,
          completedAt: new Date().toISOString()
        }
      });

    } catch (stepError) {
      console.error(`Analysis step failed for user ${username}:`, stepError);

      return NextResponse.json({
        success: false,
        error: stepError instanceof Error ? stepError.message : 'Step execution failed',
        data: {
          username,
          completedSteps: Object.keys(results),
          partialResults: results,
          processingTime: `${Date.now() - startTime}ms`
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Complete analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to complete writing analysis'
      },
      { status: 500 }
    );
  }
}

// 获取用户完整分析状态
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

    // 检查各个分析步骤的完成状态
    const [
      tweetCount,
      typeAnnotationCount,
      styleProfiles
    ] = await Promise.all([
      db.writingAnalysisTweet.count({ where: { userUsername: username } }),
      db.tweetTypeAnnotation.count({ where: { username } }),
      db.userStyleProfile.findMany({ where: { username } })
    ]);

    const analysisStatus = {
      dataReady: tweetCount > 0,
      typesAnalyzed: typeAnnotationCount > 0,
      styleAnalyzed: styleProfiles.length > 0,
      tweetCount,
      typeAnnotationCount,
      styleProfilesCount: styleProfiles.length,
      contentTypes: styleProfiles.map(p => p.contentType),
      lastStyleUpdate: styleProfiles.length > 0 ? Math.max(...styleProfiles.map(p => p.updatedAt.getTime())) : null
    };

    return NextResponse.json({
      success: true,
      data: {
        username,
        analysisStatus,
        queriedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get analysis status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to retrieve analysis status'
      },
      { status: 500 }
    );
  }
}