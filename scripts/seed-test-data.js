// 创建测试数据脚本
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seedTestData() {
  console.log('🌱 开始创建测试数据...\n');

  try {
    // 0. 清理现有测试数据
    console.log('0️⃣ 清理现有测试数据...');
    await db.manualTweetText.deleteMany({
      where: { tweetId: { startsWith: 'manual-tweet-' } }
    });
    await db.tweet.deleteMany({
      where: { id: { startsWith: 'tweet-' } }
    });
    await db.tweet_type_config.deleteMany({
      where: { id: { startsWith: 'type-' } }
    });
    console.log('   ✓ 清理完成\n');

    // 1. 创建测试推文数据
    console.log('1️⃣ 创建测试推文数据...');

    const testTweets = [
      {
        username: 'test_user',
        content: '今天学习了机器学习的新算法，发现了一些有趣的数据模式。研究表明，深度学习在文本分析方面的准确率提升了25%。',
        publishedAt: new Date('2024-01-01'),
        table: 'ManualTweetText'
      },
      {
        username: 'test_user',
        content: '分享一个实用的编程技巧：使用TypeScript的类型系统可以大大减少运行时错误。步骤如下：1) 定义接口 2) 实现类型检查 3) 编译验证',
        publishedAt: new Date('2024-01-02'),
        table: 'ManualTweetText'
      },
      {
        username: 'test_user',
        content: '刚刚看到一个很有趣的现象，发现很多人对AI的理解还停留在表面。其实AI的本质是数据处理和模式识别，背后涉及大量的数学原理。',
        publishedAt: new Date('2024-01-03'),
        table: 'ManualTweetText'
      },
      {
        username: 'tech_expert',
        content: '突发：OpenAI发布了新的GPT模型，性能提升显著。据官方报道，新模型在推理能力上比上一代提升了40%，能耗降低了20%。',
        publishedAt: new Date('2024-01-04'),
        table: 'Tweet'
      },
      {
        username: 'tech_expert',
        content: '教程分享：如何优化React应用性能？1. 使用React.memo避免不必要的重渲染 2. 实现代码分割 3. 优化bundle大小 4. 使用虚拟化长列表',
        publishedAt: new Date('2024-01-05'),
        table: 'Tweet'
      }
    ];

    // 首先创建必需的依赖数据
    console.log('   创建ManualTweetCategory...');
    const testCategory = await db.manualTweetCategory.upsert({
      where: { id: 'test-category' },
      update: {},
      create: {
        id: 'test-category',
        name: '测试分类',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('   创建SpiderTask...');
    const testTask = await db.spiderTask.upsert({
      where: { id: 'test-task' },
      update: {},
      create: {
        id: 'test-task',
        type: 'test',
        listId: 'test-list',
        status: 'COMPLETED',
        tweetCount: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 创建ManualTweetText数据
    const manualTweets = testTweets.filter(t => t.table === 'ManualTweetText');
    for (let i = 0; i < manualTweets.length; i++) {
      const tweet = manualTweets[i];
      await db.manualTweetText.create({
        data: {
          categoryId: testCategory.id,
          tweetId: `manual-tweet-${i + 1}`,
          userUsername: tweet.username,
          content: tweet.content,
          publishedAt: tweet.publishedAt.getTime(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // 创建Tweet数据
    const normalTweets = testTweets.filter(t => t.table === 'Tweet');
    for (let i = 0; i < normalTweets.length; i++) {
      const tweet = normalTweets[i];
      await db.tweet.create({
        data: {
          id: `tweet-${i + 1}`,
          userUsername: tweet.username,
          userNickname: tweet.username,
          content: tweet.content,
          publishedAt: tweet.publishedAt.getTime(),
          scrapedAt: Date.now(),
          tweetUrl: `https://twitter.com/${tweet.username}/status/${Date.now()}${i}`,
          taskId: testTask.id,
          listId: 'test-list',
          retweetCount: Math.floor(Math.random() * 100),
          likeCount: Math.floor(Math.random() * 500),
          replyCount: Math.floor(Math.random() * 50),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`   ✓ 已创建 ${manualTweets.length} 条手动推文，${normalTweets.length} 条普通推文\n`);

    // 2. 创建推文类型配置
    console.log('2️⃣ 创建推文类型配置...');

    const tweetTypes = [
      { name: '研究/数据', category: '内容导向类', description: '包含数据、研究、统计分析的推文', keywords: ['数据', '研究', '统计', '分析', '发现'], isActive: true },
      { name: '教程/技巧', category: '内容导向类', description: '分享方法、技巧、教程的推文', keywords: ['教程', '技巧', '方法', '步骤'], isActive: true },
      { name: '洞见/观点/观察', category: '观点表达类', description: '表达个人观点和洞察的推文', keywords: ['发现', '观察', '觉得', '认为'], isActive: true },
      { name: '新闻/事件', category: '内容导向类', description: '报道新闻事件的推文', keywords: ['突发', '报道', '消息', '据悉'], isActive: true }
    ];

    for (let i = 0; i < tweetTypes.length; i++) {
      const type = tweetTypes[i];
      await db.tweet_type_config.create({
        data: {
          id: `type-${i + 1}`,
          type_name: type.name,
          type_category: type.category,
          description: type.description,
          common_openings: JSON.stringify(type.keywords),
          is_active: type.isActive,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    console.log(`   ✓ 已创建 ${tweetTypes.length} 个推文类型配置\n`);

    // 3. 验证数据创建
    console.log('3️⃣ 验证数据创建...');

    const manualCount = await db.manualTweetText.count();
    const tweetCount = await db.tweet.count();
    const typeConfigCount = await db.tweet_type_config.count();

    console.log(`   ✓ ManualTweetText: ${manualCount} 条`);
    console.log(`   ✓ Tweet: ${tweetCount} 条`);
    console.log(`   ✓ TweetTypeConfig: ${typeConfigCount} 条\n`);

    console.log('🎉 测试数据创建完成！');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  } finally {
    await db.$disconnect();
  }
}

seedTestData();