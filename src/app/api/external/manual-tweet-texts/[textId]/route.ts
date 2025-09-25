import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ textId: string }> }
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

    const { textId } = await params;
    const textIdNumber = parseInt(textId);

    if (!textId || isNaN(textIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid textId' }
        },
        { status: 400 }
      );
    }

    // 检查文本数据是否存在
    const text = await prisma.manualTweetText.findUnique({
      where: { id: textIdNumber },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '文本数据不存在' }
        },
        { status: 404 }
      );
    }

    // 删除文本数据
    await prisma.manualTweetText.delete({
      where: { id: textIdNumber }
    });

    return NextResponse.json({
      success: true,
      message: `文本数据删除成功`,
      data: {
        deletedTextId: textIdNumber,
        categoryName: text.category.name,
        content: text.content.substring(0, 50) + (text.content.length > 50 ? '...' : '')
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