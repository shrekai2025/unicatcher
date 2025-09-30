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

// GET - 获取单个采集文章
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const article = await prisma.collectedArticle.findUnique({
      where: { id },
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

    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '采集文章不存在' }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
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

// PUT - 更新采集文章
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const { title, author, content, platformIds, articleTypeIds } = body;

    // 构建更新数据
    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid title' }
          },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (author !== undefined) {
      if (typeof author !== 'string' || author.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid author' }
          },
          { status: 400 }
        );
      }
      updateData.author = author.trim();
    }

    if (content !== undefined) {
      updateData.content = content ? content.trim() : null;
    }

    // 验证并处理平台关联
    if (platformIds !== undefined) {
      if (!Array.isArray(platformIds) || platformIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid platformIds' }
          },
          { status: 400 }
        );
      }

      const platforms = await prisma.contentPlatform.findMany({
        where: { id: { in: platformIds } },
      });

      if (platforms.length !== platformIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Some platform IDs do not exist' }
          },
          { status: 400 }
        );
      }

      // 先删除现有关联
      await prisma.collectedArticlePlatform.deleteMany({
        where: { articleId: id },
      });

      updateData.platforms = {
        create: platformIds.map((platformId: string) => ({
          platformId,
        })),
      };
    }

    // 验证并处理类型关联
    if (articleTypeIds !== undefined) {
      if (!Array.isArray(articleTypeIds) || articleTypeIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid articleTypeIds' }
          },
          { status: 400 }
        );
      }

      const articleTypes = await prisma.articleType.findMany({
        where: { id: { in: articleTypeIds } },
      });

      if (articleTypes.length !== articleTypeIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Some article type IDs do not exist' }
          },
          { status: 400 }
        );
      }

      // 先删除现有关联
      await prisma.collectedArticleType.deleteMany({
        where: { articleId: id },
      });

      updateData.articleTypes = {
        create: articleTypeIds.map((typeId: string) => ({
          typeId,
        })),
      };
    }

    const updatedArticle = await prisma.collectedArticle.update({
      where: { id },
      data: updateData,
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
      message: '采集文章更新成功',
      data: updatedArticle
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '采集文章不存在' }
        },
        { status: 404 }
      );
    }

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

// DELETE - 删除采集文章
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    await prisma.collectedArticle.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '采集文章删除成功'
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '采集文章不存在' }
        },
        { status: 404 }
      );
    }

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