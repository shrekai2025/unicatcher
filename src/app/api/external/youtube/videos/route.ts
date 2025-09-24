/**
 * YouTube视频数据 REST API
 *
 * GET /api/external/youtube/videos - 获取YouTube视频数据列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取YouTube视频数据列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const channelHandle = searchParams.get('channelHandle');
    const taskId = searchParams.get('taskId');
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);

    // 构建查询条件
    const where: any = {
      isDeleted: false,
    };

    if (channelHandle) {
      where.channelHandle = channelHandle;
    }
    if (taskId) {
      where.taskId = taskId;
    }

    const skip = (page - 1) * limit;

    // 查询数据
    const [videos, total] = await Promise.all([
      db.youTubeVideo.findMany({
        where,
        orderBy: { publishedTimestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          channelName: true,
          channelHandle: true,
          channelUrl: true,
          videoUrl: true,
          thumbnailUrl: true,
          duration: true,
          viewCount: true,
          publishedAt: true,
          publishedTimestamp: true,
          scrapedAt: true,
          // 数据分析字段
          analysisStatus: true,
          syncedAt: true,
          analyzedAt: true,
          // AI字段
          keywords: true,
          topicTags: true,
          contentTypes: true,
          aiProcessStatus: true,
          // 翻译字段
          translatedTitle: true,
          isTranslated: true,
          translationProvider: true,
          // 任务关联
          taskId: true,
          createdAt: true,
        },
      }),
      db.youTubeVideo.count({ where }),
    ]);

    // 转换BigInt为数字并解析JSON字段
    const formattedVideos = videos.map((video) => ({
      ...video,
      publishedTimestamp: video.publishedTimestamp ? Number(video.publishedTimestamp) : null,
      scrapedAt: Number(video.scrapedAt),
      // 解析JSON字段
      keywords: video.keywords ? JSON.parse(video.keywords) : null,
      topicTags: video.topicTags ? JSON.parse(video.topicTags) : null,
      contentTypes: video.contentTypes ? JSON.parse(video.contentTypes) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        videos: formattedVideos,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('获取YouTube视频数据失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取视频数据失败',
        success: false
      },
      { status: 500 }
    );
  }
}