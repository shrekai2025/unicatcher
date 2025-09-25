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

// GET - 获取所有文章类型
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const articleTypes = await prisma.articleType.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ],
    });

    return NextResponse.json({
      success: true,
      data: articleTypes
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

// POST - 创建文章类型
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, typeId, description, isDefault } = body;

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

    if (!typeId || typeof typeId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(typeId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid typeId format. Only letters, numbers, underscore and hyphen are allowed' }
        },
        { status: 400 }
      );
    }

    const articleType = await prisma.articleType.create({
      data: {
        name: name.trim(),
        typeId: typeId.trim(),
        description: description?.trim(),
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({
      success: true,
      message: '文章类型创建成功',
      data: articleType
    });

  } catch (error: any) {
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

// PUT - 批量操作
export async function PUT(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { id, action } = body;

    if (action === 'setDefault' && id) {
      // 先清除所有默认项
      await prisma.articleType.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // 设置新的默认项
      const updatedType = await prisma.articleType.update({
        where: { id },
        data: { isDefault: true },
      });

      return NextResponse.json({
        success: true,
        message: '默认类型设置成功',
        data: updatedType
      });
    }

    if (action === 'initDefaults') {
      const existingDefault = await prisma.articleType.findFirst({
        where: { isDefault: true },
      });

      if (!existingDefault) {
        const defaultType = await prisma.articleType.create({
          data: {
            name: "默认类型",
            typeId: "default",
            description: "系统默认文章类型",
            isDefault: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: '默认类型初始化成功',
          data: defaultType
        });
      }

      return NextResponse.json({
        success: true,
        message: '默认类型已存在',
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