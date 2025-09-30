import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

/**
 * X Helper 任务状态查询接口
 * GET /api/external/x-helper/task/[taskId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 验证API密钥
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || apiKey !== 'unicatcher-api-key-demo') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        },
        { status: 401 }
      );
    }

    const { taskId } = await params;
    console.log(`[X Helper Task API] 查询任务状态: ${taskId}`);

    // 查询任务
    const task = await db.tweetProcessTask.findUnique({
      where: {
        id: taskId,
        taskType: 'x_helper_process'
      }
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        },
        { status: 404 }
      );
    }

    // 解析AI评论
    let aiComments = [];
    if (task.aiComments) {
      try {
        aiComments = JSON.parse(task.aiComments);
      } catch (error) {
        console.error('[X Helper Task API] 解析AI评论失败:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        tweetId: task.tweetId,
        tweetUrl: task.tweetUrl,
        status: task.status,

        // 推文信息
        tweetContent: task.tweetContent,
        authorUsername: task.authorUsername,
        authorNickname: task.authorNickname,
        authorProfileImage: task.authorProfileImage,

        // 处理结果
        translatedContent: task.translatedContent,
        aiComments,
        userExtraInfo: task.userExtraInfo,

        // 时间信息
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,

        // 错误信息
        errorMessage: task.errorMessage
      }
    });

  } catch (error) {
    console.error('[X Helper Task API] 查询失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal Server Error'
        }
      },
      { status: 500 }
    );
  }
}