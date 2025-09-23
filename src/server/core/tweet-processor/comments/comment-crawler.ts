/**
 * 推文评论爬虫
 * 负责协调评论抓取过程
 */

import type { Page } from 'playwright';
import type { CommentCrawlRequest, CommentCrawlResult, CommentData, CommentCrawlSession, ProcessorBrowserConfig } from '../types';
import { BrowserManager } from '../../browser/manager';
import { CommentSelectors } from './selectors';
import { TweetProcessorStorage } from '../storage/tweet-storage';
import { config } from '~/lib/config';

export class CommentCrawler {
  private readonly storage: TweetProcessorStorage;
  private readonly browserConfig: ProcessorBrowserConfig = {
    headless: config.playwright.headless,
    timeout: config.playwright.timeout,
    viewport: config.playwright.viewport,
    userAgent: config.spider.userAgent,
  };

  constructor() {
    this.storage = new TweetProcessorStorage();
  }

  /**
   * 爬取推文评论
   */
  async crawlComments(request: CommentCrawlRequest): Promise<CommentCrawlResult> {
    console.log(`开始爬取推文评论: ${request.tweetId}`);

    let browserManager: any = null;
    let sessionId: string | null = null;

    try {
      // 检查是否为增量爬取
      const isIncremental = request.incremental ?? false;
      let lastCommentId: string | undefined;

      if (isIncremental) {
        // 获取最后一次成功的爬取记录
        const lastSession = await this.storage.getLastSuccessfulCrawlSession(request.tweetId);
        if (lastSession) {
          lastCommentId = lastSession.lastCommentId ?? undefined;
          console.log(`增量爬取模式，从评论ID开始: ${lastCommentId || '未找到上次记录'}`);
        }
      }

      // 创建爬取会话
      sessionId = await this.storage.createCrawlSession({
        tweetId: request.tweetId,
        isIncremental,
        lastCommentId,
      });

      console.log(`创建爬取会话: ${sessionId}`);

      // 创建浏览器实例
      browserManager = await BrowserManager.create(this.browserConfig);

      // 健康检查
      const isHealthy = await browserManager.healthCheck();
      if (!isHealthy) {
        throw new Error('浏览器健康检查失败');
      }

      const page = await browserManager.getPage();

      // 构造推文详情页URL
      const tweetUrl = `https://x.com/i/status/${request.tweetId}`;
      console.log(`导航到推文页面: ${tweetUrl}`);

      // 导航到推文页面
      await browserManager.navigateToUrl(tweetUrl);

      // 创建评论选择器实例
      const commentSelectors = new CommentSelectors(page);

      // 等待评论区域加载
      await commentSelectors.waitForCommentsSection();

      // 检查是否有评论
      const hasComments = await commentSelectors.hasComments();
      if (!hasComments) {
        console.log('该推文没有评论');

        await this.storage.updateCrawlSession(sessionId, {
          status: 'completed',
          totalComments: 0,
          newComments: 0,
          completedAt: new Date(),
        });

        return {
          success: true,
          sessionId,
          totalComments: 0,
          newComments: 0,
          comments: [],
          hasMore: false,
          message: '该推文没有评论',
        };
      }

      // 滚动加载更多评论 - 优化滚动次数和策略以获取更多评论
      const maxScrolls = request.maxScrolls ?? 20;
      await commentSelectors.scrollToLoadMoreComments(maxScrolls);

      // 获取所有评论数据
      const extractedComments = await commentSelectors.extractAllComments(request.tweetId);

      if (extractedComments.length === 0) {
        console.log('未能提取到有效评论');

        await this.storage.updateCrawlSession(sessionId, {
          status: 'completed',
          totalComments: 0,
          newComments: 0,
          completedAt: new Date(),
        });

        return {
          success: true,
          sessionId,
          totalComments: 0,
          newComments: 0,
          comments: [],
          hasMore: false,
          message: '未能提取到有效评论',
        };
      }

      console.log(`提取到 ${extractedComments.length} 条评论`);

      // 过滤新评论（如果是增量爬取）
      let newComments: CommentData[] = extractedComments;
      let totalComments = extractedComments.length;

      if (isIncremental && lastCommentId) {
        // 获取现有评论
        const existingComments = await this.storage.getCommentsByTweetId(request.tweetId);
        const existingCommentIds = new Set(existingComments.map(c => c.commentId));

        // 过滤出新评论
        newComments = extractedComments.filter(comment => !existingCommentIds.has(comment.commentId));
        totalComments = existingComments.length + newComments.length;

        console.log(`增量爬取：总评论 ${totalComments}，新评论 ${newComments.length}`);
      } else {
        // 全量爬取，先清理现有评论
        await this.storage.clearTweetComments(request.tweetId);
        console.log(`全量爬取：共 ${totalComments} 条评论`);
      }

      // 存储评论数据
      if (newComments.length > 0) {
        await this.storage.saveComments(newComments);
        console.log(`成功保存 ${newComments.length} 条新评论`);
      }

      // 更新爬取会话状态
      const lastComment = extractedComments[extractedComments.length - 1];
      await this.storage.updateCrawlSession(sessionId, {
        status: 'completed',
        totalComments,
        newComments: newComments.length,
        lastCommentId: lastComment?.commentId,
        completedAt: new Date(),
      });

      // 检查是否还有更多评论
      const estimatedCount = await commentSelectors.getEstimatedCommentCount();
      const hasMore = estimatedCount > totalComments;

      console.log(`评论爬取完成: 总计 ${totalComments} 条，新增 ${newComments.length} 条`);

      return {
        success: true,
        sessionId,
        totalComments,
        newComments: newComments.length,
        comments: newComments,
        hasMore,
        message: `成功爬取 ${newComments.length} 条新评论`,
      };

    } catch (error) {
      console.error('评论爬取失败:', error);

      // 更新会话状态为失败
      if (sessionId) {
        await this.storage.updateCrawlSession(sessionId, {
          status: 'failed',
          completedAt: new Date(),
        }).catch(err => {
          console.error('更新失败会话状态出错:', err);
        });
      }

      return {
        success: false,
        sessionId: sessionId || '',
        totalComments: 0,
        newComments: 0,
        comments: [],
        hasMore: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '评论爬取失败',
      };

    } finally {
      // 清理资源
      if (browserManager) {
        await browserManager.close().catch((err: any) => {
          console.error('关闭浏览器失败:', err);
        });
      }
    }
  }

  /**
   * 获取推文的评论统计
   */
  async getCommentStats(tweetId: string): Promise<{
    totalComments: number;
    lastCrawlAt?: Date;
    lastCommentAt?: Date;
  }> {
    try {
      const comments = await this.storage.getCommentsByTweetId(tweetId);
      const lastSession = await this.storage.getLastSuccessfulCrawlSession(tweetId);

      let lastCommentAt: Date | undefined;
      if (comments.length > 0) {
        const latestComment = comments.reduce((latest, current) =>
          current.publishedAt > latest.publishedAt ? current : latest
        );
        lastCommentAt = new Date(latestComment.publishedAt);
      }

      return {
        totalComments: comments.length,
        lastCrawlAt: lastSession?.completedAt || undefined,
        lastCommentAt,
      };
    } catch (error) {
      console.error('获取评论统计失败:', error);
      return {
        totalComments: 0,
      };
    }
  }

  /**
   * 清理推文评论
   */
  async clearComments(tweetId: string): Promise<boolean> {
    try {
      console.log(`清理推文评论: ${tweetId}`);

      await this.storage.clearTweetComments(tweetId);

      console.log('评论清理完成');
      return true;
    } catch (error) {
      console.error('清理评论失败:', error);
      return false;
    }
  }
}