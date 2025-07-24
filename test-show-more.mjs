#!/usr/bin/env node

/**
 * 测试Show more按钮处理功能
 */

import { TwitterSelector } from './src/server/core/spider/selectors/twitter.ts';
import { BrowserManager } from './src/server/core/browser/manager.ts';
import { config } from './src/lib/config.ts';

console.log('🔧 测试Show more按钮处理功能...\n');

async function testShowMoreButton() {
  let browserManager;
  
  try {
    // 1. 启动浏览器
    console.log('📋 启动浏览器...');
    browserManager = await BrowserManager.create({
      headless: false, // 显示浏览器，便于观察
      timeout: 30000,
      viewport: { width: 1280, height: 720 },
      userAgent: config.spider.userAgent,
      userDataDir: './data/browser-profile'
    });

    await browserManager.launch();
    const page = browserManager.getPage();
    
    // 2. 导航到测试页面（使用一个有长推文的Twitter List）
    console.log('📋 导航到Twitter List...');
    // 注意：需要提供一个包含长推文的List ID
    const testListId = '1234567890'; // 替换为实际的List ID
    const listUrl = `https://x.com/i/lists/${testListId}`;
    
    await browserManager.navigateToUrl(listUrl);
    
    // 3. 初始化Twitter选择器
    console.log('📋 初始化Twitter选择器...');
    const twitterSelector = new TwitterSelector(page);
    
    // 4. 等待Timeline加载
    console.log('📋 等待Timeline加载...');
    await twitterSelector.waitForTimeline();
    
    // 5. 获取推文元素
    console.log('📋 获取推文元素...');
    const tweetElements = await twitterSelector.getTweetElements();
    const filteredTweets = await twitterSelector.skipFirstTweet(tweetElements);
    
    console.log(`找到 ${filteredTweets.length} 条推文`);
    
    // 6. 测试前几条推文的文本提取
    let testCount = 0;
    let showMoreFound = 0;
    
    for (const tweetElement of filteredTweets.slice(0, 5)) { // 只测试前5条
      testCount++;
      console.log(`\n📋 测试推文 ${testCount}:`);
      
      try {
        // 检查是否为转推
        const isRT = await twitterSelector.isRetweet(tweetElement);
        if (isRT) {
          console.log('  ⏭️ 跳过转推');
          continue;
        }
        
        // 提取推文文本（会自动处理Show more按钮）
        const content = await twitterSelector.extractTweetText(tweetElement);
        
        console.log(`  📝 推文长度: ${content.length} 字符`);
        console.log(`  📝 前100字符: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
        
        if (content.length > 280) {
          showMoreFound++;
          console.log(`  ✅ 可能处理了Show more按钮 (长度: ${content.length})`);
        }
        
      } catch (error) {
        console.error(`  ❌ 处理推文失败:`, error.message);
      }
    }
    
    // 7. 输出测试结果
    console.log(`\n🎯 测试完成:`);
    console.log(`  - 测试推文数: ${testCount}`);
    console.log(`  - 疑似处理Show more的推文: ${showMoreFound}`);
    console.log(`  - 建议: ${showMoreFound > 0 ? '功能正常工作！' : '可能没有遇到长推文，请尝试不同的List'}`);
    
    // 等待用户观察
    console.log('\n⏳ 等待10秒让您观察结果...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
  } finally {
    // 8. 清理
    if (browserManager) {
      await browserManager.close();
    }
  }
}

// 运行测试
testShowMoreButton()
  .then(() => {
    console.log('\n✨ 测试完成！');
  })
  .catch((error) => {
    console.error('\n💥 测试失败:', error.message);
  }); 