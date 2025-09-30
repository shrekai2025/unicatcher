import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';

// API Key认证
const API_KEYS = ['unicatcher-api-key-demo'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
  return API_KEYS.includes(apiKey || '');
}

// 获取写作辅助AI配置
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const configs = await db.writingAssistantAIConfig.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { configName: 'asc' }
      ]
    });

    const supportedProviders = AIServiceFactory.getSupportedProviders();
    const providerModels: Record<string, string[]> = {};

    for (const provider of supportedProviders) {
      providerModels[provider] = AIServiceFactory.getSupportedModels(provider);
    }

    return NextResponse.json({
      success: true,
      data: {
        configs,
        supportedProviders,
        providerModels
      }
    });

  } catch (error) {
    console.error('获取写作辅助AI配置失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to fetch writing assistant AI configs'
      },
      { status: 500 }
    );
  }
}

// 创建或更新写作辅助AI配置
export async function PUT(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Invalid request: configs must be an array' },
        { status: 400 }
      );
    }

    // 验证配置
    for (const config of configs) {
      if (!config.configName || !config.provider || !config.model) {
        return NextResponse.json(
          { error: 'Invalid config: configName, provider, and model are required' },
          { status: 400 }
        );
      }

      // 验证供应商和模型
      const supportedProviders = AIServiceFactory.getSupportedProviders();
      if (!supportedProviders.includes(config.provider)) {
        return NextResponse.json(
          { error: `Unsupported provider: ${config.provider}` },
          { status: 400 }
        );
      }

      const supportedModels = AIServiceFactory.getSupportedModels(config.provider);
      if (!supportedModels.includes(config.model)) {
        return NextResponse.json(
          { error: `Unsupported model for ${config.provider}: ${config.model}` },
          { status: 400 }
        );
      }
    }

    // 更新配置
    const updatedConfigs = [];

    for (const config of configs) {
      // 如果设置为默认配置，先取消其他配置的默认状态
      if (config.isDefault) {
        await db.writingAssistantAIConfig.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      const updatedConfig = await db.writingAssistantAIConfig.upsert({
        where: { configName: config.configName },
        update: {
          provider: config.provider,
          model: config.model,
          temperature: config.temperature || 0.3,
          maxTokens: config.maxTokens || 4000,
          isActive: config.isActive ?? true,
          isDefault: config.isDefault ?? false,
          description: config.description || null,
          analysisModel: config.analysisModel || null,
          generationModel: config.generationModel || null,
          updateCheckModel: config.updateCheckModel || null
        },
        create: {
          configName: config.configName,
          provider: config.provider,
          model: config.model,
          temperature: config.temperature || 0.3,
          maxTokens: config.maxTokens || 4000,
          isActive: config.isActive ?? true,
          isDefault: config.isDefault ?? false,
          description: config.description || null,
          analysisModel: config.analysisModel || null,
          generationModel: config.generationModel || null,
          updateCheckModel: config.updateCheckModel || null
        }
      });

      updatedConfigs.push(updatedConfig);
    }

    return NextResponse.json({
      success: true,
      message: 'Writing assistant AI configurations updated successfully',
      data: { configs: updatedConfigs }
    });

  } catch (error) {
    console.error('更新写作辅助AI配置失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to update writing assistant AI configs'
      },
      { status: 500 }
    );
  }
}

// 删除写作辅助AI配置
export async function DELETE(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const configName = searchParams.get('configName');

    if (!configName) {
      return NextResponse.json(
        { error: 'configName parameter is required' },
        { status: 400 }
      );
    }

    // 检查是否为默认配置
    const config = await db.writingAssistantAIConfig.findUnique({
      where: { configName }
    });

    if (!config) {
      return NextResponse.json(
        { error: `Configuration '${configName}' not found` },
        { status: 404 }
      );
    }

    if (config.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default configuration' },
        { status: 400 }
      );
    }

    await db.writingAssistantAIConfig.delete({
      where: { configName }
    });

    return NextResponse.json({
      success: true,
      message: `Configuration '${configName}' deleted successfully`
    });

  } catch (error) {
    console.error('删除写作辅助AI配置失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: 'Failed to delete writing assistant AI config'
      },
      { status: 500 }
    );
  }
}