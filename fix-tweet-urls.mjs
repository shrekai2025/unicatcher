#!/usr/bin/env node

/**
 * 修复数据库中推文URL的脚本
 * 修复格式：x.com/username/status/推文id
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🔧 开始修复数据库中的推文URL...\n');

async function fixTweetUrls() {
  try {
    // 1. 获取所有推文
    console.log('📋 获取所有推文数据...');
    const tweets = await prisma.tweet.findMany();
    
    console.log(`找到 ${tweets.length} 条推文需要检查`);
    
    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // 2. 检查和修复每条推文的URL
    for (const tweet of tweets) {
      try {
        console.log(`\n📋 检查推文 ${tweet.id}:`);
        console.log(`  当前URL: ${tweet.tweetUrl}`);
        console.log(`  用户名: ${tweet.userUsername}`);
        
        // 检查URL是否有问题
        const isValidUrl = tweet.tweetUrl && 
                          tweet.tweetUrl.includes('/status/') && 
                          !tweet.tweetUrl.includes('//status/') && // 避免 x.com//status/xxx
                          tweet.tweetUrl.match(/x\.com\/[^\/]+\/status\/\d+/);
        
        if (isValidUrl) {
          console.log(`  ✅ URL格式正确，跳过`);
          skippedCount++;
          continue;
        }
        
        // 构建正确的URL
        let username = tweet.userUsername || '';
        
        // 清理用户名
        username = username.replace('@', '').trim();
        
        if (!username || username.length === 0) {
          // 尝试从现有URL中提取用户名
          if (tweet.tweetUrl) {
            const match = tweet.tweetUrl.match(/\/([^\/]+)\/status\/(\d+)/);
            if (match && match[1] && match[1] !== 'status') {
              username = match[1];
              console.log(`  📝 从现有URL提取用户名: ${username}`);
            }
          }
          
          if (!username) {
            console.log(`  ⚠️ 无法确定用户名，使用占位符`);
            username = 'unknown_user';
          }
        }
        
        // 构建新的URL
        const newTweetUrl = `https://x.com/${username}/status/${tweet.id}`;
        
        console.log(`  🔧 新URL: ${newTweetUrl}`);
        
        // 更新数据库
        await prisma.tweet.update({
          where: { id: tweet.id },
          data: { tweetUrl: newTweetUrl }
        });
        
        console.log(`  ✅ 修复成功`);
        fixedCount++;
        
      } catch (error) {
        console.error(`  ❌ 修复失败: ${error.message}`);
        errorCount++;
      }
    }
    
    // 3. 输出统计结果
    console.log(`\n🎯 修复完成:`);
    console.log(`  - 总推文数: ${tweets.length}`);
    console.log(`  - 修复成功: ${fixedCount}`);
    console.log(`  - 跳过(已正确): ${skippedCount}`);
    console.log(`  - 修复失败: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log(`\n✅ 已修复 ${fixedCount} 条推文URL`);
      console.log(`💡 现在前端的"查看原文"链接应该能正确跳转了`);
    } else if (skippedCount === tweets.length) {
      console.log(`\n✅ 所有推文URL都是正确的，无需修复`);
    }
    
  } catch (error) {
    console.error('\n💥 修复过程失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行修复脚本
fixTweetUrls()
  .then(() => {
    console.log('\n✨ 修复脚本执行完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 修复脚本失败:', error.message);
    process.exit(1);
  }); 