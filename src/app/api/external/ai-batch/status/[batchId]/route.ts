import { NextRequest, NextResponse } from 'next/server';
import { AIProcessManager } from '~/server/core/ai/process-manager';

const processManager = AIProcessManager.getInstance();

// 简单的API Key认证（与现有外部API保持一致）
const API_KEYS = ['unicatcher-api-key-demo']; // 实际应该从环境变量读取

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

// 查询指定批次的处理状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Batch ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('[AI批处理API] 查询批次状态:', batchId);

    // 获取批次状态
    const status = await processManager.getBatchStatus(batchId);

    if (!status) {
      return NextResponse.json(
        { 
          success: false,
          error: `批次 ${batchId} 不存在` 
        },
        { status: 404 }
      );
    }

    // 计算进度百分比
    const progressPercentage = status.progress.total > 0 
      ? Math.round((status.progress.processed / status.progress.total) * 100)
      : 0;

    const responseData = {
      batchId: status.batchId,
      status: status.status,
      progress: {
        total: status.progress.total,
        processed: status.progress.processed,
        succeeded: status.progress.succeeded,
        failed: status.progress.failed,
        percentage: progressPercentage,
      },
      error: status.error,
      isActive: status.status === 'processing',
      message: getStatusMessage(status.status, progressPercentage)
    };

    console.log('[AI批处理API] 批次状态查询结果:', {
      batchId,
      status: status.status,
      progress: `${status.progress.processed}/${status.progress.total}`,
      percentage: progressPercentage
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('[AI批处理API] 查询状态失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string, percentage: number): string {
  switch (status) {
    case 'processing':
      return `正在处理中，进度 ${percentage}%`;
    case 'completed':
      return '处理完成';
    case 'failed':
      return '处理失败';
    case 'cancelled':
      return '任务已取消';
    default:
      return '未知状态';
  }
}
