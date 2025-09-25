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
 * 强制重置AI批处理状态
 * 用于清理僵尸状态，当系统状态异常时使用
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

    const body = await request.json();
    const forceReset = body.force === true;

    console.log('[AI批处理重置] 开始重置状态', { forceReset, timestamp: new Date().toISOString() });

    // 获取当前状态
    const globalStatus = await processManager.getGlobalStatus();
    
    if (forceReset) {
      // 强制重置：清理所有处理中的状态
      console.log('[AI批处理重置] 执行强制重置');
      
      // 1. 清理数据库中的处理中状态
      const updatedRecords = await db.aIProcessRecord.updateMany({
        where: { status: 'processing' },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          errorMessage: '系统重置时自动取消'
        }
      });

      // 2. 调用ProcessManager的重置方法
      await processManager.forceReset();

      console.log('[AI批处理重置] 强制重置完成', { 
        updatedRecords: updatedRecords.count,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: '强制重置完成',
        data: {
          previousStatus: globalStatus,
          updatedRecords: updatedRecords.count,
          resetAt: new Date().toISOString()
        }
      });
    } else {
      // 温和重置：只在状态不一致时清理
      if (globalStatus.hasActiveTask) {
        // 检查对应的批次是否真的在数据库中存在且为processing状态
        const dbRecord = globalStatus.currentBatchId ? 
          await db.aIProcessRecord.findUnique({
            where: { batchId: globalStatus.currentBatchId }
          }) : null;

        const activeProcesses = processManager.getActiveProcesses();
        const hasActiveProcess = activeProcesses.includes(globalStatus.currentBatchId || '');

        if (!dbRecord || dbRecord.status !== 'processing') {
          // 数据库状态不一致，清理内存状态
          console.log('[AI批处理重置] 发现数据库状态不一致，清理内存状态', {
            memoryBatchId: globalStatus.currentBatchId,
            dbRecord: dbRecord ? { batchId: dbRecord.batchId, status: dbRecord.status } : null
          });

          await processManager.forceReset();

          return NextResponse.json({
            success: true,
            message: '检测到数据库状态不一致，已自动清理',
            data: {
              previousStatus: globalStatus,
              dbRecord,
              resetAt: new Date().toISOString()
            }
          });
        } else if (!hasActiveProcess) {
          // 数据库显示processing但内存中没有活跃任务，说明任务异常终止
          console.log('[AI批处理重置] 发现任务异常终止，清理僵尸状态', {
            batchId: globalStatus.currentBatchId,
            dbStatus: dbRecord.status,
            activeProcesses
          });

          // 更新数据库状态为失败
          await db.aIProcessRecord.update({
            where: { batchId: globalStatus.currentBatchId! },
            data: {
              status: 'failed',
              completedAt: new Date(),
              errorMessage: '任务异常终止，系统自动清理'
            }
          });

          await processManager.forceReset();

          return NextResponse.json({
            success: true,
            message: '检测到任务异常终止，已自动清理',
            data: {
              previousStatus: globalStatus,
              reason: 'task_terminated_abnormally',
              resetAt: new Date().toISOString()
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: '状态正常，无需重置',
        data: {
          currentStatus: globalStatus
        }
      });
    }

  } catch (error) {
    console.error('[AI批处理重置] 重置失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

/**
 * 获取重置状态信息
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

    const globalStatus = await processManager.getGlobalStatus();
    
    // 检查数据库中的处理状态
    const processingRecords = await db.aIProcessRecord.findMany({
      where: { status: 'processing' },
      select: {
        batchId: true,
        startedAt: true,
        totalTweets: true,
        processedTweets: true
      },
      orderBy: { startedAt: 'desc' }
    });

    const activeProcesses = processManager.getActiveProcesses();

    return NextResponse.json({
      success: true,
      data: {
        globalStatus,
        processingRecords,
        activeProcesses,
        isConsistent: processingRecords.length === (globalStatus.hasActiveTask ? 1 : 0)
      }
    });

  } catch (error) {
    console.error('[AI批处理重置] 获取状态失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}
