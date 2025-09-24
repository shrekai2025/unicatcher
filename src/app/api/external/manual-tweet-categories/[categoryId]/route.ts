import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
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

    const { categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing categoryId' }
        },
        { status: 400 }
      );
    }

    // 检查分类是否存在
    const category = await prisma.manualTweetCategory.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { texts: true } } }
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '分类不存在' }
        },
        { status: 404 }
      );
    }

    // 删除分类（级联删除关联的文本数据）
    await prisma.manualTweetCategory.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({
      success: true,
      message: `分类 "${category.name}" 删除成功，同时删除了 ${category._count.texts} 条文本数据`,
      data: {
        deletedCategory: category.name,
        deletedTextsCount: category._count.texts
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