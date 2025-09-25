/**
 * 数据存储服务
 * 负责推文数据和任务的数据库操作
 */

import { db } from '~/server/db';
import type { TweetData, SpiderTaskConfig, TaskStatus, TaskResult } from '~/types/spider';

export class StorageService {
  /**
   * 创建爬虫任务
   */
  async createTask(config: SpiderTaskConfig): Promise<string> {
    try {
      const task = await db.spiderTask.create({
        data: {
          type: 'twitter_list',
          listId: config.listId,
          status: 'created',
          tweetCount: 0,
        },
      });

      console.log(`任务创建成功: ${task.id}`);
      return task.id;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw new Error('创建任务失败');
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, result?: TaskResult): Promise<void> {
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
      }

      if (result) {
        updateData.result = JSON.stringify(result);
      }

      await db.spiderTask.update({
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
   * 更新任务推文计数
   */
  async updateTaskTweetCount(taskId: string, count: number): Promise<void> {
    try {
      await db.spiderTask.update({
        where: { id: taskId },
        data: { tweetCount: count },
      });
    } catch (error) {
      console.error('更新推文计数失败:', error);
    }
  }

  /**
   * 获取任务信息
   */
  async getTask(taskId: string): Promise<any> {
    try {
      return await db.spiderTask.findUnique({
        where: { id: taskId },
        include: {
          tweets: {
            orderBy: { publishedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      console.error('获取任务失败:', error);
      return null;
    }
  }

  /**
   * 获取任务列表
   */
  async getTasks(page = 1, limit = 10, status?: TaskStatus): Promise<{
    tasks: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const where = status ? { status } : {};
      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        db.spiderTask.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.spiderTask.count({ where }),
      ]);

      return { tasks, total, page, limit };
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return { tasks: [], total: 0, page, limit };
    }
  }

  /**
   * 检查推文是否存在（排除逻辑删除）
   */
  async checkTweetExists(tweetId: string): Promise<boolean> {
    try {
      const tweet = await db.tweet.findUnique({
        where: { 
          id: tweetId,
          isDeleted: false,
        },
      });
      return !!tweet;
    } catch (error) {
      console.error('检查推文存在失败:', error);
      return false;
    }
  }

  /**
   * 获取List中已存在的推文ID列表（排除逻辑删除）
   */
  async getExistingTweetIds(listId: string): Promise<Set<string>> {
    try {
      const tweets = await db.tweet.findMany({
        where: { 
          listId,
          isDeleted: false,
        },
        select: { id: true },
      });

      return new Set(tweets.map((tweet: any) => tweet.id));
    } catch (error) {
      console.error('获取已存在推文ID失败:', error);
      return new Set();
    }
  }

  /**
   * 保存推文数据（使用UPSERT避免重复）
   */
  async saveTweet(tweetData: TweetData, taskId: string): Promise<void> {
    try {
      // 🔍 调试日志：检查接收到的媒体数据
      console.log(`💾 保存推文 [${tweetData.id}]:`);
      console.log(`  📷 配图数量: ${tweetData.imageUrls?.length || 0}`);
      console.log(`  👤 头像: ${tweetData.profileImageUrl ? '有' : '无'}`);
      console.log(`  🎥 视频数据: ${tweetData.videoUrls ? JSON.stringify(tweetData.videoUrls) : '无'}`);
      
      const dbData = {
        id: tweetData.id,
        content: tweetData.content,
        userNickname: tweetData.userNickname,
        userUsername: tweetData.userUsername,
        replyCount: tweetData.replyCount,
        retweetCount: tweetData.retweetCount,
        likeCount: tweetData.likeCount,
        viewCount: tweetData.viewCount,
        isReply: tweetData.isReply,
        isRT: tweetData.isRT,
        imageUrls: tweetData.imageUrls ? JSON.stringify(tweetData.imageUrls) : null,
        profileImageUrl: tweetData.profileImageUrl || null,
        videoUrls: tweetData.videoUrls ? JSON.stringify(tweetData.videoUrls) : null,
        tweetUrl: tweetData.tweetUrl,
        publishedAt: BigInt(tweetData.publishedAt),
        listId: tweetData.listId,
        scrapedAt: BigInt(tweetData.scrapedAt),
        taskId,
      };
      
      // 🔍 调试日志：检查即将写入数据库的数据
      console.log(`  💾 写库数据:`);
      console.log(`    imageUrls (${dbData.imageUrls?.length || 0}字符): ${dbData.imageUrls?.substring(0, 100)}...`);
      console.log(`    videoUrls (${dbData.videoUrls?.length || 0}字符): ${dbData.videoUrls || 'null'}`);
      console.log(`    profileImageUrl: ${dbData.profileImageUrl || 'null'}`);
      
      // 首先检查推文是否已被逻辑删除
      const existingTweet = await db.tweet.findUnique({
        where: { id: tweetData.id },
        select: { isDeleted: true }
      });

      // 如果推文已被逻辑删除，则跳过保存
      if (existingTweet?.isDeleted) {
        console.log(`🙈 跳过已逻辑删除的垃圾推文: ${tweetData.id}`);
        return;
      }

      // 使用 upsert：如果存在则更新，不存在则创建
      await db.tweet.upsert({
        where: { 
          id: tweetData.id,
        },
        create: dbData,
        update: {
          // 更新时只更新媒体字段和计数（不影响逻辑删除状态）
          replyCount: tweetData.replyCount,
          retweetCount: tweetData.retweetCount,
          likeCount: tweetData.likeCount,
          viewCount: tweetData.viewCount,
          imageUrls: dbData.imageUrls,
          profileImageUrl: dbData.profileImageUrl,
          videoUrls: dbData.videoUrls,
          scrapedAt: dbData.scrapedAt,
          updatedAt: new Date(),
        }
      });
      
      console.log(`✅ 推文保存/更新成功: ${tweetData.id}`);
    } catch (error) {
      console.error(`❌ 保存推文失败 [${tweetData.id}]:`, error);
      throw new Error('保存推文失败');
    }
  }

  /**
   * 批量保存推文数据
   */
  async saveTweets(tweets: TweetData[], taskId: string): Promise<number> {
    let savedCount = 0;

    try {
      for (const tweet of tweets) {
        try {
          await this.saveTweet(tweet, taskId);
          savedCount++;
        } catch (error) {
          console.error(`保存推文失败 ${tweet.id}:`, error);
          // 继续保存其他推文，不中断整个过程
        }
      }

      console.log(`批量保存完成: ${savedCount}/${tweets.length} 条推文`);
      return savedCount;
    } catch (error) {
      console.error('批量保存推文失败:', error);
      return savedCount;
    }
  }

  /**
   * 获取推文数据（排除逻辑删除）
   */
  async getTweets(
    taskId?: string,
    listId?: string,
    page = 1,
    limit = 20
  ): Promise<{
    tweets: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const where: any = {
        isDeleted: false, // 排除逻辑删除的推文
      };
      if (taskId) where.taskId = taskId;
      if (listId) where.listId = listId;

      const skip = (page - 1) * limit;

      const [tweets, total] = await Promise.all([
        db.tweet.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            content: true,
            userNickname: true,
            userUsername: true,
            replyCount: true,
            retweetCount: true,
            likeCount: true,
            viewCount: true,
            isRT: true,
            isReply: true,
            imageUrls: true,
            profileImageUrl: true,
            videoUrls: true,
            tweetUrl: true,
            publishedAt: true,
            listId: true,
            scrapedAt: true,
            // 新的分析字段 - 如果不存在则为null
            analysisStatus: true,
            syncedAt: true,
            analyzedAt: true,
            analysisBatchId: true,
            // AI处理字段
            contentTypes: true,
            topicTags: true,
            keywords: true,
            // 逻辑删除字段
            isDeleted: true,
            deletedAt: true,
            deletedBy: true,
            taskId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.tweet.count({ where }),
      ]);

      // 解析媒体URLs并转换BigInt为数字
      const parsedTweets = tweets.map((tweet: any) => ({
        ...tweet,
        imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : [],
        videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
        publishedAt: tweet.publishedAt ? Number(tweet.publishedAt) : 0,
        scrapedAt: tweet.scrapedAt ? Number(tweet.scrapedAt) : 0,
      }));

      return { tweets: parsedTweets, total, page, limit };
    } catch (error) {
      console.error('获取推文数据失败:', error);
      return { tweets: [], total: 0, page, limit };
    }
  }

  /**
   * 根据多个listId获取推文数据（排除逻辑删除）
   */
  async getTweetsByListIds(
    listIds?: string[],
    page = 1,
    limit = 20,
    excludeUnprocessed = false
  ): Promise<{
    tweets: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const where: any = {
        isDeleted: false, // 排除逻辑删除的推文
      };
      
      // 如果提供了listIds数组且不为空，则添加IN查询条件
      if (listIds && listIds.length > 0) {
        where.listId = { in: listIds };
      }

      // 如果需要排除未经AI处理的推文
      if (excludeUnprocessed) {
        where.aiProcessStatus = 'completed';
      }

      const skip = (page - 1) * limit;

      const [tweets, total] = await Promise.all([
        db.tweet.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            content: true,
            userNickname: true,
            userUsername: true,
            replyCount: true,
            retweetCount: true,
            likeCount: true,
            viewCount: true,
            isRT: true,
            isReply: true,
            imageUrls: true,
            profileImageUrl: true,
            videoUrls: true,
            tweetUrl: true,
            publishedAt: true,
            listId: true,
            scrapedAt: true,
            // 新的分析字段 - 如果不存在则为null
            analysisStatus: true,
            syncedAt: true,
            analyzedAt: true,
            analysisBatchId: true,
            // AI处理字段
            contentTypes: true,
            topicTags: true,
            keywords: true,
            // 逻辑删除字段
            isDeleted: true,
            deletedAt: true,
            deletedBy: true,
            taskId: true,
            createdAt: true,
            updatedAt: true,
            // 翻译相关字段
            translatedContent: true,
            originalLanguage: true,
            isTranslated: true,
            translationProvider: true,
            translationModel: true,
            translatedAt: true,
          },
        }),
        db.tweet.count({ where }),
      ]);

      // 解析媒体URLs并转换BigInt为数字
      const parsedTweets = tweets.map((tweet: any) => ({
        ...tweet,
        imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : [],
        videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
        publishedAt: tweet.publishedAt ? Number(tweet.publishedAt) : 0,
        scrapedAt: tweet.scrapedAt ? Number(tweet.scrapedAt) : 0,
      }));

      return { tweets: parsedTweets, total, page, limit };
    } catch (error) {
      console.error('根据listIds获取推文数据失败:', error);
      return { tweets: [], total: 0, page, limit };
    }
  }

  /**
   * 删除任务及相关推文
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      // 先删除相关推文，再删除任务
      await db.tweet.deleteMany({
        where: { taskId },
      });

      await db.spiderTask.delete({
        where: { id: taskId },
      });

      console.log(`任务删除成功: ${taskId}`);
    } catch (error) {
      console.error('删除任务失败:', error);
      throw new Error('删除任务失败');
    }
  }

  /**
   * 清理旧数据（可选功能）
   */
  async cleanupOldData(daysOld = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // 删除旧的已完成任务
      const oldTasks = await db.spiderTask.findMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
      });

      for (const task of oldTasks) {
        await this.deleteTask(task.id);
      }

      console.log(`清理完成: 删除了 ${oldTasks.length} 个旧任务`);
    } catch (error) {
      console.error('清理旧数据失败:', error);
    }
  }

  /**
   * 获取统计信息（排除逻辑删除的推文）
   */
  async getStats(): Promise<{
    totalTasks: number;
    completedTasks: number;
    runningTasks: number;
    failedTasks: number;
    totalTweets: number;
  }> {
    try {
      const [
        totalTasks,
        completedTasks,
        runningTasks,
        failedTasks,
        totalTweets,
      ] = await Promise.all([
        db.spiderTask.count(),
        db.spiderTask.count({ where: { status: 'completed' } }),
        db.spiderTask.count({ where: { status: 'running' } }),
        db.spiderTask.count({ where: { status: 'failed' } }),
        db.tweet.count({ where: { isDeleted: false } }), // 排除逻辑删除的推文
      ]);

      return {
        totalTasks,
        completedTasks,
        runningTasks,
        failedTasks,
        totalTweets,
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        runningTasks: 0,
        failedTasks: 0,
        totalTweets: 0,
      };
    }
  }

  /**
   * 逻辑删除单个推文
   */
  async deleteTweet(tweetId: string, deletedBy?: string): Promise<void> {
    try {
      await db.tweet.update({
        where: { id: tweetId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || 'system',
        },
      });
      console.log(`推文逻辑删除成功: ${tweetId}`);
    } catch (error) {
      console.error('逻辑删除推文失败:', error);
      throw new Error('逻辑删除推文失败');
    }
  }

  /**
   * 批量逻辑删除推文
   */
  async batchDeleteTweets(tweetIds: string[], deletedBy?: string): Promise<number> {
    try {
      const result = await db.tweet.updateMany({
        where: {
          id: {
            in: tweetIds,
          },
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || 'system',
        },
      });
      
      console.log(`批量逻辑删除推文成功: ${result.count} 条`);
      return result.count;
    } catch (error) {
      console.error('批量逻辑删除推文失败:', error);
      throw new Error('批量逻辑删除推文失败');
    }
  }

  /**
   * 导出推文数据（排除逻辑删除）
   */
  async exportTweets(
    taskId?: string,
    listId?: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const where: any = {
        isDeleted: false, // 排除逻辑删除的推文
      };
      if (taskId) where.taskId = taskId;
      if (listId) where.listId = listId;

      const tweets = await db.tweet.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
      });

      // 解析媒体URLs
      const parsedTweets = tweets.map((tweet: any) => ({
        ...tweet,
        imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : [],
        videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
      }));

      if (format === 'json') {
        return JSON.stringify(parsedTweets, null, 2);
      } else {
        // CSV格式
        if (parsedTweets.length === 0) {
          return '';
        }

        const headers = [
          'id', 'content', 'userNickname', 'userUsername',
          'replyCount', 'retweetCount', 'likeCount', 'viewCount',
          'isRT', 'isReply', 'imageUrls', 'tweetUrl', 'publishedAt', 'listId', 'scrapedAt'
        ];

        const csvRows = [
          headers.join(','),
          ...parsedTweets.map((tweet: any) => [
            tweet.id,
            `"${tweet.content.replace(/"/g, '""')}"`,
            `"${tweet.userNickname}"`,
            `"${tweet.userUsername}"`,
            tweet.replyCount,
            tweet.retweetCount,
            tweet.likeCount,
            tweet.viewCount,
            tweet.isRT ? 'true' : 'false',
            tweet.isReply ? 'true' : 'false',
            `"${tweet.imageUrls.join(';')}"`,
            tweet.tweetUrl,
            new Date(tweet.publishedAt).toISOString(),
            tweet.listId,
            new Date(tweet.scrapedAt).toISOString(),
          ].join(','))
        ];

        return csvRows.join('\n');
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('导出数据失败');
    }
  }

  /**
   * 统计符合条件的可用推文数量 (高效计数，排除逻辑删除)
   */
  async countAvailableTweets(params: {
    listId?: string;
    username?: string;
    isExtracted: boolean;
  }) {
    try {
      const { listId, username, isExtracted } = params;

      // 构建查询条件
      const where: any = {
        isDeleted: false, // 排除逻辑删除的推文
      };
      
      // 根据是否已提取设置状态条件
      if (isExtracted) {
        where.analysisStatus = 'synced';
      } else {
        where.OR = [
          { analysisStatus: 'pending' },
          { analysisStatus: null }
        ];
      }

      // 添加可选过滤条件
      if (listId) {
        where.listId = listId;
      }
      
      if (username) {
        where.userUsername = username;
      }

      const count = await db.tweet.count({ where });
      return count;
    } catch (error) {
      console.error('统计可用推文数量失败:', error);
      throw new Error(`统计可用推文数量失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 根据条件提取推文数据 (支持 dryRun 和 requireFullAmount)
   */
  async extractTweetData(params: {
    batchId: string;
    maxCount: number;
    listId?: string;     // 保留单个listId支持（兼容性）
    listIds?: string[];  // 新增多个listIds支持
    username?: string;
    isExtracted: boolean;
    isRT?: boolean;
    isReply?: boolean;
    dryRun?: boolean;
    requireFullAmount?: boolean;
  }) {
    try {
      const { 
        batchId, 
        maxCount, 
        listId, 
        listIds,
        username, 
        isExtracted,
        isRT,
        isReply,
        dryRun = false,
        requireFullAmount = false
      } = params;

      // 处理listId兼容性：统一使用listIds数组
      const effectiveListIds = listIds || (listId ? [listId] : undefined);

      // 如果需要足额返回，先检查数据量
      if (requireFullAmount) {
        const availableCount = await this.countAvailableTweets({
          listId,
          username,
          isExtracted
        });

        if (availableCount < maxCount) {
          // 数据不足，返回特殊错误信息
          throw {
            code: 'INSUFFICIENT_DATA',
            message: '可用数据不足，无法满足足额返回要求',
            requiredCount: maxCount,
            availableCount,
            shortage: maxCount - availableCount
          };
        }
      }

      // 使用事务确保原子性操作
      const result = await db.$transaction(async (tx) => {
        // 构建查询条件
        const where: any = {
          isDeleted: false, // 排除逻辑删除的推文
        };
        
        // 根据是否已提取设置状态条件
        if (isExtracted) {
          where.analysisStatus = 'synced';
        } else {
          where.OR = [
            { analysisStatus: 'pending' },
            { analysisStatus: null }
          ];
        }

        // 添加可选过滤条件 - 支持多个listIds
        if (effectiveListIds && effectiveListIds.length > 0) {
          where.listId = { in: effectiveListIds };
        }
        
        if (username) {
          where.userUsername = username;
        }

        // 可选条件筛选：isRT / isReply
        if (typeof isRT === 'boolean') {
          where.isRT = isRT;
        }
        if (typeof isReply === 'boolean') {
          where.isReply = isReply;
        }

        console.log('[DATA EXTRACT] 查询条件:', where);
        console.log('[DATA EXTRACT] dryRun:', dryRun, 'requireFullAmount:', requireFullAmount);

        // 在事务中查询符合条件的推文
        const tweets = await tx.tweet.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          take: maxCount,
          select: {
            id: true,
            content: true,
            userNickname: true,
            userUsername: true,
            replyCount: true,
            retweetCount: true,
            likeCount: true,
            viewCount: true,
            imageUrls: true,
            profileImageUrl: true,
            videoUrls: true,
            tweetUrl: true,
            publishedAt: true,
            listId: true,
            scrapedAt: true,
            analysisStatus: true,
            syncedAt: true,
            analyzedAt: true,
            analysisBatchId: true,
            taskId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (tweets.length === 0) {
          return {
            tweets: [],
            extractedCount: 0,
            batchId,
            extractedAt: new Date().toISOString(),
            isDryRun: dryRun
          };
        }

        const tweetIds = tweets.map(tweet => tweet.id);

        // 只有非 dryRun 模式才更新数据库状态
        if (!dryRun) {
          // 更新推文状态为已同步
          await tx.tweet.updateMany({
            where: { id: { in: tweetIds } },
            data: {
              analysisStatus: 'synced',
              syncedAt: new Date(),
              analysisBatchId: batchId
            }
          });

          // 创建提取记录
          await tx.dataSyncRecord.create({
            data: {
              batchId,
              tweetIds: JSON.stringify(tweetIds),
              tweetCount: tweets.length,
              status: 'synced',
              extractType: 'data_export',
              listId,
              username,
              isReExtract: isExtracted,
              requestSystem: 'data_extract_api'
            }
          });
        }

        // 解析并格式化推文数据
        const formattedTweets = tweets.map((tweet: any) => ({
          ...tweet,
          imageUrls: tweet.imageUrls ? JSON.parse(tweet.imageUrls) : [],
          videoUrls: tweet.videoUrls ? JSON.parse(tweet.videoUrls) : null,
          publishedAt: tweet.publishedAt ? Number(tweet.publishedAt) : 0,
          scrapedAt: tweet.scrapedAt ? Number(tweet.scrapedAt) : 0,
        }));

        console.log(`[DATA EXTRACT] ${dryRun ? '预览' : '成功提取'} ${tweets.length} 条推文数据`);

        return {
          tweets: formattedTweets,
          extractedCount: tweets.length,
          batchId,
          extractedAt: new Date().toISOString(),
          isDryRun: dryRun
        };
      });

      return result;

    } catch (error) {
      // 如果是我们抛出的特殊错误，直接重新抛出
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      
      console.error('数据提取失败:', error);
      throw new Error(`数据提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取数据提取记录列表
   */
  async getExtractRecords(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        db.dataSyncRecord.findMany({
          where: { extractType: 'data_export' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.dataSyncRecord.count({
          where: { extractType: 'data_export' }
        }),
      ]);

      return {
        records,
        total,
        page,
        limit,
        hasMore: page * limit < total
      };
    } catch (error) {
      console.error('获取提取记录失败:', error);
      throw new Error('获取提取记录失败');
    }
  }
} 