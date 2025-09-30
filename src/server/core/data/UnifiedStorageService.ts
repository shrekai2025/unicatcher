/**
 * 统一存储服务
 * 支持 Twitter 和 YouTube 数据的统一管理
 */

import { StorageService } from './storage';
import { db } from '~/server/db';
import type {
  TaskConfig,
  TaskStatus,
  TaskResult,
  TwitterTaskConfig,
  YouTubeTaskConfig,
  YouTubeVideoData,
  TweetData,
  UnifiedTask
} from '~/types/spider';

export class UnifiedStorageService extends StorageService {

  /**
   * 创建统一任务记录
   */
  async createUnifiedTask(config: TaskConfig): Promise<string> {
    switch (config.type) {
      case 'twitter_list':
      case 'twitter_user':
        return this.createTwitterTask(config as TwitterTaskConfig);
      case 'youtube_channel':
        return this.createYouTubeTask(config as YouTubeTaskConfig);
      default:
        throw new Error(`不支持的任务类型: ${(config as any).type}`);
    }
  }

  /**
   * 创建 Twitter 任务 (使用现有逻辑)
   */
  private async createTwitterTask(config: TwitterTaskConfig): Promise<string> {
    // 调用父类的现有方法，保持向后兼容
    if (config.type === 'twitter_list') {
      return super.createTask({
        listId: (config as any).listId,
        maxTweets: config.maxTweets,
        duplicateStopCount: config.duplicateStopCount
      });
    } else {
      // twitter_user 模式
      return super.createTask({
        listId: '0',
        username: (config as any).username,
        maxTweets: config.maxTweets,
        duplicateStopCount: config.duplicateStopCount
      });
    }
  }

  /**
   * 创建 YouTube 任务
   */
  private async createYouTubeTask(config: YouTubeTaskConfig): Promise<string> {
    try {
      // 目前只支持单个频道，取第一个用户名
      const channelHandle = config.usernames[0] || '';
      const task = await db.spiderTask.create({
        data: {
          type: 'youtube_channel',
          channelHandle: channelHandle,
          status: 'created',
          videoCount: 0,
        },
      });

      console.log(`YouTube 任务创建成功: ${task.id} (${channelHandle})`);
      return task.id;
    } catch (error) {
      console.error('创建 YouTube 任务失败:', error);
      throw new Error('创建 YouTube 任务失败');
    }
  }

  /**
   * 保存 YouTube 视频数据
   */
  async saveYouTubeVideos(videos: YouTubeVideoData[], taskId: string): Promise<void> {
    let savedCount = 0;

    try {
      for (const video of videos) {
        try {
          await this.saveYouTubeVideo(video, taskId);
          savedCount++;
        } catch (error) {
          console.error(`保存 YouTube 视频失败 ${video.id}:`, error);
          // 继续保存其他视频，不中断整个过程
        }
      }

      console.log(`YouTube 视频批量保存完成: ${savedCount}/${videos.length} 条视频`);
    } catch (error) {
      console.error('批量保存 YouTube 视频失败:', error);
      throw new Error('批量保存 YouTube 视频失败');
    }
  }

  /**
   * 保存单个 YouTube 视频数据
   */
  private async saveYouTubeVideo(videoData: YouTubeVideoData, taskId: string): Promise<void> {
    try {
      console.log(`💾 保存 YouTube 视频 [${videoData.id}]: ${videoData.title?.substring(0, 50)}...`);

      const dbData = {
        id: videoData.id,
        title: videoData.title,
        channelName: videoData.channelName,
        channelHandle: videoData.channelHandle,
        channelUrl: videoData.channelUrl,
        videoUrl: videoData.videoUrl,
        thumbnailUrl: videoData.thumbnailUrl || null,
        duration: videoData.duration || null,
        viewCount: videoData.viewCount || 0,
        publishedAt: videoData.publishedAt || null,
        publishedTimestamp: videoData.publishedTimestamp ? BigInt(videoData.publishedTimestamp) : null,
        scrapedAt: BigInt(videoData.scrapedAt),
        taskId,
      };

      // 首先检查视频是否已被逻辑删除
      const existingVideo = await db.youTubeVideo.findUnique({
        where: { id: videoData.id },
        select: { isDeleted: true }
      });

      // 如果视频已被逻辑删除，则跳过保存
      if (existingVideo?.isDeleted) {
        console.log(`🙈 跳过已逻辑删除的视频: ${videoData.id}`);
        return;
      }

      // 使用 upsert：如果存在则更新，不存在则创建
      await db.youTubeVideo.upsert({
        where: {
          id: videoData.id,
        },
        create: dbData,
        update: {
          // 更新时只更新统计数据（不影响逻辑删除状态）
          viewCount: videoData.viewCount || 0,
          scrapedAt: dbData.scrapedAt,
          updatedAt: new Date(),
        }
      });

      console.log(`✅ YouTube 视频保存/更新成功: ${videoData.id}`);
    } catch (error) {
      console.error(`❌ 保存 YouTube 视频失败 [${videoData.id}]:`, error);
      throw new Error('保存 YouTube 视频失败');
    }
  }

  /**
   * 检查 YouTube 视频是否已存在
   */
  async checkYouTubeVideoExists(videoId: string): Promise<boolean> {
    try {
      const video = await db.youTubeVideo.findUnique({
        where: {
          id: videoId,
          isDeleted: false,
        },
      });
      return !!video;
    } catch (error) {
      console.error('检查 YouTube 视频存在失败:', error);
      return false;
    }
  }

  /**
   * 获取 YouTube 频道的现有视频 ID 集合
   */
  async getExistingYouTubeVideoIds(channelHandle: string): Promise<Set<string>> {
    try {
      const videos = await db.youTubeVideo.findMany({
        where: {
          channelHandle,
          isDeleted: false,
        },
        select: { id: true },
      });

      return new Set(videos.map((video: any) => video.id));
    } catch (error) {
      console.error('获取已存在 YouTube 视频 ID 失败:', error);
      return new Set();
    }
  }

  /**
   * 更新任务视频计数 (YouTube)
   */
  async updateTaskVideoCount(taskId: string, videoCount: number): Promise<void> {
    try {
      await db.spiderTask.update({
        where: { id: taskId },
        data: { videoCount: videoCount },
      });
    } catch (error) {
      console.error('更新 YouTube 任务视频计数失败:', error);
    }
  }

  // 保持向后兼容：继承所有现有的 Twitter 相关方法
  // saveTweets, updateTaskTweetCount, checkTweetExists 等方法都从父类继承
}