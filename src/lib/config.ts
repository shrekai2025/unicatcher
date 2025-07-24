/**
 * UniCatcher 全局配置文件
 * 包含端口、Playwright、数据库等所有系统配置
 * 优化：从环境变量读取配置，避免硬编码
 */

import { env } from "~/env";

export const config = {
  // 应用配置
  app: {
    name: 'UniCatcher',
    version: '1.0.0',
    port: Number(process.env.PORT) || 3067,
    baseUrl: env.NEXTAUTH_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : `http://localhost:${Number(process.env.PORT) || 3067}`),
  },

  // Playwright配置
  playwright: {
    browser: 'chromium' as const,
    headless: false, // 可切换为false进行调试
    userDataDir: './data/browser-data',
    timeout: 30000, // 页面超时时间，可配置，默认30秒
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 0, // 调试时可设置为100ms
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    },
    // 浏览器实例管理策略
    instanceStrategy: 'immediate_close', // 任务结束后立即关闭浏览器实例
    healthCheck: true, // 启用浏览器健康检查
  },

  // 数据库配置
  database: {
    url: env.DATABASE_URL,
    maxConnections: 10,
    connectionTimeout: 5000,
  },

  // 认证配置
  auth: {
    username: 'admin',
    password: 'a2885828',
    sessionMaxAge: 24 * 60 * 60, // 24小时（秒）
    secret: env.AUTH_SECRET,
  },

  // 爬虫任务配置
  spider: {
    maxConcurrentTasks: 3, // 最大并发任务数，可配置
    taskTimeout: 300000, // 5分钟（300秒）
    retryAttempts: 5, // 重试5次
    retryDelay: 5000, // 延迟重试时间，可配置
    enableRetry: true, // 重试机制开关，可配置
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // 随机延迟配置
    randomDelay: {
      enabled: true,
      minDelay: 1000, // 最小延迟1秒，可配置
      maxDelay: 3000, // 最大延迟3秒，可配置
    },
    // 数据提取配置
    extraction: {
      supportedTypes: ['text', 'links', 'images'], // 支持文本、链接、图片URL提取
      textIncludesLinks: true, // 文本提取包含链接
    },
    // 页面交互配置
    interaction: {
      enableClick: true, // 支持点击操作
      enableScroll: true, // 支持滚动操作
      enableFormInteraction: false, // 暂不支持表单交互
    },
    // 爬取策略配置
    crawlStrategy: {
      enablePagination: false, // 分页爬取：按实际情况决定
      enableLinkFollowing: false, // 链接追踪：按实际情况决定
      enableDeepCrawl: false, // 不启用自动深度爬取
      taskExecution: 'sequential', // 按顺序执行，不支持优先级
    },
    // 选择器支持配置
    selectors: {
      supportCSS: true, // 支持CSS选择器
      supportXPath: true, // 支持XPath选择器（在模板中定义具体使用方式）
    },
    // Twitter List 爬取专用配置
    twitterList: {
      waitTime: 3000, // 页面加载和滚动等待时间（3秒，减少等待时间）
      scrollTrigger: 80, // 滚动到距离底部80px时触发加载
      maxTweets: 20, // 最大爬取推文数量
      duplicateStopCount: 2, // 连续遇到数据库重复推文时停止爬取（从2提高到5，减少首次爬取时的提前退出）
      // Retweet识别选择器
      retweetSelector: 'svg[viewBox="0 0 24 24"] path[d*="M4.75 3.79l4.603 4.3"]', // 转发图标特征
      retweetTextSelector: '[data-testid="socialContext"]', // 包含"reposted"文本的元素
    },
  },

  // 日志配置
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info' as const,
    maxFiles: 30,
    maxSize: '10MB',
    logDir: './data/logs',
  },

  // 数据目录配置
  directories: {
    data: './data',
    database: './data/database',
    logs: './data/logs',
    browserData: './data/browser-data',
  },
} as const;

// 配置类型定义
export type Config = typeof config;
export type BrowserType = typeof config.playwright.browser;
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'; 