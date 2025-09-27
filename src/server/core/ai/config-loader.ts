/**
 * AI配置加载器
 * 从数据库加载统一的AI服务商配置
 */

import { db } from '~/server/db';
import type { AIConfig } from './base/ai-types';

export class AIConfigLoader {
  /**
   * 根据provider获取完整的AI配置
   * @param provider AI服务商名称
   * @param model 模型名称
   * @returns 完整的AI配置
   */
  static async getConfig(provider: string, model: string): Promise<AIConfig> {
    const config = await db.aIProviderConfig.findUnique({
      where: { provider }
    });

    if (!config) {
      throw new Error(`AI服务商 ${provider} 未配置，请先在 /ai-settings 页面配置`);
    }

    if (!config.isActive) {
      throw new Error(`AI服务商 ${provider} 已禁用`);
    }

    return {
      provider: provider as 'openai' | 'openai-badger' | 'zhipu' | 'anthropic',
      model,
      apiKey: config.apiKey,
      baseURL: config.baseURL || undefined
    };
  }

  /**
   * 获取所有可用的AI服务商配置
   */
  static async getAllConfigs(): Promise<Record<string, { apiKey: string; baseURL?: string }>> {
    const configs = await db.aIProviderConfig.findMany({
      where: { isActive: true }
    });

    const result: Record<string, { apiKey: string; baseURL?: string }> = {};
    for (const config of configs) {
      result[config.provider] = {
        apiKey: config.apiKey,
        baseURL: config.baseURL || undefined
      };
    }

    return result;
  }

  /**
   * 检查某个provider是否已配置
   */
  static async isConfigured(provider: string): Promise<boolean> {
    const config = await db.aIProviderConfig.findUnique({
      where: { provider }
    });
    return !!config && config.isActive && !!config.apiKey;
  }
}