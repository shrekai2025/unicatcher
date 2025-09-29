const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateManualTweetText() {
  console.log('开始迁移 ManualTweetText 数据...');

  // 获取所有缺少新字段的记录
  const records = await prisma.manualTweetText.findMany({
    where: {
      OR: [
        { tweetId: null },
        { userUsername: null },
        { publishedAt: null }
      ]
    }
  });

  console.log(`找到 ${records.length} 条需要迁移的记录`);

  let updateCount = 0;
  for (const record of records) {
    const now = new Date();
    const tweetId = record.tweetId || `legacy_${record.id}_${now.getTime()}`;
    const userUsername = record.userUsername || 'legacy_user';
    const publishedAt = record.publishedAt || BigInt(record.createdAt.getTime());

    try {
      await prisma.manualTweetText.update({
        where: { id: record.id },
        data: {
          tweetId,
          userUsername,
          publishedAt
        }
      });
      updateCount++;
      console.log(`已更新记录 ID: ${record.id}`);
    } catch (error) {
      if (error.code === 'P2002') {
        // 处理tweetId冲突，添加随机后缀
        const uniqueTweetId = `${tweetId}_${Math.random().toString(36).substr(2, 9)}`;
        await prisma.manualTweetText.update({
          where: { id: record.id },
          data: {
            tweetId: uniqueTweetId,
            userUsername,
            publishedAt
          }
        });
        updateCount++;
        console.log(`已更新记录 ID: ${record.id} (使用唯一ID: ${uniqueTweetId})`);
      } else {
        console.error(`更新记录 ID: ${record.id} 失败:`, error);
      }
    }
  }

  console.log(`迁移完成！更新了 ${updateCount} 条记录`);
}

migrateManualTweetText()
  .then(() => {
    console.log('数据迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据迁移失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });