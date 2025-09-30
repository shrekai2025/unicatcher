// 写作分析模块的错误处理工具

export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export const AnalysisErrorCodes = {
  // 数据相关错误
  NO_TWEETS_FOUND: 'NO_TWEETS_FOUND',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  DUPLICATE_PROCESSING: 'DUPLICATE_PROCESSING',

  // 分析相关错误
  TYPE_ANALYSIS_FAILED: 'TYPE_ANALYSIS_FAILED',
  STYLE_ANALYSIS_FAILED: 'STYLE_ANALYSIS_FAILED',
  FEATURE_EXTRACTION_FAILED: 'FEATURE_EXTRACTION_FAILED',

  // 系统相关错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // 外部服务错误
  LLM_SERVICE_ERROR: 'LLM_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

export function createAnalysisError(
  code: keyof typeof AnalysisErrorCodes,
  message?: string,
  details?: any
): AnalysisError {
  const errorMessages = {
    NO_TWEETS_FOUND: '未找到用户推文数据',
    INSUFFICIENT_DATA: '数据量不足，无法进行可靠分析',
    DATA_CORRUPTION: '数据格式错误或损坏',
    DUPLICATE_PROCESSING: '重复处理请求',
    TYPE_ANALYSIS_FAILED: '推文类型分析失败',
    STYLE_ANALYSIS_FAILED: '风格特征分析失败',
    FEATURE_EXTRACTION_FAILED: '特征提取失败',
    DATABASE_ERROR: '数据库操作错误',
    MEMORY_LIMIT_EXCEEDED: '内存使用超限',
    TIMEOUT_ERROR: '处理超时',
    LLM_SERVICE_ERROR: 'LLM服务调用失败',
    RATE_LIMIT_EXCEEDED: '请求频率超限'
  };

  const statusCodes = {
    NO_TWEETS_FOUND: 404,
    INSUFFICIENT_DATA: 400,
    DATA_CORRUPTION: 400,
    DUPLICATE_PROCESSING: 409,
    TYPE_ANALYSIS_FAILED: 500,
    STYLE_ANALYSIS_FAILED: 500,
    FEATURE_EXTRACTION_FAILED: 500,
    DATABASE_ERROR: 500,
    MEMORY_LIMIT_EXCEEDED: 507,
    TIMEOUT_ERROR: 408,
    LLM_SERVICE_ERROR: 502,
    RATE_LIMIT_EXCEEDED: 429
  };

  return new AnalysisError(
    message || errorMessages[code],
    code,
    statusCodes[code],
    details
  );
}

// 重试机制
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 某些错误不应该重试
      if (error instanceof AnalysisError) {
        const noRetryErrors = [
          AnalysisErrorCodes.NO_TWEETS_FOUND,
          AnalysisErrorCodes.INSUFFICIENT_DATA,
          AnalysisErrorCodes.DATA_CORRUPTION
        ];

        if (noRetryErrors.includes(error.code as any)) {
          throw error;
        }
      }

      if (attempt === maxRetries) break;

      // 指数退避
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
}

// 数据验证
export function validateAnalysisInput(data: {
  username?: string;
  limit?: number;
  offset?: number;
}) {
  const errors: string[] = [];

  if (!data.username) {
    errors.push('用户名不能为空');
  } else if (typeof data.username !== 'string' || data.username.trim().length === 0) {
    errors.push('用户名格式无效');
  } else if (data.username.length > 100) {
    errors.push('用户名长度不能超过100字符');
  }

  if (data.limit !== undefined) {
    if (!Number.isInteger(data.limit) || data.limit < 1 || data.limit > 1000) {
      errors.push('limit参数必须是1-1000之间的整数');
    }
  }

  if (data.offset !== undefined) {
    if (!Number.isInteger(data.offset) || data.offset < 0) {
      errors.push('offset参数必须是非负整数');
    }
  }

  if (errors.length > 0) {
    throw createAnalysisError('DATA_CORRUPTION', `数据验证失败: ${errors.join(', ')}`);
  }
}

// 内存使用监控
export function checkMemoryUsage(threshold: number = 0.8) {
  const used = process.memoryUsage();
  const totalHeap = used.heapTotal;
  const usedHeap = used.heapUsed;
  const usage = usedHeap / totalHeap;

  if (usage > threshold) {
    throw createAnalysisError(
      'MEMORY_LIMIT_EXCEEDED',
      `内存使用率过高: ${(usage * 100).toFixed(1)}%`,
      { usage, threshold, memoryInfo: used }
    );
  }

  return usage;
}