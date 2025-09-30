// 测试推文合并功能
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function testMergeTweets() {
  console.log('🔄 测试推文合并功能...\n');

  try {
    // 1. 获取现有用户数据
    console.log('1️⃣ 检查现有用户数据...');

    const tweetUsers = await db.$queryRaw`
      SELECT userUsername, COUNT(*) as count
      FROM Tweet
      WHERE isDeleted = 0
      GROUP BY userUsername
      LIMIT 3
    `;

    console.log('   ✓ Tweet表中的用户:');
    tweetUsers.forEach(user => {
      console.log(`     - ${user.userUsername}: ${user.count} 条推文`);
    });
    console.log();

    if (tweetUsers.length === 0) {
      console.log('   ⚠️ 没有Tweet数据，跳过合并测试');
      return;
    }

    // 2. 选择一个用户进行测试
    const testUser = tweetUsers[0].userUsername;
    console.log(`2️⃣ 测试用户: ${testUser}`);

    // 获取该用户的原始推文
    const originalTweets = await db.$queryRaw`
      SELECT id, content, publishedAt, userUsername
      FROM Tweet
      WHERE userUsername = ${testUser} AND isDeleted = 0
      ORDER BY publishedAt ASC
      LIMIT 5
    `;

    console.log(`   ✓ 找到 ${originalTweets.length} 条原始推文`);
    originalTweets.forEach((tweet, index) => {
      const publishDate = new Date(parseInt(tweet.publishedAt.toString())).toLocaleDateString();
      console.log(`     ${index + 1}. ${tweet.content.substring(0, 50)}... (${publishDate})`);
    });
    console.log();

    // 3. 模拟合并过程（不实际创建，只是验证逻辑）
    console.log('3️⃣ 模拟推文合并逻辑...');

    const mergedData = originalTweets.map((tweet, index) => ({
      id: `merged-${testUser}-${index}`,
      content: tweet.content,
      userUsername: tweet.userUsername,
      publishedAt: new Date(parseInt(tweet.publishedAt.toString())),
      sourceTable: 'Tweet',
      originalId: tweet.id,
      createdAt: new Date()
    }));

    console.log(`   ✓ 准备合并 ${mergedData.length} 条推文`);
    console.log(`   ✓ 数据来源: 100% Tweet表，0% ManualTweetText表`);
    console.log();

    // 4. 检查是否已存在合并数据
    console.log('4️⃣ 检查写作分析表...');

    const existingAnalysis = await db.$queryRaw`
      SELECT COUNT(*) as count
      FROM writing_analysis_tweet
      WHERE userUsername = ${testUser}
    `;

    console.log(`   ✓ 用户 ${testUser} 已有 ${existingAnalysis[0].count} 条分析记录`);

    if (existingAnalysis[0].count > 0) {
      const sampleAnalysis = await db.$queryRaw`
        SELECT id, content, sourceTable, publishedAt
        FROM writing_analysis_tweet
        WHERE userUsername = ${testUser}
        ORDER BY publishedAt ASC
        LIMIT 3
      `;

      console.log(`   ✓ 样本分析记录:`);
      sampleAnalysis.forEach((record, index) => {
        const publishDate = new Date(record.publishedAt).toLocaleDateString();
        console.log(`     ${index + 1}. [${record.sourceTable}] ${record.content.substring(0, 40)}... (${publishDate})`);
      });
    }
    console.log();

    // 5. 测试类型分析准备
    console.log('5️⃣ 检查类型分析准备...');

    const typeAnnotations = await db.$queryRaw`
      SELECT COUNT(*) as count
      FROM tweet_type_annotation
      WHERE username = ${testUser}
    `;

    const styleProfiles = await db.$queryRaw`
      SELECT COUNT(*) as count
      FROM user_style_profile
      WHERE username = ${testUser}
    `;

    console.log(`   ✓ 类型标注记录: ${typeAnnotations[0].count} 条`);
    console.log(`   ✓ 风格档案: ${styleProfiles[0].count} 个\n`);

    // 6. 功能状态总结
    console.log('6️⃣ 功能状态总结...');

    const summary = {
      数据合并: existingAnalysis[0].count > 0 ? '已完成' : '待执行',
      类型分析: typeAnnotations[0].count > 0 ? '已完成' : '待执行',
      风格分析: styleProfiles[0].count > 0 ? '已完成' : '待执行'
    };

    Object.entries(summary).forEach(([feature, status]) => {
      const icon = status === '已完成' ? '✅' : '⏳';
      console.log(`   ${icon} ${feature}: ${status}`);
    });
    console.log();

    console.log('🎉 推文合并功能测试完成！');

    console.log('\n💡 建议操作:');
    if (existingAnalysis[0].count === 0) {
      console.log(`   1. 执行推文合并: POST /api/writing-analysis/merge-tweets`);
      console.log(`      参数: { "username": "${testUser}" }`);
    }
    if (typeAnnotations[0].count === 0) {
      console.log(`   2. 执行类型分析: POST /api/writing-analysis/analyze-types`);
      console.log(`      参数: { "username": "${testUser}" }`);
    }
    if (styleProfiles[0].count === 0) {
      console.log(`   3. 执行风格分析: POST /api/writing-analysis/analyze-style`);
      console.log(`      参数: { "username": "${testUser}" }`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await db.$disconnect();
  }
}

testMergeTweets();