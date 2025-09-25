import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API密钥验证
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey === 'unicatcher-api-key-demo';
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
    },
    { status: 401 }
  );
}

// GET - 获取写作辅助模块统计数据
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const [
      totalArticles,
      totalPlatforms,
      totalTypes,
      recentArticles,
      platformStats,
      typeStats,
    ] = await Promise.all([
      // 总文章数
      prisma.collectedArticle.count(),

      // 总平台数
      prisma.contentPlatform.count(),

      // 总类型数
      prisma.articleType.count(),

      // 最近7天的文章数
      prisma.collectedArticle.count({
        where: {
          collectedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 各平台文章统计
      prisma.contentPlatform.findMany({
        include: {
          collectedArticles: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              collectedArticles: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),

      // 各类型文章统计
      prisma.articleType.findMany({
        include: {
          collectedArticles: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              collectedArticles: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    // 处理平台统计数据
    const platformStatsData = platformStats.map(platform => ({
      id: platform.id,
      name: platform.name,
      platformId: platform.platformId,
      isDefault: platform.isDefault,
      articleCount: platform._count.collectedArticles,
    }));

    // 处理类型统计数据
    const typeStatsData = typeStats.map(type => ({
      id: type.id,
      name: type.name,
      typeId: type.typeId,
      isDefault: type.isDefault,
      articleCount: type._count.collectedArticles,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalArticles,
          totalPlatforms,
          totalTypes,
          recentArticles,
        },
        platforms: platformStatsData,
        types: typeStatsData,
        summary: {
          averageArticlesPerPlatform: totalPlatforms > 0 ? Math.round((totalArticles / totalPlatforms) * 100) / 100 : 0,
          averageArticlesPerType: totalTypes > 0 ? Math.round((totalArticles / totalTypes) * 100) / 100 : 0,
          weeklyGrowthRate: totalArticles > 0 ? Math.round((recentArticles / totalArticles) * 10000) / 100 : 0, // 百分比
        },
      },
    });

  } catch (error) {
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