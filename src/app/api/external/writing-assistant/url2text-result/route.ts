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

interface StoreResultRequest {
  originalUrl: string;
  title?: string;
  author?: string;
  text?: string;
  error?: string;
}

// POST - 存储URL2Text结果（供webhook调用）
export async function POST(request: NextRequest) {
  try {
    // 验证API密钥
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body: StoreResultRequest = await request.json();
    const { originalUrl, title, author, text, error } = body;

    // 参数验证
    if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: '缺少或无效的originalUrl参数' }
        },
        { status: 400 }
      );
    }

    // URL格式验证
    try {
      new URL(originalUrl.trim());
    } catch (urlError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_URL', message: '无效的URL格式' }
        },
        { status: 400 }
      );
    }

    // 存储结果到数据库
    const result = await prisma.uRL2TextResult.create({
      data: {
        originalUrl: originalUrl.trim(),
        title: title && title.trim() !== '' ? title.trim() : null,
        author: author && author.trim() !== '' ? author.trim() : null,
        content: text && text.trim() !== '' ? text.trim() : null,
        error: error && error.trim() !== '' ? error.trim() : null,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'URL2Text结果已成功存储',
      data: {
        id: result.id,
        originalUrl: result.originalUrl,
        hasTitle: !!result.title,
        hasAuthor: !!result.author,
        hasContent: !!result.content,
        hasError: !!result.error,
        createdAt: result.createdAt
      }
    });

  } catch (error) {
    console.error('Store URL2Text Result API Error:', error);
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

// GET - 获取URL2Text结果
export async function GET(request: NextRequest) {
  try {
    // 验证API密钥
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const originalUrl = searchParams.get('originalUrl');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where = originalUrl ? { originalUrl } : {};

    // 获取总数
    const total = await prisma.uRL2TextResult.count({ where });

    // 获取结果列表
    const results = await prisma.uRL2TextResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // 最大100条
      skip: offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        results: results.map(result => ({
          id: result.id,
          originalUrl: result.originalUrl,
          title: result.title,
          author: result.author,
          content: result.content,
          error: result.error,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Get URL2Text Results API Error:', error);
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