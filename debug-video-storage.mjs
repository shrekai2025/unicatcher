#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用绝对路径的数据库连接
const DATABASE_URL = `file:${path.join(__dirname, 'prisma', 'db.sqlite')}`;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function debugVideoStorage() {
  console.log('🔍 视频采集存储问题排查');
  console.log('='.repeat(50));
  
  try {
    // 1. 检查数据库连接和新字段
    console.log('\n1️⃣ 数据库连接和字段检查:');
    const tableInfo = await prisma.$queryRaw`PRAGMA table_info(Tweet);`;
    const fields = tableInfo.map(field => field.name);
    console.log('📊 Tweet 表字段:', fields);
    
    const hasVideoUrls = fields.includes('videoUrls');
    const hasProfileImageUrl = fields.includes('profileImageUrl');
    console.log(`✅ videoUrls 字段: ${hasVideoUrls ? '存在' : '❌ 缺失'}`);
    console.log(`✅ profileImageUrl 字段: ${hasProfileImageUrl ? '存在' : '❌ 缺失'}`);
    
    // 2. 统计现有数据
    console.log('\n2️⃣ 数据统计:');
    const totalTweets = await prisma.tweet.count();
    const tweetsWithImages = await prisma.tweet.count({
      where: { imageUrls: { not: null } }
    });
    const tweetsWithVideos = await prisma.tweet.count({
      where: { videoUrls: { not: null } }
    });
    const tweetsWithProfileImg = await prisma.tweet.count({
      where: { profileImageUrl: { not: null } }
    });
    
    console.log(`📊 总推文数: ${totalTweets}`);
    console.log(`🖼️ 有配图推文: ${tweetsWithImages}`);
    console.log(`🎥 有视频推文: ${tweetsWithVideos}`);
    console.log(`👤 有头像推文: ${tweetsWithProfileImg}`);
    
    // 3. 检查日志中提到的特定推文 ID
    const videoIds = ['1956535198625169408', '1956537586966519808'];
    console.log('\n3️⃣ 检查日志中的推文:');
    
    for (const videoId of videoIds) {
      console.log(`\n🔍 检查推文 ID: ${videoId}`);
      
      // 检查是否有包含该 ID 的推文
      const tweetsWithId = await prisma.tweet.findMany({
        where: {
          OR: [
            { id: videoId },
            { content: { contains: videoId } },
            { imageUrls: { contains: videoId } },
            { videoUrls: { contains: videoId } }
          ]
        },
        select: {
          id: true,
          content: true,
          imageUrls: true,
          videoUrls: true,
          profileImageUrl: true,
          publishedAt: true
        }
      });
      
      if (tweetsWithId.length > 0) {
        tweetsWithId.forEach((tweet, idx) => {
          console.log(`  📝 推文 ${idx + 1}:`);
          console.log(`    ID: ${tweet.id}`);
          console.log(`    时间: ${tweet.publishedAt}`);
          console.log(`    内容: ${tweet.content?.substring(0, 100)}...`);
          console.log(`    配图: ${tweet.imageUrls || '无'}`);
          console.log(`    视频: ${tweet.videoUrls || '❌ 空'}`);
          console.log(`    头像: ${tweet.profileImageUrl || '无'}`);
        });
      } else {
        console.log(`  ❌ 未找到包含 ${videoId} 的推文记录`);
      }
    }
    
    // 4. 最近的推文检查
    console.log('\n4️⃣ 最近 5 条推文数据检查:');
    const recentTweets = await prisma.tweet.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        content: true,
        imageUrls: true,
        videoUrls: true,
        profileImageUrl: true,
        publishedAt: true
      }
    });
    
    recentTweets.forEach((tweet, idx) => {
      console.log(`\n📝 推文 ${idx + 1}:`);
      console.log(`  ID: ${tweet.id}`);
      console.log(`  时间: ${tweet.publishedAt}`);
      console.log(`  内容: ${tweet.content?.substring(0, 80)}...`);
      console.log(`  配图长度: ${tweet.imageUrls?.length || 0}`);
      console.log(`  视频长度: ${tweet.videoUrls?.length || 0}`);
      console.log(`  头像长度: ${tweet.profileImageUrl?.length || 0}`);
      
      // 检查是否有疑似视频内容
      const hasVideoKeywords = tweet.content?.includes('视频') || 
                              tweet.content?.includes('video') ||
                              tweet.imageUrls?.includes('amplify_video_thumb');
      if (hasVideoKeywords && !tweet.videoUrls) {
        console.log(`  ⚠️ 疑似有视频但 videoUrls 为空!`);
      }
    });
    
    // 5. 输出诊断建议
    console.log('\n5️⃣ 诊断建议:');
    if (tweetsWithVideos === 0) {
      console.log('❌ 数据库中没有任何视频数据，问题可能在:');
      console.log('   1. saveTweet() 函数没有接收到 videoUrls 数据');
      console.log('   2. JSON.stringify() 或数据库写入失败');
      console.log('   3. 提取的数据没有正确传递给 saveTweet()');
    } else {
      console.log('✅ 数据库中有视频数据，检查特定推文的存储情况');
    }
    
  } catch (error) {
    console.error('❌ 检查过程出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugVideoStorage().catch(console.error);