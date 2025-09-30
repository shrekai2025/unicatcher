/**
 * 推文详情页选择器
 * 用于提取推文的社交数据和详细信息
 */

import type { Page } from 'playwright';
import type { TweetDetailSelectorsConfig, SocialMetrics, TweetDetailData } from '../types';

export class TweetDetailSelectors {
  private readonly selectors: TweetDetailSelectorsConfig = {
    // 社交指标选择器 - 推文详情页的互动按钮区域
    replyCount: '[data-testid="reply"] span[data-testid="app-text-transition-container"] span span',
    retweetCount: '[data-testid="retweet"] span[data-testid="app-text-transition-container"] span span',
    likeCount: '[data-testid="like"] span[data-testid="app-text-transition-container"] span span',
    viewCount: 'a[href*="/analytics"] span[data-testid="app-text-transition-container"] span',

    // 推文内容选择器
    tweetText: '[data-testid="tweetText"]',
    userNickname: '[data-testid="User-Name"] span',
    userUsername: '[data-testid="User-Name"] a[href*="@"]',
    publishTime: 'time[datetime]',

    // 评论区选择器（用于评论功能）
    commentSection: '[data-testid="cellInnerDiv"]',
    commentContainer: 'article[data-testid="tweet"]',
    commentContent: '[data-testid="tweetText"]',
    commentAuthor: '[data-testid="User-Name"]',
    commentStats: '[role="group"]',
    commentTime: 'time[datetime]',

    // 页面状态选择器
    loadingIndicator: '[data-testid="spinner"]',
    errorMessage: '[data-testid="error"]',
    loginRequired: '[data-testid="loginButton"]',
  };

  constructor(private readonly page: Page) {}

