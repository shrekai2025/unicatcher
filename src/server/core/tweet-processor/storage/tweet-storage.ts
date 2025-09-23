/**
 * 推文处理存储服务
 * 负责推文处理任务和结果的数据库操作
 */

import { db } from '~/server/db';
import type { SocialMetrics, CommentData } from '../types';

export class TweetProcessorStorage {
  /**
   * 获取推文的当前社交数据
   */
  async getTweetSocialData(tweetId: string): Promise<SocialMetrics | null> {
    try {
      const tweet = await db.tweet.findUnique({
        where: { id: tweetId },
        select: {
          replyCount: true,
          retweetCount: true,
          likeCount: true,
          viewCount: true,
        },
      });

      if (!tweet) {
        return null;
      }

      return {
        replyCount: tweet.replyCount,
        retweetCount: tweet.retweetCount,
        likeCount: tweet.likeCount,
        viewCount: tweet.viewCount,
      };
    } catch (error) {
      console.error('获取推文社交数据失败:', error);
      throw new Error('获取推文社交数据失败');
    }
  }

  /**
   * 更新推文的社交数据
   */
  async updateTweetSocialData(tweetId: string, newData: SocialMetrics): Promise<void> {
    try {
      await db.tweet.update({
        where: { id: tweetId },
        data: {
          replyCount: newData.replyCount,
          retweetCount: newData.retweetCount,
          likeCount: newData.likeCount,
          viewCount: newData.viewCount,
          updatedAt: new Date(),
        },
      });

      console.log(`推文 ${tweetId} 社交数据已更新`);
    } catch (error) {
      console.error('更新推文社交数据失败:', error);
      throw new Error('更新推文社交数据失败');
    }
  }

  /**
   * 检查推文是否存在
   */
  async checkTweetExists(tweetId: string): Promise<boolean> {
    try {
      const tweet = await db.tweet.findUnique({
        where: { id: tweetId },
        select: { id: true },
      });

      return !!tweet;
    } catch (error) {
      console.error('检查推文存在失败:', error);
      return false;
    }
  }

  /**
   * 获取推文基本信息
   */
  async getTweetInfo(tweetId: string): Promise<{
    id: string;
    content: string;
    userNickname: string;
    userUsername: string;
    tweetUrl: string;
    publishedAt: number;
    isDeleted: boolean;
  } | null> {
    try {
      const tweet = await db.tweet.findUnique({
        where: { id: tweetId },
        select: {
          id: true,
          content: true,
          userNickname: true,
          userUsername: true,
          tweetUrl: true,
          publishedAt: true,
          isDeleted: true,
        },
      });

      if (!tweet) {
        return null;
      }

      return {
        id: tweet.id,
        content: tweet.content,
        userNickname: tweet.userNickname,
        userUsername: tweet.userUsername,
        tweetUrl: tweet.tweetUrl,
        publishedAt: Number(tweet.publishedAt),
        isDeleted: tweet.isDeleted,
      };
    } catch (error) {
      console.error('获取推文信息失败:', error);
      throw new Error('获取推文信息失败');
    }
  }

  /**
   * 记录社交数据更新历史
   */
  async recordSocialDataUpdate(
    tweetId: string,
    oldData: SocialMetrics,
    newData: SocialMetrics
  ): Promise<void> {
    try {
      // 这里可以创建一个历史记录表来跟踪变化
      // 目前简化处理，只在控制台输出
      console.log(`推文 ${tweetId} 社交数据变化:`, {
        old: oldData,
        new: newData,
        changes: {
          replyChange: newData.replyCount - oldData.replyCount,
          retweetChange: newData.retweetCount - oldData.retweetCount,
          likeChange: newData.likeCount - oldData.likeCount,
          viewChange: newData.viewCount - oldData.viewCount,
        },
      });

      // TODO: 如果需要详细的历史记录，可以在这里添加到专门的历史表
    } catch (error) {
      console.error('记录社交数据更新历史失败:', error);
      // 非关键错误，不抛出异常
    }
  }

  /**
   * 获取推文处理任务
   */
  async getProcessTask(taskId: string): Promise<any> {
    try {
      return await db.tweetProcessTask.findUnique({
        where: { id: taskId },
      });
    } catch (error) {
      console.error('获取处理任务失败:', error);
      throw new Error('获取处理任务失败');
    }
  }

