#!/usr/bin/env node

/**
 * 浏览器诊断和测试工具
 * 用于诊断Playwright浏览器问题
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

console.log('🔧 浏览器诊断工具启动...\n');

async function diagnosticBrowser() {
  console.log('📋 开始浏览器诊断...\n');

  // 检查1: Playwright模块
  try {
    console.log('✅ Playwright模块导入成功');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ Playwright模块导入失败:', errorMessage);
    return;
  }

  // 检查2: 尝试启动浏览器（多种配置）
  const configs = [
    {
      name: '标准配置',
      options: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    },
    {
      name: '强制显示配置',
      options: {
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      }
    },
    {
      name: '调试配置',
      options: {
        headless: false,
        devtools: true,
        slowMo: 100,
        args: ['--start-maximized', '--no-sandbox']
      }
    }
  ];

  for (const config of configs) {
    console.log(`🧪 测试 ${config.name}...`);
    
    let browser = null;
    let page = null;
    
    try {
      // 尝试启动浏览器
      browser = await chromium.launch(config.options);
      console.log(`  ✅ 浏览器启动成功`);
      
      // 创建页面
      page = await browser.newPage();
      console.log(`  ✅ 页面创建成功`);
      
      // 导航到测试页面
      await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`  ✅ 页面导航成功`);
      
      console.log(`  🎉 ${config.name} 测试通过！\n`);
      
      // 等待3秒让用户看到浏览器
      console.log('  ⏳ 浏览器将在3秒后关闭...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await browser.close();
      console.log(`  ✅ 浏览器已关闭\n`);
      
      // 如果这个配置成功了，就用它来测试Twitter登录
      await testTwitterLogin(config.options);
      return; // 成功后退出
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`  ❌ ${config.name} 失败:`, errorMessage);
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          // 忽略关闭错误
        }
      }
      console.log('');
    }
  }
  
  console.log('❌ 所有浏览器配置都失败了');
  console.log('💡 建议解决方案：');
  console.log('  1. 重新安装Playwright: npx playwright install chromium');
  console.log('  2. 检查Windows权限和防火墙设置');
  console.log('  3. 尝试以管理员身份运行PowerShell');
  console.log('  4. 检查是否有杀毒软件阻止');
}

async function testTwitterLogin(browserOptions) {
  console.log('🐦 测试Twitter登录配置...\n');
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    browser = await chromium.launch(browserOptions);
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
    
    console.log('🌐 打开Twitter登录页面...');
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('✅ Twitter页面加载成功！');
    console.log('📋 现在您可以：');
    console.log('  1. 在浏览器中完成登录');
    console.log('  2. 登录后按任意键保存状态');
    console.log('  3. 或者按Ctrl+C取消\n');
    
    // 等待用户输入
    await waitForUserInput();
    
    // 保存登录状态
    console.log('💾 保存登录状态...');
    const storageState = await context.storageState();
    
    // 确保目录存在
    try {
      await fs.mkdir('./data', { recursive: true });
    } catch (error) {
      // 目录已存在
    }
    
    await fs.writeFile('./data/browser-state.json', JSON.stringify(storageState, null, 2));
    console.log('✅ 登录状态已保存！');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ Twitter测试失败:', errorMessage);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

function waitForUserInput() {
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

// 运行诊断
diagnosticBrowser()
  .then(() => {
    console.log('\n🎉 诊断完成！');
  })
  .catch((error) => {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('\n💥 诊断失败:', errorMessage);
    process.exit(1);
  }); 