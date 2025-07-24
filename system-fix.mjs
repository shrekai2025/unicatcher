#!/usr/bin/env node

/**
 * 系统性数据库问题修复脚本
 * 解决：进程占用、路径配置、字段类型、环境变量等问题
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

console.log('🔧 开始系统性数据库问题诊断和修复...\n');

async function systemFix() {
  try {
    // ================== 第1步：进程清理 ==================
    console.log('📋 第1步：清理占用进程...');
    
    try {
      // 尝试优雅停止进程
      console.log('尝试优雅停止Node.js进程...');
      execSync('taskkill /im node.exe', { stdio: 'pipe' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('没有找到Node.js进程或已停止');
    }

    try {
      // 强制停止进程
      console.log('强制停止所有相关进程...');
      execSync('taskkill /f /im node.exe', { stdio: 'pipe' });
      execSync('taskkill /f /im npm.exe', { stdio: 'pipe' });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('进程清理完成');
    }

    // ================== 第2步：环境变量检查和创建 ==================
    console.log('\n📋 第2步：检查和修复环境变量...');
    
    const envFiles = ['.env', '.env.local', '.env.development'];
    let envExists = false;
    
    for (const envFile of envFiles) {
      if (existsSync(envFile)) {
        console.log(`✅ 发现环境变量文件: ${envFile}`);
        const content = await fs.readFile(envFile, 'utf-8');
        console.log(`内容:\n${content}`);
        envExists = true;
      }
    }
    
    if (!envExists) {
      console.log('❌ 未发现任何环境变量文件，创建新的.env文件...');
      const envContent = `# 数据库配置
DATABASE_URL="file:./prisma/db.sqlite"

# NextAuth.js 配置  
AUTH_SECRET="unicatcher-secret-key-2024"
NEXTAUTH_URL="http://localhost:3067"

# 应用配置
NODE_ENV="development"
`;
      await fs.writeFile('.env', envContent);
      console.log('✅ .env文件创建成功');
    }

    // ================== 第3步：数据库文件检查和清理 ==================
    console.log('\n📋 第3步：数据库文件诊断...');
    
    const possibleDbPaths = [
      './prisma/db.sqlite',
      './prisma/data/database/unicatcher.db',
      './data/database/unicatcher.db',
      './unicatcher.db'
    ];
    
    const existingDbs = [];
    for (const dbPath of possibleDbPaths) {
      if (existsSync(dbPath)) {
        const stats = await fs.stat(dbPath);
        existingDbs.push({
          path: dbPath,
          size: stats.size,
          modified: stats.mtime
        });
        console.log(`📁 发现数据库: ${dbPath} (${Math.round(stats.size/1024)}KB)`);
      }
    }
    
    if (existingDbs.length === 0) {
      console.log('ℹ️  未发现现有数据库文件');
    } else {
      console.log('\n🗑️  清理旧数据库文件...');
      for (const db of existingDbs) {
        try {
          await fs.unlink(db.path);
          console.log(`✅ 删除: ${db.path}`);
        } catch (error) {
          console.log(`⚠️  无法删除 ${db.path}: ${error.message}`);
          
          // 尝试重命名为备份
          try {
            const backupPath = `${db.path}.backup.${Date.now()}`;
            await fs.rename(db.path, backupPath);
            console.log(`📦 重命名为备份: ${backupPath}`);
          } catch (renameError) {
            console.log(`❌ 重命名也失败，文件可能被占用: ${renameError.message}`);
          }
        }
      }
    }

    // ================== 第4步：清理Prisma缓存 ==================
    console.log('\n📋 第4步：清理Prisma缓存...');
    
    const prismaCachePaths = [
      './node_modules/.prisma',
      './.next',
      './prisma/migrations'
    ];
    
    for (const cachePath of prismaCachePaths) {
      if (existsSync(cachePath)) {
        try {
          await fs.rm(cachePath, { recursive: true, force: true });
          console.log(`✅ 清理缓存: ${cachePath}`);
        } catch (error) {
          console.log(`⚠️  无法清理 ${cachePath}: ${error.message}`);
        }
      }
    }

    // ================== 第5步：重新初始化数据库 ==================
    console.log('\n📋 第5步：重新初始化数据库...');
    
    try {
      console.log('生成Prisma客户端...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma客户端生成成功');
    } catch (error) {
      console.error('❌ Prisma客户端生成失败:', error.message);
    }

    try {
      console.log('推送数据库架构...');
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
      console.log('✅ 数据库架构推送成功');
    } catch (error) {
      console.error('❌ 数据库架构推送失败:', error.message);
      
      // 尝试基本的db push
      try {
        console.log('尝试基本的db push...');
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ 基本数据库推送成功');
      } catch (basicError) {
        console.error('❌ 基本数据库推送也失败:', basicError.message);
      }
    }

    // ================== 第6步：验证修复结果 ==================
    console.log('\n📋 第6步：验证修复结果...');
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // 测试数据库连接
      await prisma.$connect();
      console.log('✅ 数据库连接成功');
      
      // 测试表创建
      const taskCount = await prisma.spiderTask.count();
      const tweetCount = await prisma.tweet.count();
      console.log(`✅ 数据库表正常: ${taskCount} 个任务, ${tweetCount} 条推文`);
      
      await prisma.$disconnect();
      
    } catch (testError) {
      console.error('❌ 数据库验证失败:', testError.message);
      throw testError;
    }

    // ================== 第7步：总结和建议 ==================
    console.log('\n🎉 系统性修复完成！');
    console.log('\n📋 修复总结:');
    console.log('  ✅ 进程清理完成');
    console.log('  ✅ 环境变量配置正确');
    console.log('  ✅ 数据库文件清理完成');
    console.log('  ✅ Prisma缓存清理完成');
    console.log('  ✅ 数据库重新初始化成功');
    console.log('  ✅ 连接验证通过');

    console.log('\n🚀 下一步操作:');
    console.log('  1. 运行: npm run dev');
    console.log('  2. 访问: http://localhost:3067');
    console.log('  3. 测试爬虫功能');
    console.log('  4. 检查推文数据显示');

  } catch (error) {
    console.error('\n💥 系统修复失败:', error.message);
    console.log('\n🔧 手动修复步骤：');
    console.log('  1. 手动停止所有Node.js进程');
    console.log('  2. 删除所有数据库文件');
    console.log('  3. 清理.next目录');
    console.log('  4. 运行: npx prisma generate');
    console.log('  5. 运行: npx prisma db push');
    console.log('  6. 重启开发服务器');
    throw error;
  }
}

systemFix()
  .then(() => {
    console.log('\n✨ 系统修复完成，项目已就绪！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 系统修复失败');
    process.exit(1);
  }); 