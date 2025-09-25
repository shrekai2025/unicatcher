/**
 * 单个YouTube频道管理 REST API
 *
 * GET /api/external/youtube/channels/[channelId] - 获取频道详情
 * PUT /api/external/youtube/channels/[channelId] - 更新频道记录
 * DELETE /api/external/youtube/channels/[channelId] - 删除频道记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取频道详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId 参数必需' },
        { status: 400 }
      );
    }

    // 获取频道记录
    const channel = await db.youTubeChannelRecord.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: '频道记录不存在' },
        { status: 404 }
      );
    }

    // 获取频道统计信息
    const [videoCount, latestVideo] = await Promise.all([
      db.youTubeVideo.count({
        where: {
          channelHandle: channel.channelHandle,
          isDeleted: false,
        },
      }),
      db.youTubeVideo.findFirst({
        where: {
          channelHandle: channel.channelHandle,
          isDeleted: false,
        },
        orderBy: { publishedTimestamp: 'desc' },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          publishedTimestamp: true,
          scrapedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        channel,
        stats: {
          videoCount,
          latestVideo: latestVideo ? {
            ...latestVideo,
            publishedTimestamp: latestVideo.publishedTimestamp ? Number(latestVideo.publishedTimestamp) : null,
            scrapedAt: Number(latestVideo.scrapedAt),
          } : null,
        },
      },
    });

  } catch (error) {
    console.error('获取频道详情失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取频道详情失败',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * 更新频道记录
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await request.json();

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId 参数必需' },
        { status: 400 }
      );
    }

    const { channelName, isActive, notes } = body;

    // 构建更新数据
    const updateData: any = {};
    if (typeof channelName === 'string') {
      updateData.channelName = channelName;
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    if (typeof notes === 'string' || notes === null) {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供有效的更新字段' },
        { status: 400 }
      );
    }

    // 更新频道记录
    const channel = await db.youTubeChannelRecord.update({
      where: { id: channelId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        channel,
        message: '频道记录已更新',
      },
    });

  } catch (error) {
    console.error('更新频道记录失败:', error);

    // 处理记录不存在的情况
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: '频道记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '更新频道记录失败',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * 删除频道记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId 参数必需' },
        { status: 400 }
      );
    }

    // 删除频道记录
    await db.youTubeChannelRecord.delete({
      where: { id: channelId },
    });

    return NextResponse.json({
      success: true,
      message: '频道记录已删除',
    });

  } catch (error) {
    console.error('删除频道记录失败:', error);

    // 处理记录不存在的情况
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: '频道记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '删除频道记录失败',
        success: false
      },
      { status: 500 }
    );
  }
}