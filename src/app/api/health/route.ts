import { NextResponse } from 'next/server';
import { StorageService } from '~/server/core/data/storage';

/**
 * 健康检查端点
 * 用于Docker容器健康检查和负载均衡器检测
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // 基础检查
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'pending',
        memory: 'pending',
        disk: 'pending'
      }
    };

    // 数据库连接检查
    try {
      const storageService = new StorageService();
      await storageService.getTasks(1, 1); // 简单查询测试连接
      checks.checks.database = 'healthy';
    } catch (error) {
      checks.checks.database = 'unhealthy';
      checks.status = 'degraded';
    }

    // 内存使用检查
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // 内存使用率检查（警告阈值500MB，错误阈值1GB）
    if (memUsageMB.rss > 1024) {
      checks.checks.memory = 'unhealthy';
      checks.status = 'unhealthy';
    } else if (memUsageMB.rss > 512) {
      checks.checks.memory = 'warning';
      checks.status = checks.status === 'ok' ? 'degraded' : checks.status;
    } else {
      checks.checks.memory = 'healthy';
    }

    // 磁盘空间检查（简化版）
    try {
      const fs = await import('fs/promises');
      await fs.access('./data', fs.constants.W_OK);
      checks.checks.disk = 'healthy';
    } catch (error) {
      checks.checks.disk = 'unhealthy';
      checks.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;

    const response = {
      ...checks,
      responseTime: `${responseTime}ms`,
      memory: memUsageMB
    };

    // 根据健康状态返回相应的HTTP状态码
    const httpStatus = checks.status === 'ok' ? 200 : 
                      checks.status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: 'unknown',
        memory: 'unknown',
        disk: 'unknown'
      }
    }, { status: 503 });
  }
} 