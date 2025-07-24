#!/usr/bin/env node

/**
 * 简化版Twitter登录脚本
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

console.log('🚀 开始Twitter登录...\n');

async function simpleLogin() {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // 启动浏览器
    console.log('📱 启动浏览器...');
    browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // 创建上下文
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    // 创建页面
    page = await context.newPage();

    // 打开Twitter登录页面
    console.log('🌐 打开Twitter登录页面...');
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });

    console.log('✅ 请在浏览器中完成登录');
    console.log('📋 步骤：');
    console.log('  1. 输入用户名/邮箱和密码');
    console.log('  2. 完成验证（如果需要）');
    console.log('  3. 确保能看到Twitter主页');
    console.log('  4. 然后按任意键保存登录状态\n');

    // 等待用户按键
    await waitForKeyPress();

    // 尝试验证登录状态
    console.log('🔍 验证登录状态...');
    try {
      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
      
      // 简单检查是否登录
      const loginButton = await page.$('[href="/login"]');
      if (loginButton) {
        console.log('⚠️  似乎还没有完全登录，但会保存当前状态');
      } else {
        console.log('✅ 登录验证成功！');
      }
    } catch (error) {
      console.log('ℹ️  验证过程跳过，直接保存状态');
    }

    // 保存登录状态
    console.log('💾 保存登录状态...');
    const storageState = await context.storageState();
    
    // 确保data目录存在
    try {
      await fs.mkdir('./data', { recursive: true });
    } catch (error) {
      // 目录已存在，忽略错误
    }
    
    // 保存状态文件
    await fs.writeFile('./data/browser-state.json', JSON.stringify(storageState, null, 2));
    console.log('✅ 登录状态已保存到: ./data/browser-state.json');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 登录失败:', errorMessage);
  } finally {
    console.log('\n⏳ 3秒后关闭浏览器...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (context) await context.close();
    if (browser) await browser.close();
    console.log('🔌 浏览器已关闭');
  }
}

// 等待按键
function waitForKeyPress() {
  return new Promise((resolve) => {
    console.log('⌨️  按任意键继续...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(undefined);
    });
  });
}

// 运行登录
simpleLogin()
  .then(() => {
    console.log('\n🎉 登录流程完成！');
    console.log('💡 现在可以运行爬虫了: npm run dev');
    console.log('🔗 然后访问: http://localhost:3067/tasks');
  })
  .catch((error) => {
    console.error('\n💥 登录失败:', error);
    process.exit(1);
  }); 