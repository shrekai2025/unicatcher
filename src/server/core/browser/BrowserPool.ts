/**
 * 浏览器池基类
 * 为不同平台提供独立的浏览器实例池管理
 */

import { BrowserManager } from './manager';
import type { BrowserConfig } from '~/types/spider';

export abstract class BrowserPool {
  protected browsers: BrowserManager[] = [];
  protected availableBrowsers: BrowserManager[] = [];
  protected readonly maxPoolSize: number;
  protected waitingQueue: Array<{
    resolve: (browser: BrowserManager) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(maxPoolSize: number = 2) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * 获取浏览器实例
   */
  async getBrowser(): Promise<BrowserManager> {
    // 如果有可用浏览器，直接返回
    if (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
      console.log(`🔄 从池中获取浏览器，剩余可用: ${this.availableBrowsers.length}`);
      return browser;
    }

    // 如果池未满，创建新浏览器
    if (this.browsers.length < this.maxPoolSize) {
      console.log(`🆕 创建新浏览器实例 (${this.browsers.length + 1}/${this.maxPoolSize})`);
      const browser = await this.createBrowser();
      this.browsers.push(browser);
      return browser;
    }

    // 等待浏览器可用
    console.log(`⏳ 浏览器池已满，等待可用实例...`);
    return this.waitForAvailableBrowser();
  }

  /**
   * 归还浏览器到池中
   */
  async returnBrowser(browser: BrowserManager): Promise<void> {
    try {
      // 检查浏览器健康状态
      const isHealthy = await browser.healthCheck();

      if (isHealthy) {
        // 如果有等待中的请求，直接分配给它们
        if (this.waitingQueue.length > 0) {
          const waiter = this.waitingQueue.shift()!;
          console.log(`🔄 直接分配浏览器给等待中的请求，剩余等待: ${this.waitingQueue.length}`);
          waiter.resolve(browser);
          return;
        }

        // 否则加入可用池
        this.availableBrowsers.push(browser);
        console.log(`✅ 浏览器已归还到池中，当前可用: ${this.availableBrowsers.length}`);
      } else {
        // 不健康的浏览器，关闭并从池中移除
        console.warn(`⚠️ 浏览器不健康，从池中移除`);
        await this.removeBrowserFromPool(browser);
      }
    } catch (error) {
      console.error('归还浏览器失败:', error);
      await this.removeBrowserFromPool(browser);
    }
  }

  /**
   * 等待可用浏览器
   */
  private waitForAvailableBrowser(): Promise<BrowserManager> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // 从等待队列中移除
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('等待浏览器超时（30秒）'));
      }, 30000); // 30秒超时

      this.waitingQueue.push({
        resolve: (browser) => {
          clearTimeout(timeout);
          resolve(browser);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * 从池中移除浏览器
   */
  protected async removeBrowserFromPool(browser: BrowserManager): Promise<void> {
    try {
      // 关闭浏览器
      await browser.close();
    } catch (error) {
      console.error('关闭浏览器失败:', error);
    }

    // 从各个数组中移除
    const browserIndex = this.browsers.indexOf(browser);
    if (browserIndex !== -1) {
      this.browsers.splice(browserIndex, 1);
    }

    const availableIndex = this.availableBrowsers.indexOf(browser);
    if (availableIndex !== -1) {
      this.availableBrowsers.splice(availableIndex, 1);
    }

    console.log(`🗑️ 浏览器已从池中移除，当前总数: ${this.browsers.length}`);
  }

  /**
   * 抽象方法：创建浏览器实例（子类实现）
   */
  protected abstract createBrowser(): Promise<BrowserManager>;

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      totalBrowsers: this.browsers.length,
      availableBrowsers: this.availableBrowsers.length,
      busyBrowsers: this.browsers.length - this.availableBrowsers.length,
      maxPoolSize: this.maxPoolSize,
      waitingQueue: this.waitingQueue.length,
    };
  }

  /**
   * 关闭所有浏览器并清空池
   */
  async closeAll(): Promise<void> {
    console.log(`🛑 关闭浏览器池，总计 ${this.browsers.length} 个实例`);

    // 拒绝所有等待中的请求
    for (const waiter of this.waitingQueue) {
      waiter.reject(new Error('浏览器池已关闭'));
    }
    this.waitingQueue.length = 0;

    // 并行关闭所有浏览器
    const closePromises = this.browsers.map(async (browser, index) => {
      try {
        console.log(`关闭浏览器 ${index + 1}/${this.browsers.length}`);
        await browser.close();
      } catch (error) {
        console.error(`关闭浏览器 ${index + 1} 失败:`, error);
      }
    });

    await Promise.allSettled(closePromises);

    // 清空所有数组
    this.browsers.length = 0;
    this.availableBrowsers.length = 0;

    console.log(`✅ 浏览器池已关闭`);
  }

  /**
   * 健康检查：移除不健康的浏览器
   */
  async performHealthCheck(): Promise<{ healthy: number; removed: number }> {
    console.log('🔍 执行浏览器池健康检查...');

    let removedCount = 0;
    const healthChecks = this.availableBrowsers.map(async (browser, index) => {
      try {
        const isHealthy = await browser.healthCheck();
        if (!isHealthy) {
          console.warn(`浏览器 ${index} 不健康，将被移除`);
          await this.removeBrowserFromPool(browser);
          removedCount++;
        }
      } catch (error) {
        console.error(`检查浏览器 ${index} 健康状态失败:`, error);
        await this.removeBrowserFromPool(browser);
        removedCount++;
      }
    });

    await Promise.allSettled(healthChecks);

    const result = {
      healthy: this.browsers.length,
      removed: removedCount
    };

    console.log(`✅ 健康检查完成: 健康 ${result.healthy} 个，移除 ${result.removed} 个`);
    return result;
  }
}