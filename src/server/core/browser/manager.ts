/**
 * 浏览器管理器
 * 负责Playwright浏览器实例的创建、管理和销毁
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { config } from '~/lib/config';
import type { BrowserConfig } from '~/types/spider';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isHealthy = true;
  private cleanupPromise?: Promise<void>; // 新增：防止重复关闭

  constructor(private readonly browserConfig: BrowserConfig) {}

  /**
   * 启动浏览器实例
   */
  async launch(): Promise<void> {
    try {
      // Playwright浏览器路径已在config.ts中动态设置
      
      console.log('正在启动浏览器...');
      console.log('浏览器启动参数:', {
        headless: this.browserConfig.headless,
        viewport: this.browserConfig.viewport,
        userAgent: this.browserConfig.userAgent,
        args: config.playwright.launchOptions.args,
        browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH
      });
      
      this.browser = await chromium.launch({
        headless: this.browserConfig.headless,
        args: [...config.playwright.launchOptions.args],
        slowMo: config.playwright.launchOptions.slowMo,
      });

      // 尝试加载登录状态
      const storageState = await this.loadStorageState();
      
      // 创建上下文 - 如果有storageState则使用，否则创建干净的上下文
      const contextOptions: any = {
        viewport: this.browserConfig.viewport,
        userAgent: this.browserConfig.userAgent,
      };
      
      // 只有在storageState有效时才使用
      if (storageState && this.isValidStorageState(storageState)) {
        contextOptions.storageState = storageState;
        console.log('使用已保存的登录状态创建浏览器上下文');
      } else {
        console.log('创建新的浏览器上下文（无登录状态）');
      }

      this.context = await this.browser.newContext(contextOptions);

      // 创建页面
      this.page = await this.context.newPage();
      
      // 设置页面超时
      this.page.setDefaultTimeout(this.browserConfig.timeout);
      
      // 设置资源拦截以节省带宽
      await this.setupResourceOptimization();
      
      // 监听页面错误
      this.page.on('pageerror', (error) => {
        console.error('页面错误:', error);
        this.isHealthy = false;
      });

      // 监听页面崩溃
      this.page.on('crash', () => {
        console.error('页面崩溃');
        this.isHealthy = false;
      });

      // 监听控制台消息（可能包含有用的错误信息）
      this.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('页面控制台错误:', msg.text());
        }
      });

      // 监听上下文关闭事件
      this.context.on('close', () => {
        console.log('浏览器上下文已关闭');
        this.isHealthy = false;
      });

      // 监听页面关闭事件
      this.page.on('close', () => {
        console.log('页面已关闭');
        this.isHealthy = false;
      });

      // 监听浏览器进程断开连接
      this.browser.on('disconnected', () => {
        console.log('浏览器进程已断开连接');
        this.isHealthy = false;
      });

      console.log('浏览器启动成功');
    } catch (error) {
      console.error('浏览器启动失败:', error);
      await this.cleanup(); // 清理已创建的资源
      throw new Error(`浏览器启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取页面实例
   */
  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('浏览器未启动或页面未创建');
    }
    return this.page;
  }

  /**
   * 导航到指定URL
   */
  async navigateToUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    // 检查浏览器健康状态
    if (!this.isHealthy) {
      throw new Error('浏览器处于不健康状态，无法导航');
    }

    try {
      // 检查页面是否仍然可用
      if (this.page.isClosed()) {
        throw new Error('页面已关闭');
      }

      console.log(`正在导航到: ${url}`);
      
      // 使用更灵活的页面加载策略，适配无GUI环境
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded', // 改为domcontentloaded，不等待所有资源
        timeout: this.browserConfig.timeout,
      });

      // 无GUI环境需要更多时间等待内容渲染
      await this.page.waitForTimeout(5000);
      
      // 尝试等待基本内容加载
      try {
        await this.page.waitForSelector('body', { timeout: 10000 });
        console.log('页面body元素已加载');
      } catch (error) {
        console.warn('等待body元素超时，继续执行');
      }
      
      console.log('页面导航完成');
    } catch (error) {
      console.error('页面导航失败:', error);
      
      // 检查是否是页面关闭导致的错误
      if (this.page.isClosed() || !this.isHealthy) {
        throw new Error('浏览器页面已关闭，无法继续导航');
      }
      
      // 尝试备用导航策略
      try {
        console.log('尝试备用导航策略...');
        await this.page.goto(url, {
          waitUntil: 'networkidle', // 更宽松的等待条件
          timeout: 45000, // 增加超时时间
        });
        
        await this.page.waitForTimeout(2000);
        console.log('备用导航策略成功');
      } catch (retryError) {
        console.error('备用导航也失败:', retryError);
        throw new Error(`页面导航失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }

  /**
   * 等待元素出现
   */
  async waitForElement(selector: string, timeout?: number): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    try {
      await this.page.waitForSelector(selector, {
        timeout: timeout || this.browserConfig.timeout,
      });
    } catch (error) {
      console.error(`等待元素失败: ${selector}`, error);
      throw new Error(`等待元素失败: ${selector}`);
    }
  }

  /**
   * 滚动到页面底部（改进版：分步滚动，减少页面内重复）
   */
  async scrollToBottom(): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    try {
      // 获取当前滚动位置
      const beforeScroll = await this.page.evaluate(() => window.pageYOffset);
      
      // 分步滚动，每次滚动1.5个屏幕高度，确保有足够的新内容
      await this.page.evaluate(() => {
        const scrollStep = window.innerHeight * 1.5; // 滚动1.5个屏幕高度
        const currentScroll = window.pageYOffset;
        window.scrollTo({
          top: currentScroll + scrollStep,
          behavior: 'smooth'
        });
      });
      
      // 等待滚动动画完成
      await this.page.waitForTimeout(1500);
      
      // 验证滚动效果
      const afterScroll = await this.page.evaluate(() => window.pageYOffset);
      const scrollDistance = afterScroll - beforeScroll;
      
      console.log(`📜 滚动距离: ${scrollDistance}px (从 ${beforeScroll} 到 ${afterScroll})`);
      
      if (scrollDistance < 200) {
        console.log('⚠️ 滚动距离较小，可能已接近页面底部');
      }
      
      // 额外等待，确保Twitter的无限滚动加载新内容
      await this.page.waitForTimeout(config.spider.twitterList.waitTime);
    } catch (error) {
      console.error('滚动失败:', error);
      throw new Error('滚动失败');
    }
  }

  /**
   * 获取当前滚动位置
   */
  async getScrollPosition(): Promise<number> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    try {
      return await this.page.evaluate(() => {
        return window.pageYOffset || document.documentElement.scrollTop;
      });
    } catch (error) {
      console.error('获取滚动位置失败:', error);
      return 0;
    }
  }

  /**
   * 检查是否需要加载更多内容
   */
  async shouldLoadMore(): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      return await this.page.evaluate((scrollTrigger) => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        return (scrollTop + windowHeight) >= (documentHeight - scrollTrigger);
      }, config.spider.twitterList.scrollTrigger);
    } catch (error) {
      console.error('检查滚动位置失败:', error);
      return false;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!config.playwright.healthCheck) {
      return true; // 如果禁用健康检查，默认返回健康
    }

    if (!this.browser || !this.page) {
      return false;
    }

    try {
      // 简单的健康检查：尝试执行JavaScript
      await this.page.evaluate(() => document.title);
      return this.isHealthy;
    } catch (error) {
      console.error('浏览器健康检查失败:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * 截图（调试用）
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    try {
      await this.page.screenshot({ path, fullPage: true });
      console.log(`截图已保存: ${path}`);
    } catch (error) {
      console.error('截图失败:', error);
    }
  }

  /**
   * 关闭浏览器 - 改进版：防止重复关闭，并行清理
   */
  async close(): Promise<void> {
    // 防止重复关闭
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    this.cleanupPromise = this.performCleanup();
    return this.cleanupPromise;
  }

  /**
   * 执行清理操作 - 新增：并行清理和超时机制
   */
  private async performCleanup(): Promise<void> {
    try {
      // 设置关闭超时
      const cleanupTasks: Promise<void>[] = [];

      // 先保存登录状态
      try {
        await this.saveStorageState();
      } catch (error) {
        console.warn('保存登录状态失败:', error);
      }

      if (this.page && !this.page.isClosed()) {
        cleanupTasks.push(
          Promise.race([
            this.page.close(),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('页面关闭超时')), 5000)
            )
          ])
        );
      }

      if (this.context) {
        cleanupTasks.push(
          Promise.race([
            this.context.close(),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('上下文关闭超时')), 5000)
            )
          ])
        );
      }

      if (this.browser) {
        cleanupTasks.push(
          Promise.race([
            this.browser.close(),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('浏览器关闭超时')), 10000)
            )
          ])
        );
      }

      // 并行关闭所有资源
      await Promise.allSettled(cleanupTasks);

      console.log('浏览器资源清理完成');
    } catch (error) {
      console.error('浏览器清理失败:', error);
    } finally {
      // 强制清除所有引用
      this.page = null;
      this.context = null;
      this.browser = null;
      this.isHealthy = false;
    }
  }

  /**
   * 获取浏览器状态
   */
  getStatus(): {
    isRunning: boolean;
    isHealthy: boolean;
    hasPage: boolean;
  } {
    return {
      isRunning: !!this.browser,
      isHealthy: this.isHealthy,
      hasPage: !!this.page,
    };
  }

  /**
   * 加载存储的登录状态
   */
  private async loadStorageState(): Promise<any | undefined> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const storageStatePath = path.join(config.directories.data, 'browser-state.json');
      
      // 检查文件是否存在
      try {
        await fs.access(storageStatePath);
        const storageStateText = await fs.readFile(storageStatePath, 'utf8');
        const storageState = JSON.parse(storageStateText);
        console.log('已加载浏览器登录状态');
        return storageState;
      } catch (error) {
        console.log('未找到已保存的登录状态，将使用新会话');
        return undefined;
      }
    } catch (error) {
      console.error('加载登录状态失败:', error);
      return undefined;
    }
  }

  /**
   * 保存当前登录状态
   */
  private async saveStorageState(): Promise<void> {
    if (!this.context) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const storageStatePath = path.join(config.directories.data, 'browser-state.json');
      
      // 确保目录存在
      await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
      
      // 保存存储状态
      const storageState = await this.context.storageState();
      await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
      
      console.log('浏览器登录状态已保存');
    } catch (error) {
      console.error('保存登录状态失败:', error);
    }
  }

  /**
   * 清除保存的登录状态（登出功能）
   */
  async clearStorageState(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const storageStatePath = path.join(config.directories.data, 'browser-state.json');
      
      try {
        await fs.unlink(storageStatePath);
        console.log('已清除保存的登录状态');
      } catch (error) {
        // 文件不存在时忽略错误
        console.log('无需清除登录状态（文件不存在）');
      }
    } catch (error) {
      console.error('清除登录状态失败:', error);
    }
  }

  /**
   * 验证storageState是否有效
   */
  private isValidStorageState(storageState: any): boolean {
    try {
      if (!storageState || typeof storageState !== 'object') {
        return false;
      }
      
      // 检查基本结构
      if (!Array.isArray(storageState.cookies)) {
        return false;
      }
      
      // 检查是否有Twitter相关的cookies
      const hasTwitterCookies = storageState.cookies.some((cookie: any) => 
        cookie.domain && (cookie.domain.includes('x.com') || cookie.domain.includes('twitter.com'))
      );
      
      return hasTwitterCookies;
    } catch (error) {
      console.error('验证storageState失败:', error);
      return false;
    }
  }

  /**
   * 设置资源优化 - 拦截图片、视频等资源以节省带宽
   */
  private async setupResourceOptimization(): Promise<void> {
    if (!this.page || !config.playwright.resourceOptimization.enabled) {
      return;
    }

    try {
      const optimizationConfig = config.playwright.resourceOptimization;
      
      // 启用请求拦截
      await this.page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 资源拦截已禁用，直接跳过检查


        // 仅在调试模式下记录详细的资源访问日志
        if (optimizationConfig.logBlockedRequests) {
          if (optimizationConfig.allowedResourceTypes.includes(resourceType as any)) {
            console.log(`✅ 允许: ${resourceType} - ${url.substring(0, 60)}...`);
          }
        }
        
        route.continue();
      });

      console.log('✅ 浏览器资源优化已启用');
    } catch (error) {
      console.error('设置资源优化失败:', error);
      // 不抛出错误，继续正常执行
    }
  }

  /**
   * 根据资源类型获取对应的Content-Type
   */
  private getContentTypeForResource(resourceType: string): string {
    switch (resourceType) {
      case 'image':
        return 'image/png';
      case 'stylesheet':
        return 'text/css';
      case 'font':
        return 'font/woff2';
      case 'media':
        return 'video/mp4';
      default:
        return 'text/plain';
    }
  }

  /**
   * 根据资源类型返回空响应体
   */
  private getEmptyResponseForResource(resourceType: string): string | Buffer {
    switch (resourceType) {
      case 'image':
        // 返回1x1透明PNG图片的字节数据
        return Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
      case 'stylesheet':
        return '/* blocked stylesheet */';
      case 'font':
        return '';
      case 'media':
        return '';
      default:
        return '';
    }
  }

  /**
   * 清理已创建的资源（内部使用）
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('清理资源时出错:', error);
    }
  }

  /**
   * 静态工厂方法：创建并启动浏览器管理器
   */
  static async create(browserConfig?: Partial<BrowserConfig>): Promise<BrowserManager> {
    const defaultConfig: BrowserConfig = {
      headless: config.playwright.headless,
      timeout: config.playwright.timeout,
      viewport: config.playwright.viewport,
      userAgent: config.spider.userAgent,
      userDataDir: config.playwright.userDataDir,
    };

    const finalConfig = { ...defaultConfig, ...browserConfig };
    const manager = new BrowserManager(finalConfig);
    await manager.launch();
    
    return manager;
  }
} 