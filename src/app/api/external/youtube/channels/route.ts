/**
 * YouTube频道管理 REST API
 *
 * GET /api/external/youtube/channels - 获取频道记录列表
 * POST /api/external/youtube/channels - 添加频道记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * 获取频道记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);
    const isActiveParam = searchParams.get('isActive');

    // 构建查询条件
    const where: any = {};
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true';
    }

    const skip = (page - 1) * limit;

    // 查询数据
    const [channels, total] = await Promise.all([
      db.youTubeChannelRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.youTubeChannelRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        channels,
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
    console.error('获取频道记录失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取频道记录失败',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * 添加频道记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHandle, channelName, notes } = body;

    // 参数验证
    if (!channelHandle || typeof channelHandle !== 'string') {
      return NextResponse.json(
        { error: 'channelHandle 参数必需且必须为字符串' },
        { status: 400 }
      );
    }

    if (!channelName || typeof channelName !== 'string') {
      return NextResponse.json(
        { error: 'channelName 参数必需且必须为字符串' },
        { status: 400 }
      );
    }

    // 验证频道handle格式 - 基本验证
    if (!channelHandle.trim() || channelHandle.length > 100) {
      return NextResponse.json(
        { error: '频道handle不能为空且长度不能超过100个字符' },
        { status: 400 }
      );
    }

    // 检查是否已存在
    const existing = await db.youTubeChannelRecord.findUnique({
      where: { channelHandle },
    });

    if (existing) {
      return NextResponse.json(
        { error: '该频道已存在于监控列表中' },
        { status: 409 }
      );
    }

    // 创建频道记录
    const channel = await db.youTubeChannelRecord.create({
      data: {
        channelHandle,
        channelName,
        channelUrl: channelHandle.startsWith('@')
          ? `https://www.youtube.com/${channelHandle}`
          : channelHandle.startsWith('UC')
          ? `https://www.youtube.com/channel/${channelHandle}`
          : `https://www.youtube.com/@${channelHandle}`,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        channel,
        message: '频道已添加到监控列表',
      },
    });

  } catch (error) {
    console.error('添加频道记录失败:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '添加频道失败',
        success: false
      },
      { status: 500 }
    );
  }
}