  /**
   * 等待推文详情页加载完成
   */
  async waitForTweetDetail(): Promise<void> {
    console.log('等待推文详情页加载...');

    // 定义多种可能的选择器，按优先级排序
    const primarySelectors = [
      '[data-testid="tweetText"]', // 推文正文
      '[data-testid="User-Name"]', // 用户信息
      '[data-testid="reply"]', // 回复按钮
    ];

    const fallbackSelectors = [
      'article[data-testid="tweet"]', // 推文容器
      'main[role="main"]', // 主要内容区域
      '[role="main"] section', // 主要区域的section
    ];

    let loaded = false;

    // 尝试主要选择器
    for (const selector of primarySelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 8000 });
        console.log(`✅ 推文详情页已加载 (通过: ${selector})`);
        loaded = true;
        break;
      } catch (error) {
        continue;
      }
    }

    // 如果主要选择器失败，尝试回退选择器
    if (!loaded) {
      for (const selector of fallbackSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          console.log(`⚠️ 推文详情页可能已加载 (回退: ${selector})`);
          loaded = true;
          break;
        } catch (error) {
          continue;
        }
      }
    }

    if (!loaded) {
      // 检查页面状态
      await this.checkPageStatus();
      throw new Error('推文详情页加载失败或页面结构发生变化');
    }

    // 额外等待，确保动态内容加载完成
    await this.page.waitForTimeout(2000);
  }

  /**
   * 检查页面状态（登录要求、错误信息等）
   */
  private async checkPageStatus(): Promise<void> {
    // 检查是否需要登录
    const loginButton = await this.page.$(this.selectors.loginRequired);
    if (loginButton) {
      throw new Error('页面要求登录，登录状态可能已失效');
    }

    // 检查是否有错误信息
    const errorElement = await this.page.$(this.selectors.errorMessage);
    if (errorElement) {
      const errorText = await errorElement.textContent();
      throw new Error(`页面显示错误: ${errorText || '未知错误'}`);
    }

    // 检查推文是否存在
    const tweetExists = await this.page.$('[data-testid="tweetText"]');
    if (!tweetExists) {
      // 可能是推文被删除、设为私密或用户被暂停
      const pageText = await this.page.textContent('body');
      if (pageText?.includes('删除') || pageText?.includes('This Tweet was deleted')) {
        throw new Error('推文已被删除');
      }
      if (pageText?.includes('受保护') || pageText?.includes('protected')) {
        throw new Error('推文设为私密，无法访问');
      }
      if (pageText?.includes('暂停') || pageText?.includes('suspended')) {
        throw new Error('用户账号已被暂停');
      }
      throw new Error('推文不存在或无法访问');
    }
  }

  /**
   * 提取社交指标数据
   */
  async extractSocialMetrics(): Promise<SocialMetrics> {
    console.log('提取社交指标数据...');

    try {
      const metrics: SocialMetrics = {
        replyCount: 0,
        retweetCount: 0,
        likeCount: 0,
        viewCount: 0,
      };

      // 提取回复数
      try {
        const replyElement = await this.page.$(this.selectors.replyCount);
        if (replyElement) {
          const replyText = await replyElement.textContent();
          metrics.replyCount = this.parseCount(replyText);
          console.log(`回复数: ${metrics.replyCount}`);
        }
      } catch (error) {
        console.warn('提取回复数失败:', error);
      }

      // 提取转发数
      try {
        const retweetElement = await this.page.$(this.selectors.retweetCount);
        if (retweetElement) {
          const retweetText = await retweetElement.textContent();
          metrics.retweetCount = this.parseCount(retweetText);
          console.log(`转发数: ${metrics.retweetCount}`);
        }
      } catch (error) {
        console.warn('提取转发数失败:', error);
      }

      // 提取点赞数
      try {
        const likeElement = await this.page.$(this.selectors.likeCount);
        if (likeElement) {
          const likeText = await likeElement.textContent();
          metrics.likeCount = this.parseCount(likeText);
          console.log(`点赞数: ${metrics.likeCount}`);
        }
      } catch (error) {
        console.warn('提取点赞数失败:', error);
      }

      // 提取浏览数
      try {
        const viewElement = await this.page.$(this.selectors.viewCount);
        if (viewElement) {
          const viewText = await viewElement.textContent();
          metrics.viewCount = this.parseCount(viewText);
          console.log(`浏览数: ${metrics.viewCount}`);
        }
      } catch (error) {
        console.warn('提取浏览数失败:', error);
      }

      console.log('社交指标提取完成:', metrics);
      return metrics;

    } catch (error) {
      console.error('提取社交指标失败:', error);
      throw new Error('无法提取推文社交数据');
    }
  }

  /**
   * 提取推文详情数据（可选功能，用于验证或补充数据）
   */
  async extractTweetDetail(tweetId: string): Promise<TweetDetailData> {
    console.log('提取推文详情数据...');

    try {
      // 先获取社交指标
      const metrics = await this.extractSocialMetrics();

      // 提取推文内容
      const contentElement = await this.page.$(this.selectors.tweetText);
      const content = contentElement ? await contentElement.textContent() || '' : '';

      // 提取用户信息
      const userInfo = await this.extractUserInfo();

      // 提取发布时间
      const publishedAt = await this.extractPublishTime();

      const tweetDetail: TweetDetailData = {
        id: tweetId,
        content: content.trim(),
        userNickname: userInfo.nickname,
        userUsername: userInfo.username,
        tweetUrl: this.page.url(),
        publishedAt,
        scrapedAt: Date.now(),
        ...metrics,
      };

      console.log('推文详情提取完成');
      return tweetDetail;

    } catch (error) {
      console.error('提取推文详情失败:', error);
      throw new Error('无法提取推文详情数据');
    }
  }

  /**
   * 提取用户信息
   */
  private async extractUserInfo(): Promise<{ nickname: string; username: string }> {
    try {
      // 提取用户昵称
      const nicknameElements = await this.page.$$(this.selectors.userNickname);
      let nickname = '';
      for (const element of nicknameElements) {
        const text = await element.textContent();
        if (text && text.trim() && !text.includes('@')) {
          nickname = text.trim();
          break;
        }
      }

      // 提取用户名
      let username = '';
      const usernameElement = await this.page.$(this.selectors.userUsername);
      if (usernameElement) {
        const href = await usernameElement.getAttribute('href');
        if (href) {
          const match = href.match(/\/([^\/]+)$/);
          if (match && match[1]) {
            username = match[1]; // 不添加@前缀，保持纯用户名
          }
        }
      }

      return { nickname, username };
    } catch (error) {
      console.warn('提取用户信息失败:', error);
      return { nickname: '', username: '' };
    }
  }

  /**
   * 提取发布时间
   */
  private async extractPublishTime(): Promise<number> {
    try {
      const timeElement = await this.page.$(this.selectors.publishTime);
      if (!timeElement) {
        return Date.now();
      }

      const datetime = await timeElement.getAttribute('datetime');
      if (!datetime) {
        return Date.now();
      }

      return new Date(datetime).getTime();
    } catch (error) {
      console.warn('提取发布时间失败:', error);
      return Date.now();
    }
  }

  /**
   * 解析数量文本（如"1.2K" -> 1200）
   */
  private parseCount(text: string | null): number {
    if (!text || text.trim() === '') {
      return 0;
    }

    const cleanText = text.trim().toLowerCase().replace(/,/g, '');

    // 处理K、M等单位
    if (cleanText.includes('k')) {
      const num = parseFloat(cleanText.replace('k', ''));
      return Math.floor(num * 1000);
    }

    if (cleanText.includes('m')) {
      const num = parseFloat(cleanText.replace('m', ''));
      return Math.floor(num * 1000000);
    }

    if (cleanText.includes('b')) {
      const num = parseFloat(cleanText.replace('b', ''));
      return Math.floor(num * 1000000000);
    }

    // 普通数字
    const num = parseInt(cleanText, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 验证推文ID是否匹配
   */
  async validateTweetId(expectedTweetId: string): Promise<boolean> {
    try {
      const currentUrl = this.page.url();
      const urlMatch = currentUrl.match(/\/status\/(\d+)/);

      if (urlMatch && urlMatch[1] === expectedTweetId) {
        return true;
      }

      console.warn(`推文ID不匹配: 期望 ${expectedTweetId}, URL中为 ${urlMatch?.[1] || '未找到'}`);
      return false;
    } catch (error) {
      console.error('验证推文ID失败:', error);
      return false;
    }
  }
}