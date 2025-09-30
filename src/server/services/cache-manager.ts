// 缓存管理器 - 减少重复计算，提升性能

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

export class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600000) { // 默认1小时TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 300000); // 每5分钟清理一次
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    const now = Date.now();

    // 检查是否过期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccess = now;

    return item.data as T;
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();

    // 如果缓存已满，移除最少使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 1,
      lastAccess: now
    });
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // LRU驱逐
  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccess < oldestAccess) {
        oldestAccess = item.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // 清理过期项
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`清理了 ${expiredKeys.length} 个过期缓存项`);
    }
  }

  // 获取缓存统计
  getStats() {
    const now = Date.now();
    let expired = 0;
    let totalAccess = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      }
      totalAccess += item.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      averageAccess: totalAccess / this.cache.size || 0
    };
  }
}

// 特定于分析的缓存管理器
export class AnalysisCacheManager {
  private styleCache = new CacheManager(200, 7200000); // 风格缓存2小时
  private typeCache = new CacheManager(500, 3600000);  // 类型缓存1小时
  private computationCache = new CacheManager(100, 1800000); // 计算缓存30分钟

  // 缓存用户风格特征
  getUserStyleFeatures(username: string) {
    return this.styleCache.get(`style:${username}`);
  }

  setUserStyleFeatures(username: string, features: any) {
    this.styleCache.set(`style:${username}`, features);
  }

  // 缓存推文类型分布
  getUserTypeDistribution(username: string) {
    return this.typeCache.get(`types:${username}`);
  }

  setUserTypeDistribution(username: string, distribution: any) {
    this.typeCache.set(`types:${username}`, distribution);
  }

  // 缓存词汇分析结果
  getLexicalAnalysis(contentHash: string) {
    return this.computationCache.get(`lexical:${contentHash}`);
  }

  setLexicalAnalysis(contentHash: string, analysis: any) {
    this.computationCache.set(`lexical:${contentHash}`, analysis);
  }

  // 缓存句式分析结果
  getSyntacticAnalysis(contentHash: string) {
    return this.computationCache.get(`syntactic:${contentHash}`);
  }

  setSyntacticAnalysis(contentHash: string, analysis: any) {
    this.computationCache.set(`syntactic:${contentHash}`, analysis);
  }

