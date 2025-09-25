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

// GET - 获取采集文章列表 (支持筛选和分页)
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100);

    // 筛选参数
    const platformIds = searchParams.get('platformIds')?.split(',').filter(Boolean) || [];
    const articleTypeIds = searchParams.get('articleTypeIds')?.split(',').filter(Boolean) || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const author = searchParams.get('author');
    const title = searchParams.get('title');

    // 构建筛选条件
    const where: any = {};

    if (platformIds.length > 0) {
      where.platforms = {
        some: {
          platformId: {
            in: platformIds,
          },
        },
      };
    }

    if (articleTypeIds.length > 0) {
      where.articleTypes = {
        some: {
          typeId: {
            in: articleTypeIds,
          },
        },
      };
    }

    if (startDate || endDate) {
      where.collectedAt = {};
      if (startDate) {
        where.collectedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.collectedAt.lte = new Date(endDate);
      }
    }

    if (author) {
      where.author = {
        contains: author,
      };
    }

    if (title) {
      where.title = {
        contains: title,
      };
    }

    const [articles, total] = await Promise.all([
      prisma.collectedArticle.findMany({
        where,
        include: {
          platforms: {
            include: {
              platform: true,
            },
          },
          articleTypes: {
            include: {
              articleType: true,
            },
          },
        },
        orderBy: { collectedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.collectedArticle.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        articles,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
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

// POST - 创建采集文章
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { title, author, content, platformIds, articleTypeIds } = body;

    // 参数验证
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid title' }
        },
        { status: 400 }
      );
    }

    if (!author || typeof author !== 'string' || author.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid author' }
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(platformIds) || platformIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid platformIds' }
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(articleTypeIds) || articleTypeIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid articleTypeIds' }
        },
        { status: 400 }
      );
    }

    // 验证平台和类型是否存在
    const [platforms, articleTypes] = await Promise.all([
      prisma.contentPlatform.findMany({
        where: { id: { in: platformIds } },
      }),
      prisma.articleType.findMany({
        where: { id: { in: articleTypeIds } },
      }),
    ]);

    if (platforms.length !== platformIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Some platform IDs do not exist' }
        },
        { status: 400 }
      );
    }

    if (articleTypes.length !== articleTypeIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Some article type IDs do not exist' }
        },
        { status: 400 }
      );
    }

    const article = await prisma.collectedArticle.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        content: content ? content.trim() : null,
        platforms: {
          create: platformIds.map((platformId: string) => ({
            platformId,
          })),
        },
        articleTypes: {
          create: articleTypeIds.map((typeId: string) => ({
            typeId,
          })),
        },
      },
      include: {
        platforms: {
          include: {
            platform: true,
          },
        },
        articleTypes: {
          include: {
            articleType: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '采集文章创建成功',
      data: article
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