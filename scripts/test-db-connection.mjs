import { PrismaClient } from '@prisma/client';

console.log('🚀 开始测试数据库连接...');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL || '未设置'}`);

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('📡 连接数据库...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 测试表是否存在
    console.log('📊 测试表结构...');
    
    const userCount = await prisma.user.count();
    console.log(`👥 用户表: ${userCount} 条记录`);
    
    const taskCount = await prisma.spiderTask.count();
    console.log(`📋 任务表: ${taskCount} 条记录`);
    
    const tweetCount = await prisma.tweet.count();
    console.log(`🐦 推文表: ${tweetCount} 条记录`);
    
    console.log('🎉 数据库测试完成，所有表正常！');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    console.error('详细错误:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 数据库连接已断开');
  }
}

testConnection(); 