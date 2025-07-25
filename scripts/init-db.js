#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

console.log('🗄️  初始化UniCatcher数据库...');

// 1. 加载环境变量
dotenv.config();

// 2. 检查环境变量
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL环境变量未设置');
  console.log('💡 请先创建.env文件并设置DATABASE_URL');
  console.log('💡 或者运行: npm run setup-dev');
  process.exit(1);
}

// 2. 确保数据库目录存在
const dbDir = './prisma';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ 创建数据库目录');
}

// 3. 推送数据库架构
try {
  console.log('🔄 推送数据库架构...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ 数据库架构已推送');
} catch (error) {
  console.error('❌ 数据库架构推送失败:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// 4. 生成Prisma客户端
try {
  console.log('🔄 生成Prisma客户端...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma客户端已生成');
} catch (error) {
  console.error('❌ Prisma客户端生成失败:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// 5. 创建初始数据（可选）
try {
  console.log('🔄 检查是否需要创建初始数据...');
  const prisma = new PrismaClient();
  
  // 检查是否已有数据
  const taskCount = await prisma.spiderTask.count();
  console.log(`📊 当前数据库中有 ${taskCount} 个任务`);
  
  if (taskCount === 0) {
    console.log('📝 创建示例任务...');
    await prisma.spiderTask.create({
      data: {
        type: 'twitter_list',
        listId: 'example-list-123',
        status: 'created',
        result: JSON.stringify({ message: '示例任务' }),
        tweetCount: 0
      }
    });
    console.log('✅ 示例任务已创建');
  }
  
  await prisma.$disconnect();
} catch (error) {
  console.log('⚠️ 初始数据创建失败（非致命错误）:', error instanceof Error ? error.message : String(error));
}

console.log('🎉 数据库初始化完成！');
console.log('💡 现在可以启动应用: npm run dev'); 