import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

export async function GET(request: NextRequest) {
  try {
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

    const config = await db.aICommentConfig.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        systemPromptTemplate: config?.systemPromptTemplate || '',
        updatedAt: config?.updatedAt || null
      }
    });
  } catch (error) {
    console.error('[AI评论配置API] 查询失败:', error);
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

export async function PUT(request: NextRequest) {
  try {
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
    const { systemPromptTemplate } = body;

    if (typeof systemPromptTemplate !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'systemPromptTemplate must be a string' }
        },
        { status: 400 }
      );
    }

    const existingConfig = await db.aICommentConfig.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let config;
    if (existingConfig) {
      config = await db.aICommentConfig.update({
        where: { id: existingConfig.id },
        data: { systemPromptTemplate }
      });
    } else {
      config = await db.aICommentConfig.create({
        data: { systemPromptTemplate }
      });
    }

    return NextResponse.json({
      success: true,
      message: '系统提示词已更新',
      data: {
        systemPromptTemplate: config.systemPromptTemplate,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('[AI评论配置API] 更新失败:', error);
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