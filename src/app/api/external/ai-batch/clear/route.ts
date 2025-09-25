import { NextRequest, NextResponse } from 'next/server';
import { AIProcessManager } from '~/server/core/ai/process-manager';
import { db } from '~/server/db';

const processManager = AIProcessManager.getInstance();

// 简单的API Key认证（与现有外部API保持一致）
const API_KEYS = ['unicatcher-api-key-demo']; // 实际应该从环境变量读取

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return API_KEYS.includes(apiKey || '');
}

/**
 * 清除所有AI批处理任务和状态
 * 这是一个专门的清除接口，简化操作，强制清理所有相关状态
 */
export async function POST(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    console.log('[AI批处理清除] 🧹 开始清除所有AI批处理任务', { timestamp: new Date().toISOString() });

    // 获取清理前的状态信息
    const globalStatus = await processManager.getGlobalStatus();
    const activeProcesses = processManager.getActiveProcesses();
    
    // 查询数据库中的处理中任务
    const processingRecords = await db.aIProcessRecord.findMany({
      where: { status: 'processing' },
      select: {
        batchId: true,
        startedAt: true,
        totalTweets: true,
        processedTweets: true
      }
    });

    console.log('[AI批处理清除] 📊 清理前状态:', {
      hasGlobalTask: globalStatus.hasActiveTask,
      currentBatchId: globalStatus.currentBatchId,
      activeProcessesCount: activeProcesses.length,
      processingRecordsCount: processingRecords.length,
      activeProcesses,
      processingRecords: processingRecords.map(r => r.batchId)
    });

    // 1. 强制重置ProcessManager状态（清除内存中的活跃任务）
    await processManager.forceReset();
    console.log('[AI批处理清除] ✅ ProcessManager状态已重置');

    // 2. 更新数据库中所有处理中的任务为取消状态
    const updateResult = await db.aIProcessRecord.updateMany({
      where: { status: 'processing' },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorMessage: 'API清除操作：手动取消所有处理中任务'
      }
    });

    console.log('[AI批处理清除] ✅ 数据库处理中任务已清理:', { 
      updatedCount: updateResult.count 
    });

    // 3. 验证清理结果
    const afterGlobalStatus = await processManager.getGlobalStatus();
    const afterActiveProcesses = processManager.getActiveProcesses();
    const afterProcessingRecords = await db.aIProcessRecord.count({
      where: { status: 'processing' }
    });

    const clearResult = {
      success: true,
      message: '所有AI批处理任务已成功清除',
      data: {
        clearTime: new Date().toISOString(),
        beforeClear: {
          hasGlobalTask: globalStatus.hasActiveTask,
          currentBatchId: globalStatus.currentBatchId,
          activeProcessesCount: activeProcesses.length,
          processingRecordsCount: processingRecords.length
        },
        afterClear: {
          hasGlobalTask: afterGlobalStatus.hasActiveTask,
          currentBatchId: afterGlobalStatus.currentBatchId,
          activeProcessesCount: afterActiveProcesses.length,
          processingRecordsCount: afterProcessingRecords
        },
        clearedTasks: {
          processingRecords: processingRecords.length,
          activeProcesses: activeProcesses.length,
          databaseUpdates: updateResult.count
        }
      }
    };

    console.log('[AI批处理清除] 🎉 清除完成:', clearResult.data);
    
    return NextResponse.json(clearResult);

  } catch (error) {
    console.error('[AI批处理清除] ❌ 清除失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '清除操作失败',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 获取清除操作的预览信息
 * 显示当前有哪些任务会被清除，但不执行实际清除操作
 */
export async function GET(request: NextRequest) {
  try {
    // API Key验证
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      );
    }

    console.log('[AI批处理清除] 🔍 获取清除预览信息');

    // 获取当前状态
    const globalStatus = await processManager.getGlobalStatus();
    const activeProcesses = processManager.getActiveProcesses();
    
    // 查询数据库中的处理中任务
    const processingRecords = await db.aIProcessRecord.findMany({
      where: { status: 'processing' },
      select: {
        batchId: true,
        startedAt: true,
        totalTweets: true,
        processedTweets: true,
        aiProvider: true,
        aiModel: true
      },
      orderBy: { startedAt: 'desc' }
    });

    // 统计总体信息
    const totalTasksToBeCleared = Math.max(
      processingRecords.length,
      activeProcesses.length,
      globalStatus.hasActiveTask ? 1 : 0
    );

    const previewInfo = {
      success: true,
      message: totalTasksToBeCleared > 0 
        ? `发现 ${totalTasksToBeCleared} 个任务待清除` 
        : '当前没有需要清除的任务',
      data: {
        needsClear: totalTasksToBeCleared > 0,
        currentStatus: {
          hasGlobalTask: globalStatus.hasActiveTask,
          currentBatchId: globalStatus.currentBatchId,
          globalMessage: globalStatus.message
        },
        activeProcesses: {
          count: activeProcesses.length,
          batchIds: activeProcesses
        },
        processingRecords: {
          count: processingRecords.length,
          tasks: processingRecords.map(record => ({
            batchId: record.batchId,
            startedAt: record.startedAt,
            progress: `${record.processedTweets}/${record.totalTweets}`,
            aiProvider: record.aiProvider,
            aiModel: record.aiModel,
            duration: record.startedAt ? 
              `${Math.round((Date.now() - record.startedAt.getTime()) / 1000)}秒` : 
              'unknown'
          }))
        },
        estimation: {
          tasksToCancel: processingRecords.length,
          memoryToReset: activeProcesses.length,
          globalStateToReset: globalStatus.hasActiveTask
        },
        timestamp: new Date().toISOString()
      }
    };

    console.log('[AI批处理清除] 📋 预览信息生成完成:', {
      needsClear: previewInfo.data.needsClear,
      totalTasks: totalTasksToBeCleared
    });

    return NextResponse.json(previewInfo);

  } catch (error) {
    console.error('[AI批处理清除] ❌ 获取预览信息失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取预览信息失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
