#!/usr/bin/env node

/**
 * 快速测试登录状态
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

console.log('🧪 快速测试登录状态...\n');

async function quickTest() {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // 检查登录状态文件是否存在
    let storageState = null;
    try {
      const content = await fs.readFile('./data/browser-state.json', 'utf8');
      storageState = JSON.parse(content);
      console.log('✅ 找到登录状态文件');
    } catch (error) {
      console.log('❌ 登录状态文件不存在');
      return;
    }

    // 启动浏览器
    browser = await chromium.launch({
      headless: false, // 可以看到浏览器行为
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    context = await browser.newContext({
      storageState: storageState,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    page = await context.newPage();

    // 测试1：访问Twitter主页
    console.log('🐦 测试访问Twitter主页...');
    await page.goto('https://x.com/home', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });

    // 检查是否登录成功
    const isLoggedIn = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 5000 });
    
    if (!isLoggedIn) {
      console.log('❌ Twitter主页登录验证失败');
      
      // 检查是否被重定向到登录页面
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('❌ 被重定向到登录页面，登录状态已失效');
        return;
      }
    } else {
      console.log('✅ Twitter主页登录验证成功');
    }

    // 测试2：访问具体的List页面
    console.log('📋 测试访问Twitter List页面...');
    const listUrl = 'https://x.com/i/lists/1948042550071496895';
    
    try {
      await page.goto(listUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });
      
      console.log('✅ List页面导航成功');
      
      // 检查页面内容
      await page.waitForTimeout(3000); // 等待内容加载
      
      const pageTitle = await page.title();
      console.log(`📄 页面标题: ${pageTitle}`);
      
      // 检查是否有推文内容
      const tweets = await page.$$('article, [data-testid="tweet"]');
      console.log(`🐦 找到 ${tweets.length} 个推文元素`);
      
      if (tweets.length > 0) {
        console.log('🎉 List页面内容加载成功！');
      } else {
        console.log('⚠️  List页面没有找到推文内容');
        
        // 检查是否有错误信息
        const errorElements = await page.$$('[data-testid="error"], .error, [aria-label*="error"]');
        if (errorElements.length > 0) {
          console.log('❌ 页面显示错误信息');
        }
      }
      
    } catch (error) {
      console.log('❌ List页面访问失败:', error.message);
      
      if (error.message.includes('Timeout')) {
        console.log('💡 建议：网络连接可能较慢，尝试增加超时时间');
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    console.log('\n⏳ 5秒后关闭浏览器...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

quickTest()
  .then(() => {
    console.log('\n🎉 测试完成！');
  })
  .catch((error) => {
    console.error('\n💥 测试失败:', error);
  }); 