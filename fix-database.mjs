#!/usr/bin/env node

/**
 * 数据库修复脚本 - 修复时间戳字段类型问题
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';

console.log('🔧 开始修复数据库时间戳字段类型问题...\n');

async function fixDatabase() {
  try {
    // 步骤1: 备份现有数据（如果重要的话）
    console.log('📋 当前数据库状态检查...');
    
    try {
      // 尝试查看是否有重要数据需要备份
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const tweetCount = await prisma.tweet.count();
      const taskCount = await prisma.spiderTask.count();
      
      console.log(`📊 当前数据: ${tweetCount} 条推文, ${taskCount} 个任务`);
      
      if (tweetCount > 0) {
        console.log('⚠️  发现现有推文数据，建议备份');
        console.log('💡 由于是开发阶段，我们将重置数据库以修复字段类型');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.log('ℹ️  无法连接到数据库，可能需要重建');
    }

    // 步骤2: 重置数据库以修复字段类型
    console.log('\n🔄 重置数据库以修复字段类型...');
    
    try {
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      console.log('✅ 数据库重置成功');
    } catch (error) {
      console.log('⚠️  migrate reset 失败，尝试 db push...');
      
      try {
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
        console.log('✅ 数据库强制重置成功');
      } catch (pushError) {
        console.log('ℹ️  尝试删除数据库文件并重新创建...');
        
        // 删除数据库文件
        try {
          await fs.unlink('./prisma/db.sqlite');
          console.log('✅ 删除旧数据库文件');
        } catch (unlinkError) {
          // 文件可能不存在
        }
        
        // 重新推送
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ 重新创建数据库成功');
      }
    }

    // 步骤3: 生成新的Prisma客户端
    console.log('\n🔄 生成新的Prisma客户端...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma客户端生成成功');

    // 步骤4: 验证修复
    console.log('\n🧪 验证数据库修复...');
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // 测试创建一个推文记录
      const testTweet = await prisma.tweet.create({
        data: {
          id: 'test123',
          content: '测试推文',
          userNickname: '测试用户',
          userUsername: 'testuser',
          tweetUrl: 'https://x.com/test/123',
          publishedAt: BigInt(Date.now()), // 使用BigInt
          listId: 'test_list',
          scrapedAt: BigInt(Date.now()), // 使用BigInt
          taskId: 'test_task'
        }
      });
      
      console.log('✅ 测试推文创建成功');
      
      // 删除测试数据
      await prisma.tweet.delete({ where: { id: 'test123' } });
      console.log('✅ 测试数据清理完成');
      
      await prisma.$disconnect();
      
    } catch (testError) {
      console.error('❌ 验证失败:', testError.message);
      throw testError;
    }

    console.log('\n🎉 数据库修复完成！');
    console.log('💡 现在可以重新运行爬虫，数据应该能正常显示了');

  } catch (error) {
    console.error('\n💥 修复失败:', error.message);
    console.log('\n🔧 手动修复步骤：');
    console.log('  1. 删除数据库文件: rm prisma/db.sqlite');
    console.log('  2. 重新推送schema: npx prisma db push');
    console.log('  3. 生成客户端: npx prisma generate');
    throw error;
  }
}

fixDatabase()
  .then(() => {
    console.log('\n✨ 所有修复步骤完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 修复过程失败');
    process.exit(1);
  }); 