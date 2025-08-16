#!/usr/bin/env node
import { TwitterSelector } from './src/server/core/spider/selectors/twitter.js';
import { StorageService } from './src/server/core/data/storage.js';
import puppeteer from 'puppeteer';

async function testVideoCapture() {
  console.log('🧪 测试视频捕获与存储流程');
  console.log('='.repeat(50));
  
  let browser = null;
  
  try {
    // 1. 启动浏览器
    console.log('\n1️⃣ 启动浏览器...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 2. 初始化Twitter选择器
    console.log('\n2️⃣ 初始化Twitter选择器...');
    const selector = new TwitterSelector(page);
    
    // 3. 测试具体的视频推文
    const testUrl = 'https://x.com/elonmusk/status/1956535198625169408'; // 从日志中的视频推文
    console.log(`\n3️⃣ 访问测试页面: ${testUrl}`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // 4. 提取推文数据
    console.log('\n4️⃣ 提取推文数据...');
    const tweetData = await selector.extractTweet(page);
    
    console.log('\n📊 提取结果:');
    console.log(`  ID: ${tweetData?.id}`);
    console.log(`  内容长度: ${tweetData?.content?.length || 0}`);
    console.log(`  配图数量: ${tweetData?.imageUrls?.length || 0}`);
    console.log(`  视频数据: ${tweetData?.videoUrls ? JSON.stringify(tweetData.videoUrls) : '无'}`);
    console.log(`  头像: ${tweetData?.profileImageUrl ? '有' : '无'}`);
    
    // 5. 测试存储
    if (tweetData) {
      console.log('\n5️⃣ 测试数据存储...');
      const storage = new StorageService();
      
      // 创建测试任务
      const taskId = await storage.createTask({
        listId: 'test-video-capture',
        maxCount: 1
      });
      
      console.log(`创建测试任务: ${taskId}`);
      
      // 保存推文（这里会触发我们添加的调试日志）
      await storage.saveTweet(tweetData, taskId);
      
      // 6. 验证存储结果
      console.log('\n6️⃣ 验证存储结果...');
      const storedTweets = await storage.getTweets(taskId);
      
      if (storedTweets.tweets.length > 0) {
        const storedTweet = storedTweets.tweets[0];
        console.log('\n📊 存储验证:');
        console.log(`  数据库中的推文ID: ${storedTweet.id}`);
        console.log(`  配图数量: ${storedTweet.imageUrls?.length || 0}`);
        console.log(`  视频数据: ${storedTweet.videoUrls ? JSON.stringify(storedTweet.videoUrls) : '无'}`);
        console.log(`  头像: ${storedTweet.profileImageUrl ? '有' : '无'}`);
        
        // 检查是否成功存储了视频数据
        if (storedTweet.videoUrls) {
          console.log('✅ 视频数据存储成功!');
        } else {
          console.log('❌ 视频数据存储失败!');
        }
      } else {
        console.log('❌ 未找到存储的推文');
      }
      
      // 清理测试数据
      console.log('\n🧹 清理测试数据...');
      await storage.deleteTask(taskId);
    } else {
      console.log('❌ 未能提取到推文数据');
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testVideoCapture().catch(console.error);