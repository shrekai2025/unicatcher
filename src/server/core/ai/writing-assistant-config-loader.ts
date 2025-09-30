/**
 * 写作辅助AI配置加载器
 * 专门用于LLM写作概览和生成功能的AI配置管理
 */

import { db } from '~/server/db';
import { AIConfigLoader } from './config-loader';
import type { AIConfig } from './base/ai-types';

export interface WritingAssistantAIConfig extends AIConfig {
  configName: string;
  temperature: number;
  maxTokens: number;
  description?: string;
  analysisModel?: string;
  generationModel?: string;
  updateCheckModel?: string;
}

export class WritingAssistantConfigLoader {
  /**
   * 获取默认的写作辅助AI配置
   */
  static async getDefaultConfig(): Promise<WritingAssistantAIConfig> {
    const config = await db.writingAssistantAIConfig.findFirst({
      where: {
        isActive: true,
        isDefault: true
      }
    });

    if (!config) {
      // 如果没有默认配置，尝试获取第一个活跃配置
      const firstActiveConfig = await db.writingAssistantAIConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });

      if (!firstActiveConfig) {
        throw new Error('未找到可用的写作辅助AI配置，请先在 /ai-settings 页面配置');
      }

      // 自动设置为默认配置
      await db.writingAssistantAIConfig.update({
        where: { id: firstActiveConfig.id },
        data: { isDefault: true }
      });

      return this.buildAIConfig(firstActiveConfig);
    }

    return this.buildAIConfig(config);
  }

  /**
   * 根据配置名称获取写作辅助AI配置
   */
  static async getConfigByName(configName: string): Promise<WritingAssistantAIConfig> {
    const config = await db.writingAssistantAIConfig.findUnique({
      where: {
        configName,
        isActive: true
      }
    });

    if (!config) {
      throw new Error(`未找到写作辅助AI配置: ${configName}`);
    }

    return this.buildAIConfig(config);
  }

  /**
   * 获取所有可用的写作辅助AI配置
   */
  static async getAllConfigs(): Promise<WritingAssistantAIConfig[]> {
    const configs = await db.writingAssistantAIConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { configName: 'asc' }
      ]
    });

    const results = [];
    for (const config of configs) {
      try {
        const aiConfig = await this.buildAIConfig(config);
        results.push(aiConfig);
      } catch (error) {
        console.warn(`跳过配置 ${config.configName}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取用于分析的AI配置（可能使用专门的分析模型）
   */
  static async getAnalysisConfig(configName?: string): Promise<WritingAssistantAIConfig> {
    const config = configName
      ? await this.getConfigByName(configName)
      : await this.getDefaultConfig();

    // 如果有专门的分析模型，使用它
    if (config.analysisModel) {
      return {
        ...config,
        model: config.analysisModel
      };
    }

    return config;
  }

  /**
   * 获取用于生成的AI配置（可能使用专门的生成模型）
   */
  static async getGenerationConfig(configName?: string): Promise<WritingAssistantAIConfig> {
    const config = configName
      ? await this.getConfigByName(configName)
      : await this.getDefaultConfig();

    // 如果有专门的生成模型，使用它
    if (config.generationModel) {
      return {
        ...config,
        model: config.generationModel
      };
    }

    return config;
  }

  /**
   * 获取用于更新检查的AI配置（通常使用更快的模型）
   */
  static async getUpdateCheckConfig(configName?: string): Promise<WritingAssistantAIConfig> {
    const config = configName
      ? await this.getConfigByName(configName)
      : await this.getDefaultConfig();

    // 如果有专门的更新检查模型，使用它
    if (config.updateCheckModel) {
      return {
        ...config,
        model: config.updateCheckModel,
        maxTokens: Math.min(config.maxTokens, 1500), // 更新检查通常不需要太多token
        temperature: Math.min(config.temperature, 0.2) // 更新检查需要更稳定的输出
      };
    }

    return config;
  }

  /**
   * 构建完整的AI配置对象
   */
  private static async buildAIConfig(dbConfig: any): Promise<WritingAssistantAIConfig> {
    // 从AI服务商配置中获取API密钥和baseURL
    const providerConfig = await AIConfigLoader.getConfig(dbConfig.provider, dbConfig.model);

    return {
      configName: dbConfig.configName,
      provider: providerConfig.provider,
      model: dbConfig.model,
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
      temperature: dbConfig.temperature,
      maxTokens: dbConfig.maxTokens,
      description: dbConfig.description,
      analysisModel: dbConfig.analysisModel,
      generationModel: dbConfig.generationModel,
      updateCheckModel: dbConfig.updateCheckModel
    };
  }

  /**
   * 检查是否有可用的写作辅助AI配置
   */
  static async hasAvailableConfig(): Promise<boolean> {
    const count = await db.writingAssistantAIConfig.count({
      where: { isActive: true }
    });
    return count > 0;
  }

  /**
   * 创建默认配置（如果不存在）
   */
  static async createDefaultConfigIfNotExists(): Promise<void> {
    const hasConfig = await this.hasAvailableConfig();
    if (hasConfig) return;

    console.log('🔧 创建默认写作辅助AI配置...');

    // 检查是否有可用的AI服务商配置
    const availableProviders = ['openai', 'anthropic', 'zhipu'];
    let defaultProvider = 'openai';
    let defaultModel = 'gpt-4o';

    for (const provider of availableProviders) {
      try {
        const isConfigured = await AIConfigLoader.isConfigured(provider);
        if (isConfigured) {
          defaultProvider = provider;
          if (provider === 'openai') defaultModel = 'gpt-4o';
          else if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
          else if (provider === 'zhipu') defaultModel = 'glm-4.5-flash';
          break;
        }
      } catch (error) {
        // 忽略错误，继续检查下一个
      }
    }

    await db.writingAssistantAIConfig.create({
      data: {
        configName: 'default',
        provider: defaultProvider,
        model: defaultModel,
        temperature: 0.3,
        maxTokens: 4000,
        isActive: true,
        isDefault: true,
        description: '默认写作辅助AI配置',
        updateCheckModel: defaultProvider === 'anthropic' ? 'claude-3-5-haiku-20241022' : undefined
      }
    });

    console.log(`✅ 已创建默认配置: ${defaultProvider}/${defaultModel}`);
  }
}