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

// GET - 获取单个文章类型
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const articleType = await prisma.articleType.findUnique({
      where: { id },
    });

    if (!articleType) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '文章类型不存在' }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: articleType
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

// PUT - 更新文章类型
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, typeId, description, isDefault } = body;

    // 构建更新数据
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid name' }
          },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (typeId !== undefined) {
      if (typeof typeId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(typeId)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid typeId format' }
          },
          { status: 400 }
        );
      }
      updateData.typeId = typeId.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isDefault !== undefined) {
      updateData.isDefault = Boolean(isDefault);
    }

    const updatedType = await prisma.articleType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: '文章类型更新成功',
      data: updatedType
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '文章类型不存在' }
        },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_VALUE',
            message: field === 'name' ? '类型名称已存在' : '类型ID已存在'
          }
        },
        { status: 409 }
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

// DELETE - 删除文章类型
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    // 检查是否为默认类型
    const articleType = await prisma.articleType.findUnique({
      where: { id },
    });

    if (!articleType) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '文章类型不存在' }
        },
        { status: 404 }
      );
    }

    if (articleType.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: '不能删除默认类型' }
        },
        { status: 403 }
      );
    }

    await prisma.articleType.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '文章类型删除成功'
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '文章类型不存在' }
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