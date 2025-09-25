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

// GET - 获取单个内容平台
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const platform = await prisma.contentPlatform.findUnique({
      where: { id: params.id },
    });

    if (!platform) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '内容平台不存在' }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: platform
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

// PUT - 更新内容平台
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, platformId, description, isDefault } = body;

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

    if (platformId !== undefined) {
      if (typeof platformId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(platformId)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Invalid platformId format' }
          },
          { status: 400 }
        );
      }
      updateData.platformId = platformId.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isDefault !== undefined) {
      updateData.isDefault = Boolean(isDefault);
    }

    const updatedPlatform = await prisma.contentPlatform.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: '内容平台更新成功',
      data: updatedPlatform
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '内容平台不存在' }
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
            message: field === 'name' ? '平台名称已存在' : '平台ID已存在'
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

// DELETE - 删除内容平台
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    // 检查是否为默认平台
    const platform = await prisma.contentPlatform.findUnique({
      where: { id: params.id },
    });

    if (!platform) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '内容平台不存在' }
        },
        { status: 404 }
      );
    }

    if (platform.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: '不能删除默认平台' }
        },
        { status: 403 }
      );
    }

    await prisma.contentPlatform.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: '内容平台删除成功'
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: '内容平台不存在' }
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