  /**
   * 创建推文处理任务
   */
  async createProcessTask(
    tweetId: string,
    taskType: string
  ): Promise<string> {
    try {
      const task = await db.tweetProcessTask.create({
        data: {
          tweetId,
          taskType,
          status: 'queued',
        },
      });

      return task.id;
    } catch (error) {
      console.error('创建处理任务失败:', error);
      throw new Error('创建处理任务失败');
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    result?: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'running') {
        updateData.startedAt = new Date();
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
        if (status === 'completed') {
          updateData.lastUpdatedAt = new Date();
        }
      }

      if (result) {
        updateData.result = JSON.stringify(result);
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: updateData,
      });

      console.log(`任务状态更新: ${taskId} -> ${status}`);
    } catch (error) {
      console.error('更新任务状态失败:', error);
      throw new Error('更新任务状态失败');
    }
  }

  /**
   * 获取最近的更新时间
   */
  async getLastUpdateTime(tweetId: string, taskType: string): Promise<Date | null> {
    try {
      const lastTask = await db.tweetProcessTask.findFirst({
        where: {
          tweetId,
          taskType,
          status: 'completed',
          lastUpdatedAt: { not: null },
        },
        orderBy: { lastUpdatedAt: 'desc' },
        select: { lastUpdatedAt: true },
      });

      return lastTask?.lastUpdatedAt || null;
    } catch (error) {
      console.error('获取最近更新时间失败:', error);
      return null;
    }
  }

  /**
   * 获取运行中的任务数量
   */
  async getRunningTaskCount(): Promise<number> {
    try {
      return await db.tweetProcessTask.count({
        where: { status: 'running' },
      });
    } catch (error) {
      console.error('获取运行中任务数量失败:', error);
      return 0;
    }
  }

  /**
   * 获取推文处理统计信息
   */
  async getProcessingStats(): Promise<{
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    recentUpdates: number; // 最近24小时的更新数
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [
        totalTasks,
        runningTasks,
        completedTasks,
        failedTasks,
        recentUpdates,
      ] = await Promise.all([
        db.tweetProcessTask.count(),
        db.tweetProcessTask.count({ where: { status: 'running' } }),
        db.tweetProcessTask.count({ where: { status: 'completed' } }),
        db.tweetProcessTask.count({ where: { status: 'failed' } }),
        db.tweetProcessTask.count({
          where: {
            status: 'completed',
            completedAt: { gte: oneDayAgo },
          },
        }),
      ]);

      return {
        totalTasks,
        runningTasks,
        completedTasks,
        failedTasks,
        recentUpdates,
      };
    } catch (error) {
      console.error('获取处理统计信息失败:', error);
      return {
        totalTasks: 0,
        runningTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        recentUpdates: 0,
      };
    }
  }

  /**
   * 清理旧的任务记录
   */
  async cleanupOldTasks(daysOld = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.tweetProcessTask.deleteMany({
        where: {
          status: { in: ['completed', 'failed'] },
          completedAt: { lt: cutoffDate },
        },
      });

      console.log(`清理了 ${result.count} 个旧任务记录`);
      return result.count;
    } catch (error) {
      console.error('清理旧任务记录失败:', error);
      return 0;
    }
  }

  // ==================== 评论相关存储方法 ====================

  /**
   * 保存评论数据
   */
  async saveComments(comments: CommentData[]): Promise<void> {
    try {
      // Use individual creates with upsert to handle duplicates
      for (const comment of comments) {
        await db.tweetComment.upsert({
          where: {
            commentId: comment.commentId,
          },
          update: {
            content: comment.content,
            authorUsername: comment.authorUsername,
            authorNickname: comment.authorNickname,
            authorProfileImage: comment.authorProfileImage,
            replyCount: comment.replyCount,
            likeCount: comment.likeCount,
            publishedAt: BigInt(comment.publishedAt),
            scrapedAt: BigInt(comment.scrapedAt),
            isReply: comment.isReply,
            parentCommentId: comment.parentCommentId,
          },
          create: {
            tweetId: comment.tweetId!,
            commentId: comment.commentId,
            content: comment.content,
            authorUsername: comment.authorUsername,
            authorNickname: comment.authorNickname,
            authorProfileImage: comment.authorProfileImage,
            replyCount: comment.replyCount,
            likeCount: comment.likeCount,
            publishedAt: BigInt(comment.publishedAt),
            scrapedAt: BigInt(comment.scrapedAt),
            isReply: comment.isReply,
            parentCommentId: comment.parentCommentId,
          },
        });
      }

      console.log(`成功保存 ${comments.length} 条评论`);
    } catch (error) {
      console.error('保存评论失败:', error);
      throw new Error('保存评论失败');
    }
  }

  /**
   * 获取推文的所有评论
   */
  async getCommentsByTweetId(tweetId: string): Promise<CommentData[]> {
    try {
      const comments = await db.tweetComment.findMany({
        where: { tweetId },
        orderBy: { publishedAt: 'desc' },
      });

      return comments.map(comment => ({
        commentId: comment.commentId,
        content: comment.content,
        authorUsername: comment.authorUsername,
        authorNickname: comment.authorNickname,
        authorProfileImage: comment.authorProfileImage || undefined,
        replyCount: comment.replyCount,
        likeCount: comment.likeCount,
        publishedAt: Number(comment.publishedAt),
        scrapedAt: Number(comment.scrapedAt),
        isReply: comment.isReply,
        parentCommentId: comment.parentCommentId || undefined,
        tweetId: comment.tweetId,
      }));
    } catch (error) {
      console.error('获取评论失败:', error);
      throw new Error('获取评论失败');
    }
  }

  /**
   * 清理推文的所有评论
   */
  async clearTweetComments(tweetId: string): Promise<number> {
    try {
      const result = await db.tweetComment.deleteMany({
        where: { tweetId },
      });

      console.log(`清理了推文 ${tweetId} 的 ${result.count} 条评论`);
      return result.count;
    } catch (error) {
      console.error('清理评论失败:', error);
      throw new Error('清理评论失败');
    }
  }

  /**
   * 获取评论统计信息
   */
  async getCommentStats(tweetId: string): Promise<{
    totalComments: number;
    replyComments: number;
    latestCommentAt?: Date;
  }> {
    try {
      const [totalComments, replyComments, latestComment] = await Promise.all([
        db.tweetComment.count({ where: { tweetId } }),
        db.tweetComment.count({ where: { tweetId, isReply: true } }),
        db.tweetComment.findFirst({
          where: { tweetId },
          orderBy: { publishedAt: 'desc' },
          select: { publishedAt: true },
        }),
      ]);

      return {
        totalComments,
        replyComments,
        latestCommentAt: latestComment ? new Date(Number(latestComment.publishedAt)) : undefined,
      };
    } catch (error) {
      console.error('获取评论统计失败:', error);
      return { totalComments: 0, replyComments: 0 };
    }
  }

  // ==================== 爬取会话管理 ====================

  /**
   * 创建爬取会话
   */
  async createCrawlSession(params: {
    tweetId: string;
    isIncremental: boolean;
    lastCommentId?: string;
  }): Promise<string> {
    try {
      const session = await db.commentCrawlSession.create({
        data: {
          tweetId: params.tweetId,
          status: 'running',
          isIncremental: params.isIncremental,
          lastCommentId: params.lastCommentId,
        },
      });

      return session.id;
    } catch (error) {
      console.error('创建爬取会话失败:', error);
      throw new Error('创建爬取会话失败');
    }
  }

  /**
   * 更新爬取会话
   */
  async updateCrawlSession(
    sessionId: string,
    data: {
      status?: string;
      totalComments?: number;
      newComments?: number;
      lastCommentId?: string;
      completedAt?: Date;
    }
  ): Promise<void> {
    try {
      await db.commentCrawlSession.update({
        where: { id: sessionId },
        data,
      });

      console.log(`爬取会话 ${sessionId} 已更新`);
    } catch (error) {
      console.error('更新爬取会话失败:', error);
      throw new Error('更新爬取会话失败');
    }
  }

  /**
   * 获取最后一次成功的爬取会话
   */
  async getLastSuccessfulCrawlSession(tweetId: string): Promise<{
    id: string;
    lastCommentId: string | null;
    completedAt: Date | null;
    totalComments: number;
  } | null> {
    try {
      const session = await db.commentCrawlSession.findFirst({
        where: {
          tweetId,
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          lastCommentId: true,
          completedAt: true,
          totalComments: true,
        },
      });

      return session;
    } catch (error) {
      console.error('获取最后成功会话失败:', error);
      return null;
    }
  }

  /**
   * 获取爬取会话历史
   */
  async getCrawlSessionHistory(tweetId: string, limit = 10): Promise<Array<{
    id: string;
    status: string;
    totalComments: number;
    newComments: number;
    isIncremental: boolean;
    startedAt: Date;
    completedAt: Date | null;
  }>> {
    try {
      const sessions = await db.commentCrawlSession.findMany({
        where: { tweetId },
        orderBy: { startedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          status: true,
          totalComments: true,
          newComments: true,
          isIncremental: true,
          startedAt: true,
          completedAt: true,
        },
      });

      return sessions;
    } catch (error) {
      console.error('获取爬取会话历史失败:', error);
      return [];
    }
  }
}