  // 生成内容哈希（用于缓存key）
  generateContentHash(content: string): string {
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  // 清除用户相关缓存
  clearUserCache(username: string) {
    this.styleCache.delete(`style:${username}`);
    this.typeCache.delete(`types:${username}`);
  }

  // 获取所有缓存统计
  getAllStats() {
    return {
      style: this.styleCache.getStats(),
      type: this.typeCache.getStats(),
      computation: this.computationCache.getStats()
    };
  }
}

// 计算结果缓存装饰器
export function cached(ttl: number = 3600000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = new CacheManager(100, ttl);

    descriptor.value = async function (...args: any[]) {
      // 生成缓存key
      const key = `${propertyName}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      let result = cache.get(key);
      if (result !== null) {
        console.log(`缓存命中: ${propertyName}`);
        return result;
      }

      // 执行原方法
      result = await method.apply(this, args);

      // 缓存结果
      cache.set(key, result);

      return result;
    };
  };
}

// 任务元数据
interface TaskMetadata {
  key: string;
  description: string;
  startTime: number;
  promise: Promise<any>;
  cancel?: () => void;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
}

// 去重计算优化
export class DeduplicationManager {
  private runningTasks: Map<string, TaskMetadata> = new Map();
  private taskHistory: TaskMetadata[] = [];
  private maxHistorySize: number = 50;

  // 防止重复计算
  async deduplicate<T>(
    key: string,
    task: () => Promise<T>,
    description?: string
  ): Promise<T> {
    // 如果任务正在运行，等待其完成
    if (this.runningTasks.has(key)) {
      const existingTask = this.runningTasks.get(key)!;
      console.log(`等待重复任务完成: ${key}`);
      return await existingTask.promise as T;
    }

    // 创建可取消的任务
    let cancelled = false;
    const abortController: AbortController | null = null;

    const cancelFn = () => {
      cancelled = true;
      // abortController功能暂未实现,保留接口
      // 立即从运行列表中移除
      this.runningTasks.delete(key);
      console.log(`任务已标记为取消: ${key}`);
    };

    // 开始新任务
    const taskPromise = (async () => {
      // 定期检查取消标志
      const checkCancelled = () => {
        if (cancelled) {
          throw new Error('Task was cancelled');
        }
      };

      try {
        checkCancelled();
        const result = await task();
        checkCancelled();
        return result;
      } catch (error) {
        if (cancelled || (error instanceof Error && error.message === 'Task was cancelled')) {
          throw new Error('Task was cancelled');
        }
        throw error;
      }
    })();

    const metadata: TaskMetadata = {
      key,
      description: description || key,
      startTime: Date.now(),
      promise: taskPromise,
      cancel: cancelFn,
      status: 'running'
    };

    this.runningTasks.set(key, metadata);

    try {
      const result = await taskPromise;
      metadata.status = 'completed';
      this.addToHistory(metadata);
      return result;
    } catch (error) {
      const isCancelled = cancelled || (error instanceof Error && error.message === 'Task was cancelled');
      metadata.status = isCancelled ? 'cancelled' : 'failed';
      this.addToHistory(metadata);
      throw error;
    } finally {
      // 任务完成后清理
      this.runningTasks.delete(key);
    }
  }

  // 添加到历史记录
  private addToHistory(metadata: TaskMetadata): void {
    this.taskHistory.unshift({
      ...metadata,
      promise: Promise.resolve() // 不保存promise引用
    });

    // 限制历史记录大小
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(0, this.maxHistorySize);
    }
  }

  // 获取所有正在运行的任务
  getRunningTasks(): Array<{
    key: string;
    description: string;
    startTime: number;
    duration: number;
    status: string;
  }> {
    const now = Date.now();
    return Array.from(this.runningTasks.values()).map(task => ({
      key: task.key,
      description: task.description,
      startTime: task.startTime,
      duration: now - task.startTime,
      status: task.status
    }));
  }

  // 获取任务历史
  getTaskHistory(limit: number = 20): Array<{
    key: string;
    description: string;
    startTime: number;
    status: string;
  }> {
    return this.taskHistory.slice(0, limit).map(task => ({
      key: task.key,
      description: task.description,
      startTime: task.startTime,
      status: task.status
    }));
  }

  // 取消特定任务
  cancelTask(key: string): boolean {
    const task = this.runningTasks.get(key);
    if (!task) {
      console.log(`任务不存在或已完成: ${key}`);
      return false;
    }

    if (task.cancel) {
      // 更新状态
      task.status = 'cancelled';
      // 执行取消
      task.cancel();
      // 添加到历史
      this.addToHistory(task);
      console.log(`任务已取消: ${key}`);
      return true;
    }

    return false;
  }

  // 取消所有任务
  cancelAllTasks(): number {
    let cancelledCount = 0;
    const tasksToCancel = Array.from(this.runningTasks.entries());

    for (const [key, task] of tasksToCancel) {
      if (task.cancel) {
        task.status = 'cancelled';
        task.cancel();
        this.addToHistory(task);
        cancelledCount++;
      }
    }

    console.log(`取消了 ${cancelledCount} 个任务`);
    return cancelledCount;
  }

  // 获取正在运行的任务数量
  getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  // 清理所有任务
  clear(): void {
    this.runningTasks.clear();
  }

  // 获取任务详情
  getTaskDetail(key: string): TaskMetadata | null {
    return this.runningTasks.get(key) || null;
  }
}

// 预计算管理器
export class PrecomputationManager {
  private analysisCache: AnalysisCacheManager;

  constructor(analysisCache: AnalysisCacheManager) {
    this.analysisCache = analysisCache;
  }

  // 预计算用户风格特征
  async precomputeUserStyles(usernames: string[]) {
    console.log(`开始预计算 ${usernames.length} 个用户的风格特征...`);

    const promises = usernames.map(async (username) => {
      try {
        // 检查是否已缓存
        const cached = this.analysisCache.getUserStyleFeatures(username);
        if (cached) return;

        // 执行分析并缓存
        // 这里应该调用实际的分析方法
        console.log(`预计算用户 ${username} 的风格特征`);

      } catch (error) {
        console.error(`预计算用户 ${username} 失败:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // 预计算热门用户数据
  async precomputePopularUsers() {
    // 获取活跃用户列表
    const activeUsers = await this.getActiveUsers();

    // 预计算这些用户的分析数据
    await this.precomputeUserStyles(activeUsers);
  }

  private async getActiveUsers(): Promise<string[]> {
    // 这里应该从数据库获取活跃用户列表
    // 例如：最近有推文活动的用户
    return [];
  }
}

// 全局缓存实例
export const analysisCacheManager = new AnalysisCacheManager();
export const deduplicationManager = new DeduplicationManager();
export const precomputationManager = new PrecomputationManager(analysisCacheManager);

// 缓存统计API
export function getCacheStats() {
  return {
    analysis: analysisCacheManager.getAllStats(),
    runningTasks: deduplicationManager.getRunningTaskCount(),
    timestamp: new Date().toISOString()
  };
}