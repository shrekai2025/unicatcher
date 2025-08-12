#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

console.log('🔒 安全初始化UniCatcher数据库...');

// 1. 加载环境变量
dotenv.config();

// 2. 检查必要的前置条件
console.log('🔍 检查前置条件...');

// 检查.env文件是否存在
if (!fs.existsSync('.env')) {
  console.error('❌ .env文件不存在');
  console.log('💡 请先运行: npm run setup-dev');
  process.exit(1);
}

// 检查DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL环境变量未设置');
  console.log('💡 请检查.env文件中的DATABASE_URL配置');
  process.exit(1);
}

// 检查prisma目录
if (!fs.existsSync('./prisma')) {
  console.error('❌ prisma目录不存在');
  console.log('💡 请确保项目结构完整');
  process.exit(1);
}

// 检查schema.prisma文件
if (!fs.existsSync('./prisma/schema.prisma')) {
  console.error('❌ prisma/schema.prisma文件不存在');
  console.log('💡 请确保Prisma配置完整');
  process.exit(1);
}

// 检查node_modules
if (!fs.existsSync('./node_modules')) {
  console.error('❌ node_modules目录不存在');
  console.log('💡 请先运行: npm install');
  process.exit(1);
}

console.log('✅ 前置条件检查通过');

// 3. 确保数据库目录存在
const dbDir = './prisma';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ 创建数据库目录');
}

// 4. 推送数据库架构
try {
  console.log('🔄 推送数据库架构...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ 数据库架构已推送');
} catch (error) {
  console.error('❌ 数据库架构推送失败:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// 5. 生成Prisma客户端（若已存在则跳过；若失败则仅告警不退出）
try {
  const clientIndexPath = './node_modules/.prisma/client/index.js';
  if (fs.existsSync(clientIndexPath)) {
    console.log('✅ 检测到已存在的 Prisma 客户端，跳过生成');
  } else {
    console.log('🔄 生成Prisma客户端...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma客户端已生成');
  }
} catch (error) {
  console.warn('⚠️ Prisma客户端生成失败（已忽略）：', error instanceof Error ? error.message : String(error));
}

// 6. 创建初始数据（可选）
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

console.log('🎉 数据库安全初始化完成！');
console.log('💡 现在可以启动应用: npm run dev'); 