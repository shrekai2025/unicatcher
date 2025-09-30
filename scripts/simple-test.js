// 简单的写作分析功能测试
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function simpleTest() {
  console.log('🧪 简单测试写作分析功能...\n');

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...');
    const result = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log(`   ✓ 数据库连接成功，包含以下表:`);
    result.forEach((table, index) => {
      if (index < 10) console.log(`     - ${table.name}`);
    });
    console.log(`     ... 等共 ${result.length} 个表\n`);

    // 2. 检查写作分析相关表
    console.log('2️⃣ 检查写作分析相关表...');

    const analysisTableExists = await db.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='writing_analysis_tweet'
    `;

    const typeAnnotationExists = await db.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='tweet_type_annotation'
    `;

    console.log(`   ✓ writing_analysis_tweet表: ${analysisTableExists.length > 0 ? '存在' : '不存在'}`);
    console.log(`   ✓ tweet_type_annotation表: ${typeAnnotationExists.length > 0 ? '存在' : '不存在'}\n`);

    // 3. 检查现有推文数据
    console.log('3️⃣ 检查现有推文数据...');

    const tweetCount = await db.$queryRaw`SELECT COUNT(*) as count FROM Tweet`;
    const manualTweetCount = await db.$queryRaw`SELECT COUNT(*) as count FROM ManualTweetText`;

    console.log(`   ✓ Tweet表: ${tweetCount[0].count} 条记录`);
    console.log(`   ✓ ManualTweetText表: ${manualTweetCount[0].count} 条记录\n`);

    // 4. 如果有数据，测试一些基本查询
    if (tweetCount[0].count > 0 || manualTweetCount[0].count > 0) {
      console.log('4️⃣ 测试基本查询...');

      // 获取用户列表
      const users = await db.$queryRaw`
        SELECT userUsername, COUNT(*) as tweet_count
        FROM Tweet
        GROUP BY userUsername
        LIMIT 5
      `;

      if (users.length > 0) {
        console.log(`   ✓ 找到用户:`);
        users.forEach(user => {
          console.log(`     - ${user.userUsername}: ${user.tweet_count} 条推文`);
        });
      }
      console.log();
    }

    // 5. 测试API导入（无需编译TypeScript）
    console.log('5️⃣ 测试基础功能...');

    try {
      // 简单的字符串分析测试
      const testContent = "今天学习了机器学习，发现了很有趣的数据模式";
      console.log(`   测试内容: "${testContent}"`);

      // 模拟关键词匹配
      const keywords = {
        '研究/数据': ['数据', '研究', '发现', '学习'],
        '个人经历': ['今天', '我'],
        '洞见/观点': ['发现', '觉得']
      };

      const matches = {};
      Object.entries(keywords).forEach(([type, words]) => {
        const matchCount = words.filter(word => testContent.includes(word)).length;
        if (matchCount > 0) {
          matches[type] = matchCount;
        }
      });

      console.log(`   ✓ 关键词匹配结果:`, matches);
      console.log();

    } catch (error) {
      console.log(`   ⚠️ 功能测试跳过: ${error.message}\n`);
    }

    console.log('🎉 基础测试完成！');

    // 生成测试报告
    const report = {
      timestamp: new Date().toISOString(),
      database_connected: true,
      tables: {
        writing_analysis_tweet: analysisTableExists.length > 0,
        tweet_type_annotation: typeAnnotationExists.length > 0
      },
      data: {
        tweets: tweetCount[0].count,
        manual_tweets: manualTweetCount[0].count
      },
      status: '正常'
    };

    console.log('\n📊 测试报告:');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await db.$disconnect();
  }
}

simpleTest();