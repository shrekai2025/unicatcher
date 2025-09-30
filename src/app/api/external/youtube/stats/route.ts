/**
 * YouTube统计信息 REST API
 *
 * GET /api/external/youtube/stats - 获取YouTube监控统计信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取YouTube监控统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 并行查询各种统计信息
    const [
      totalChannels,
      activeChannels,
      totalVideos,
      todayVideos,
      weekVideos,
      runningTasks,
      completedTasks,
      failedTasks,
      topChannels,
    ] = await Promise.all([
      // 频道统计
      db.youTubeChannelRecord.count(),
      db.youTubeChannelRecord.count({ where: { isActive: true } }),

      // 视频统计
      db.youTubeVideo.count({ where: { isDeleted: false } }),
      db.youTubeVideo.count({
        where: {
          isDeleted: false,
          scrapedAt: {
            gte: BigInt(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
          },
        },
      }),
      db.youTubeVideo.count({
        where: {
          isDeleted: false,
          scrapedAt: {
            gte: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天内
          },
        },
      }),

      // 任务统计
      db.spiderTask.count({
        where: {
          type: 'youtube_channel',
          status: 'running',
        },
      }),
      db.spiderTask.count({
        where: {
          type: 'youtube_channel',
          status: 'completed',
        },
      }),
      db.spiderTask.count({
        where: {
          type: 'youtube_channel',
          status: 'failed',
        },
      }),

      // 频道视频数量排行
      db.youTubeVideo.groupBy({
        by: ['channelHandle', 'channelName'],
        where: { isDeleted: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // 格式化排行数据
    const formattedTopChannels = topChannels.map((channel) => ({
      channelHandle: channel.channelHandle,
      channelName: channel.channelName,
      videoCount: channel._count.id,
    }));

    // 计算增长率
    const lastWeekVideos = weekVideos - todayVideos;
    const videoGrowthRate = lastWeekVideos > 0
      ? ((todayVideos / lastWeekVideos) - 1) * 100
      : todayVideos > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        channels: {
          total: totalChannels,
          active: activeChannels,
          inactive: totalChannels - activeChannels,
        },
        videos: {
          total: totalVideos,
          today: todayVideos,
          thisWeek: weekVideos,
          growthRate: Number(videoGrowthRate.toFixed(2)),
        },
        tasks: {
          running: runningTasks,
          completed: completedTasks,
          failed: failedTasks,
          total: runningTasks + completedTasks + failedTasks,
        },
        rankings: {
          topChannels: formattedTopChannels,
        },
        timestamp: Date.now(),
      },
    });

  } catch (error) {
    console.error('获取YouTube统计信息失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取统计信息失败',
        success: false
      },
      { status: 500 }
    );
  }
}