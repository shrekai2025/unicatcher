#!/usr/bin/env node

/**
 * UniCatcher 快速登录脚本
 * 使用Playwright直接打开浏览器进行登录
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

console.log('🚀 UniCatcher 快速登录工具启动...\n');

async function quickLogin() {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // 启动浏览器（非无头模式）
    console.log('📱 启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // 创建浏览器上下文
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    // 创建页面
    page = await context.newPage();

    // 导航到Twitter登录页面
    console.log('🌐 正在打开Twitter登录页面...');
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });

    console.log('✅ 页面已打开！');
    console.log('\n📋 操作步骤：');
    console.log('   1. 在浏览器中完成Twitter登录');
    console.log('   2. 登录后确保能看到主页');
    console.log('   3. 回到控制台按任意键保存登录状态');
    console.log('\n⚠️  注意：');
    console.log('   - 请使用有权限访问目标List的账号');
    console.log('   - 完成2FA验证（如果需要）');
    console.log('   - 不要关闭浏览器窗口\n');

    // 等待用户输入
    await waitForKeyPress();

    // 验证登录状态
    console.log('🔍 验证登录状态...');
    try {
      await page.goto('https://x.com/home', { waitUntil: 'networkidle' });
      
      // 简单检查是否有登录元素
      const loginCheck = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 5000 });
      
      if (loginCheck) {
        console.log('✅ 登录验证成功！');
        
        // 保存登录状态
        console.log('💾 保存登录状态...');
        const storageState = await context.storageState();
        
        // 确保目录存在
        const dataDir = './data';
        try {
          await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
          // 目录可能已存在，忽略错误
        }
        
        // 保存到文件
        const storageStatePath = path.join(dataDir, 'browser-state.json');
        await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
        
        console.log('✅ 登录状态已保存到:', storageStatePath);
      } else {
        console.log('⚠️  无法验证登录状态，但将尝试保存');
        const storageState = await context.storageState();
        const dataDir = './data';
        try {
          await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
          // 忽略
        }
        const storageStatePath = path.join(dataDir, 'browser-state.json');
        await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
        console.log('📄 状态已保存，请测试爬虫功能确认是否有效');
      }
      
    } catch (verifyError) {
      console.log('⚠️  验证过程出错，但会尝试保存当前状态');
      try {
        const storageState = await context.storageState();
        const dataDir = './data';
        await fs.mkdir(dataDir, { recursive: true });
        const storageStatePath = path.join(dataDir, 'browser-state.json');
        await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
        console.log('📄 状态已保存');
      } catch (saveError) {
        console.error('❌ 保存失败:', saveError);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 登录过程失败:', errorMessage);
  } finally {
    // 清理资源
    console.log('\n⏳ 3秒后关闭浏览器...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (context) await context.close();
    if (browser) await browser.close();
    console.log('🔌 浏览器已关闭');
  }
}

// 等待按键的辅助函数
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

// 执行登录
quickLogin()
  .then(() => {
    console.log('\n🎉 登录流程完成！');
    console.log('💡 现在可以使用爬虫功能了');
    console.log('🔗 访问 http://localhost:3067/tasks 创建爬取任务');
  })
  .catch((error) => {
    console.error('\n💥 登录失败:', error);
    process.exit(1);
  }); 