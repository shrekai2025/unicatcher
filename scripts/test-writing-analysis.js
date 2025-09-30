// 写作分析功能测试脚本
import { PrismaClient } from '@prisma/client';

async function testWritingAnalysis() {
  const db = new PrismaClient();

  try {
    console.log('🚀 开始测试写作分析功能...\n');

    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...');
    const tweetCount = await db.writingAnalysisTweet.count();
    console.log(`   ✓ 数据库连接成功，共有 ${tweetCount} 条分析推文\n`);

    // 2. 测试用户数据查询
    console.log('2️⃣ 测试用户数据查询...');
    const users = await db.writingAnalysisTweet.groupBy({
      by: ['userUsername'],
      _count: { userUsername: true }
    });

    if (users.length > 0) {
      console.log(`   ✓ 找到 ${users.length} 个用户:`);
      users.forEach(user => {
        console.log(`     - ${user.userUsername}: ${user._count.userUsername} 条推文`);
      });
    } else {
      console.log('   ⚠️ 未找到用户数据，请先执行推文合并');
    }
    console.log();

    // 3. 测试类型标注查询
    console.log('3️⃣ 测试类型标注查询...');
    const typeAnnotations = await db.tweetTypeAnnotation.count();
    console.log(`   ✓ 共有 ${typeAnnotations} 条类型标注记录\n`);

    // 4. 测试风格档案查询
    console.log('4️⃣ 测试风格档案查询...');
    const styleProfiles = await db.userStyleProfile.count();
    console.log(`   ✓ 共有 ${styleProfiles} 个用户风格档案\n`);

    // 5. 测试推文类型配置
    console.log('5️⃣ 测试推文类型配置...');
    const typeConfigs = await db.tweetTypeConfig.count();
    console.log(`   ✓ 共有 ${typeConfigs} 个推文类型配置\n`);

    // 6. 测试索引性能（如果有数据）
    if (users.length > 0) {
      console.log('6️⃣ 测试查询性能...');
      const testUsername = users[0].userUsername;

      const startTime = Date.now();
      const userTweets = await db.writingAnalysisTweet.findMany({
        where: { userUsername: testUsername },
        orderBy: { publishedAt: 'desc' },
        take: 100
      });
      const queryTime = Date.now() - startTime;

      console.log(`   ✓ 查询 ${testUsername} 的100条推文耗时: ${queryTime}ms\n`);
    }

    // 7. 测试缓存服务
    console.log('7️⃣ 测试缓存服务...');
    try {
      const { analysisCacheManager } = await import('../src/server/services/cache-manager.ts');

      // 测试缓存设置和获取
      analysisCacheManager.setUserStyleFeatures('test_user', { feature: 'test' });
      const cached = analysisCacheManager.getUserStyleFeatures('test_user');

      if (cached && cached.feature === 'test') {
        console.log('   ✓ 缓存服务工作正常');
      } else {
        console.log('   ⚠️ 缓存服务异常');
      }

      const stats = analysisCacheManager.getAllStats();
      console.log(`   ✓ 缓存统计: style(${stats.style.size}), type(${stats.type.size}), computation(${stats.computation.size})\n`);
    } catch (error) {
      console.log(`   ❌ 缓存服务测试失败: ${error.message}\n`);
    }

    // 8. 测试验证服务
    console.log('8️⃣ 测试验证服务...');
    try {
      const { ValidationService } = await import('../src/server/services/validation.ts');

      // 测试用户名验证
      const validUsername = ValidationService.validateUsername('test_user');
      console.log(`   ✓ 用户名验证通过: ${validUsername}`);

      // 测试分页验证
      const pagination = ValidationService.validatePagination(50, 0);
      console.log(`   ✓ 分页验证通过: limit=${pagination.limit}, offset=${pagination.offset}\n`);
    } catch (error) {
      console.log(`   ❌ 验证服务测试失败: ${error.message}\n`);
    }

    console.log('🎉 写作分析功能测试完成！');

    // 生成测试报告
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        tweets: tweetCount,
        users: users.length,
        typeAnnotations,
        styleProfiles,
        typeConfigs
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

// 运行测试
testWritingAnalysis();