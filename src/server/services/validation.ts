import { createAnalysisError } from './error-handling';

// 输入验证和清理
export class ValidationService {

  // SQL注入防护
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/[<>\"'`]/g, '') // 移除潜在的XSS字符
      .replace(/;\s*(drop|delete|update|insert|create|alter|truncate)/gi, '') // SQL注入防护
      .trim()
      .substring(0, 1000); // 限制长度
  }

  // 用户名验证
  static validateUsername(username: string): string {
    if (!username || typeof username !== 'string') {
      throw createAnalysisError('DATA_CORRUPTION', '用户名不能为空');
    }

    const sanitized = this.sanitizeInput(username);

    if (sanitized.length === 0) {
      throw createAnalysisError('DATA_CORRUPTION', '用户名格式无效');
    }

    if (sanitized.length > 50) {
      throw createAnalysisError('DATA_CORRUPTION', '用户名长度不能超过50字符');
    }

    // 检查特殊字符
    if (!/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/.test(sanitized)) {
      throw createAnalysisError('DATA_CORRUPTION', '用户名只能包含字母、数字、下划线、中文字符');
    }

    return sanitized;
  }

  // 分页参数验证
  static validatePagination(limit?: number, offset?: number) {
    const result = { limit: 100, offset: 0 };

    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 1) {
        throw createAnalysisError('DATA_CORRUPTION', 'limit必须是正整数');
      }
      result.limit = Math.min(limit, 1000); // 最大1000
    }

    if (offset !== undefined) {
      if (!Number.isInteger(offset) || offset < 0) {
        throw createAnalysisError('DATA_CORRUPTION', 'offset必须是非负整数');
      }
      result.offset = Math.min(offset, 100000); // 最大偏移量
    }

    return result;
  }

  // 推文内容验证
  static validateTweetContent(content: string): string {
    if (!content || typeof content !== 'string') {
      throw createAnalysisError('DATA_CORRUPTION', '推文内容不能为空');
    }

    // 移除过长的内容
    const sanitized = content.trim().substring(0, 10000);

    if (sanitized.length < 2) {
      throw createAnalysisError('INSUFFICIENT_DATA', '推文内容过短，无法分析');
    }

    return sanitized;
  }

  // 分析选项验证
  static validateAnalysisOptions(options: any) {
    const validatedOptions = {
      forceUpdate: false,
      typeAnalysisLimit: 200,
      styleAnalysisLimit: 500
    };

    if (options?.forceUpdate !== undefined) {
      if (typeof options.forceUpdate !== 'boolean') {
        throw createAnalysisError('DATA_CORRUPTION', 'forceUpdate必须是布尔值');
      }
      validatedOptions.forceUpdate = options.forceUpdate;
    }

    if (options?.typeAnalysisLimit !== undefined) {
      if (!Number.isInteger(options.typeAnalysisLimit) || options.typeAnalysisLimit < 1) {
        throw createAnalysisError('DATA_CORRUPTION', 'typeAnalysisLimit必须是正整数');
      }
      validatedOptions.typeAnalysisLimit = Math.min(options.typeAnalysisLimit, 500);
    }

    if (options?.styleAnalysisLimit !== undefined) {
      if (!Number.isInteger(options.styleAnalysisLimit) || options.styleAnalysisLimit < 1) {
        throw createAnalysisError('DATA_CORRUPTION', 'styleAnalysisLimit必须是正整数');
      }
      validatedOptions.styleAnalysisLimit = Math.min(options.styleAnalysisLimit, 1000);
    }

    return validatedOptions;
  }

  // 步骤验证
  static validateSteps(steps: any[]): string[] {
    const validSteps = ['merge', 'types', 'style'];

    if (!Array.isArray(steps)) {
      return validSteps; // 默认所有步骤
    }

    const invalidSteps = steps.filter(step => !validSteps.includes(step));
    if (invalidSteps.length > 0) {
      throw createAnalysisError(
        'DATA_CORRUPTION',
        `无效的步骤: ${invalidSteps.join(', ')}。有效步骤: ${validSteps.join(', ')}`
      );
    }

    return steps.length > 0 ? steps : validSteps;
  }

  // 数据一致性检查
  static async validateDataConsistency(username: string, db: any) {
    const issues: string[] = [];

    try {
      // 检查推文数据完整性
      const tweetCount = await db.writingAnalysisTweet.count({
        where: { userUsername: username }
      });

      // 检查类型标注数据
      const typeAnnotationCount = await db.tweetTypeAnnotation.count({
        where: { username }
      });

      // 检查风格档案
      const styleProfile = await db.userStyleProfile.findUnique({
        where: { username }
      });

      // 数据一致性验证
      if (tweetCount === 0) {
        issues.push('用户推文数据为空');
      }

      if (typeAnnotationCount > tweetCount) {
        issues.push('类型标注数量超过推文数量');
      }

      if (styleProfile && tweetCount < 10) {
        issues.push('推文数量过少，风格分析可能不准确');
      }

      // 检查孤立数据
      const orphanedAnnotations = await db.tweetTypeAnnotation.count({
        where: {
          username,
          tweet: null
        }
      });

      if (orphanedAnnotations > 0) {
        issues.push(`发现${orphanedAnnotations}条孤立的类型标注数据`);
      }

      return {
        valid: issues.length === 0,
        issues,
        stats: {
          tweetCount,
          typeAnnotationCount,
          hasStyleProfile: !!styleProfile,
          orphanedAnnotations
        }
      };

    } catch (error) {
      throw createAnalysisError(
        'DATABASE_ERROR',
        '数据一致性检查失败',
        { username, error: error instanceof Error ? error.message : error }
      );
    }
  }

  // 批量操作安全检查
  static validateBatchOperation(batchSize: number, maxBatchSize: number = 100) {
    if (batchSize <= 0 || batchSize > maxBatchSize) {
      throw createAnalysisError(
        'DATA_CORRUPTION',
        `批量操作大小必须在1-${maxBatchSize}之间`
      );
    }
  }
}

// 速率限制器
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1分钟
  ) {}

  checkRate(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 获取当前窗口内的请求
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => time > windowStart);

    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      throw createAnalysisError(
        'RATE_LIMIT_EXCEEDED',
        `请求频率过高，请在${Math.ceil(this.windowMs / 1000)}秒后重试`
      );
    }

    // 记录当前请求
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  // 清理过期数据
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// 全局速率限制器实例
export const globalRateLimiter = new RateLimiter(20, 60000); // 每分钟20次请求

// 定期清理
setInterval(() => {
  globalRateLimiter.cleanup();
}, 300000); // 每5分钟清理一次