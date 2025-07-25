#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 设置UniCatcher开发环境...');

// 1. 检查数据库文件位置
const dbPaths = [
  './prisma/db.sqlite',
  './prisma/data/database/unicatcher.db',
  './data/database/unicatcher.db'
];

let correctDbPath = null;
let maxSize = 0;

for (const dbPath of dbPaths) {
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`📊 找到数据库: ${dbPath} (${(stats.size / 1024).toFixed(2)} KB)`);
    if (stats.size > maxSize) {
      maxSize = stats.size;
      correctDbPath = dbPath;
    }
  }
}

if (!correctDbPath) {
  console.log('⚠️ 没有找到现有数据库，将创建新的数据库');
  correctDbPath = './prisma/db.sqlite';
}

console.log(`✅ 使用数据库: ${correctDbPath}`);

// 2. 创建正确的.env配置
const envContent = `# UniCatcher 开发环境配置
AUTH_SECRET="unicatcher-secret-key-2024"
NEXTAUTH_URL="http://localhost:3067"
DATABASE_URL="file:${correctDbPath}"

# 开发模式
NODE_ENV="development"
PORT="3067"
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ 已创建/更新 .env 文件');
} catch (error) {
  console.log('⚠️ 无法写入 .env 文件，请手动设置环境变量');
  console.log('需要设置的环境变量:');
  console.log(`DATABASE_URL="file:${correctDbPath}"`);
}

// 3. 确保数据库架构是最新的
try {
  console.log('🔄 更新数据库架构...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ 数据库架构已更新');
} catch (error) {
  console.log('⚠️ 数据库架构更新失败，请手动运行: npx prisma db push');
}

// 4. 生成Prisma客户端
try {
  console.log('🔄 生成Prisma客户端...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma客户端已生成');
} catch (error) {
  console.log('⚠️ Prisma客户端生成失败，请手动运行: npx prisma generate');
}

// 5. 提示用户可以选择运行数据库初始化
console.log('💡 如需创建初始数据，请运行: npm run init-db');

console.log('🎉 开发环境设置完成！');
console.log('💡 现在可以运行: npm run dev'); 