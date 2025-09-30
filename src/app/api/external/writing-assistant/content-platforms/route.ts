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

// GET - 获取所有内容平台
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const platforms = await prisma.contentPlatform.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ],
    });

    return NextResponse.json({
      success: true,
      data: platforms
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

// POST - 创建内容平台
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, platformId, description, isDefault } = body;

    // 参数验证
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid name' }
        },
        { status: 400 }
      );
    }

    if (!platformId || typeof platformId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(platformId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid platformId format. Only letters, numbers, underscore and hyphen are allowed' }
        },
        { status: 400 }
      );
    }

    const platform = await prisma.contentPlatform.create({
      data: {
        name: name.trim(),
        platformId: platformId.trim(),
        description: description?.trim(),
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({
      success: true,
      message: '内容平台创建成功',
      data: platform
    });

  } catch (error: any) {
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

// PUT - 批量设置默认平台
export async function PUT(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { id, action } = body;

    if (action === 'setDefault' && id) {
      // 先清除所有默认项
      await prisma.contentPlatform.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // 设置新的默认项
      const updatedPlatform = await prisma.contentPlatform.update({
        where: { id },
        data: { isDefault: true },
      });

      return NextResponse.json({
        success: true,
        message: '默认平台设置成功',
        data: updatedPlatform
      });
    }

    if (action === 'initDefaults') {
      const existingDefault = await prisma.contentPlatform.findFirst({
        where: { isDefault: true },
      });

      if (!existingDefault) {
        const defaultPlatform = await prisma.contentPlatform.create({
          data: {
            name: "默认平台",
            platformId: "default",
            description: "系统默认内容平台",
            isDefault: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: '默认平台初始化成功',
          data: defaultPlatform
        });
      }

      return NextResponse.json({
        success: true,
        message: '默认平台已存在',
        data: existingDefault
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Invalid action or missing parameters' }
      },
      { status: 400 }
    );

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