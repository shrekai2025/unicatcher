#!/usr/bin/env node

/**
 * 清理僵尸任务脚本
 * 用于清理卡住或无限循环的爬虫任务
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('🧹 清理僵尸任务工具');
console.log('====================');

const prisma = new PrismaClient();

async function cleanupZombieTasks() {
  try {
    // 查找状态为running的任务
    const runningTasks = await prisma.spiderTask.findMany({
      where: { status: 'running' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 发现 ${runningTasks.length} 个状态为running的任务`);

    if (runningTasks.length === 0) {
      console.log('✨ 没有发现需要清理的任务');
      await prisma.$disconnect();
      return;
    }

    let cleanedCount = 0;

    for (const task of runningTasks) {
      const now = Date.now();
      const startTime = task.startedAt ? new Date(task.startedAt).getTime() : new Date(task.createdAt).getTime();
      const runningTime = now - startTime;
      const runningMinutes = Math.floor(runningTime / 60000);
      
      console.log(`📋 任务 ${task.id}:`);
      console.log(`  ├─ List ID: ${task.listId}`);
      console.log(`  ├─ 运行时间: ${runningMinutes} 分钟`);
      console.log(`  ├─ 已抓取: ${task.tweetCount} 条推文`);
      
      // 超过10分钟的任务标记为失败（僵尸任务）
      if (runningMinutes > 10) {
        console.log(`  └─ 🚨 运行时间过长，标记为失败`);
        
        await prisma.spiderTask.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            result: JSON.stringify({
              success: false,
              message: `任务运行超过10分钟，系统自动清理（僵尸任务）`,
              endReason: 'TIMEOUT',
              error: {
                code: 'ZOMBIE_TASK_CLEANUP',
                message: '任务运行时间过长，系统自动清理',
              },
              data: {
                tweetCount: task.tweetCount,
                duplicateCount: 0,
                skippedRetweetCount: 0,
                skippedReplyCount: 0,
                executionTime: runningTime,
              },
            })
          }
        });
        
        cleanedCount++;
      } else {
        console.log(`  └─ ✅ 运行时间正常，跳过`);
      }
    }

    console.log(`\n🎉 清理完成! 共清理 ${cleanedCount} 个僵尸任务`);

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ 清理僵尸任务失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 执行清理
cleanupZombieTasks();