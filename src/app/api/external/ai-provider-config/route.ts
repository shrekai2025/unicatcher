import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取所有AI服务商配置
 * GET /api/external/ai-provider-config
 */
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

    const configs = await db.aIProviderConfig.findMany({
      orderBy: { provider: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        providers: configs.map(config => ({
          id: config.id,
          provider: config.provider,
          apiKey: config.apiKey,
          baseURL: config.baseURL || '',
          isActive: config.isActive,
          updatedAt: config.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('[AI服务商配置API] 查询失败:', error);
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

/**
 * 批量更新AI服务商配置
 * PUT /api/external/ai-provider-config
 */
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
    const { providers } = body;

    if (!Array.isArray(providers)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'providers must be an array' }
        },
        { status: 400 }
      );
    }

    // 验证数据格式
    for (const provider of providers) {
      if (!provider.provider || typeof provider.provider !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Each provider must have a valid provider name' }
          },
          { status: 400 }
        );
      }
      if (provider.apiKey === undefined || provider.apiKey === null || typeof provider.apiKey !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Each provider must have apiKey field (can be empty string)' }
          },
          { status: 400 }
        );
      }
      if (provider.baseURL !== undefined && provider.baseURL !== null && typeof provider.baseURL !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'baseURL must be a string if provided' }
          },
          { status: 400 }
        );
      }
    }

    // 批量更新或创建
    const results = [];
    for (const providerData of providers) {
      const existing = await db.aIProviderConfig.findUnique({
        where: { provider: providerData.provider }
      });

      let config;
      if (existing) {
        config = await db.aIProviderConfig.update({
          where: { provider: providerData.provider },
          data: {
            apiKey: providerData.apiKey,
            baseURL: providerData.baseURL || null,
            isActive: providerData.isActive !== undefined ? providerData.isActive : true
          }
        });
      } else {
        config = await db.aIProviderConfig.create({
          data: {
            provider: providerData.provider,
            apiKey: providerData.apiKey,
            baseURL: providerData.baseURL || null,
            isActive: providerData.isActive !== undefined ? providerData.isActive : true
          }
        });
      }
      results.push(config);
    }

    return NextResponse.json({
      success: true,
      message: 'AI服务商配置已更新',
      data: {
        providers: results.map(config => ({
          id: config.id,
          provider: config.provider,
          apiKey: config.apiKey,
          baseURL: config.baseURL || '',
          isActive: config.isActive,
          updatedAt: config.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('[AI服务商配置API] 更新失败:', error);
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