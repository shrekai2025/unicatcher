/**
 * AI 服务工厂
 * 根据配置创建对应的AI服务实例
 */

import { BaseAIService } from './base/ai-service.interface';
import type { AIConfig } from './base/ai-types';
import { OpenAIService, ZhipuService } from './providers';

export class AIServiceFactory {
  /**
   * 创建AI服务实例
   */
  static createService(config: AIConfig): BaseAIService {
    switch (config.provider) {
      case 'openai':
      case 'openai-badger':
        return new OpenAIService(config);
      
      case 'zhipu':
        return new ZhipuService(config);
      
      default:
        throw new Error(`不支持的AI供应商: ${config.provider}`);
    }
  }

  /**
   * 获取所有支持的供应商
   */
  static getSupportedProviders(): string[] {
    return ['openai', 'openai-badger', 'zhipu'];
  }

  /**
   * 获取供应商的默认模型
   */
  static getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'openai-badger':
        return 'gpt-4o-mini';
      case 'zhipu':
        return 'glm-4.5-flash';
      default:
        throw new Error(`不支持的AI供应商: ${provider}`);
    }
  }

  /**
   * 获取供应商支持的模型列表
   */
  static getSupportedModels(provider: string): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
      case 'openai-badger':
        return ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
      case 'zhipu':
        return ['glm-4.5-flash', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-x', 'glm-4.5-airx'];
      default:
        return [];
    }
  }
}
