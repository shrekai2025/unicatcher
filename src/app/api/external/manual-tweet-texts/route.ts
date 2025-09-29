import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { data } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid data array' }
        },
        { status: 400 }
      );
    }

    // 验证每个数据项
    for (const item of data) {
      if (!item.categoryId || typeof item.categoryId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Missing or invalid categoryId in data item' }
          },
          { status: 400 }
        );
      }

      if (!item.content || typeof item.content !== 'string' || item.content.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Missing or invalid content in data item' }
          },
          { status: 400 }
        );
      }

      if (!item.tweetId || typeof item.tweetId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Missing or invalid tweetId in data item' }
          },
          { status: 400 }
        );
      }

      if (!item.userUsername || typeof item.userUsername !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Missing or invalid userUsername in data item' }
          },
          { status: 400 }
        );
      }

      if (!item.publishedAt || typeof item.publishedAt !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Missing or invalid publishedAt (must be timestamp) in data item' }
          },
          { status: 400 }
        );
      }
    }

    // 验证所有分类ID是否存在
    const categoryIds = [...new Set(data.map(item => item.categoryId))];
    const categories = await prisma.manualTweetCategory.findMany({
      where: { id: { in: categoryIds } }
    });

    if (categories.length !== categoryIds.length) {
      const existingIds = categories.map(cat => cat.id);
      const missingIds = categoryIds.filter(id => !existingIds.includes(id));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `分类不存在: ${missingIds.join(', ')}`
          }
        },
        { status: 400 }
      );
    }

    // 批量创建文本数据
    const texts = await prisma.manualTweetText.createMany({
      data: data.map(item => ({
        categoryId: item.categoryId,
        content: item.content.trim(),
        tweetId: item.tweetId,
        userUsername: item.userUsername,
        publishedAt: BigInt(item.publishedAt)
      }))
    });

    return NextResponse.json({
      success: true,
      message: `成功添加 ${texts.count} 条文本数据`,
      data: {
        createdCount: texts.count,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name
        }))
      }
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
    const categoryId = searchParams.get('categoryId');

    const where = categoryId ? { categoryId } : {};

    const texts = await prisma.manualTweetText.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: texts.map(text => ({
        id: text.id,
        content: text.content,
        categoryId: text.categoryId,
        categoryName: text.category.name,
        tweetId: text.tweetId,
        userUsername: text.userUsername,
        publishedAt: text.publishedAt,
        createdAt: text.createdAt,
        updatedAt: text.updatedAt
      }))
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