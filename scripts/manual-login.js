#!/usr/bin/env node

/**
 * UniCatcher 手动登录脚本
 * 用于预先登录Twitter账号，保存登录状态供爬虫使用
 */

import { BrowserManager } from '../src/server/core/browser/manager.js';

console.log('🚀 启动UniCatcher手动登录工具...\n');

async function manualLogin() {
  let browserManager = null;
  let page = null;

  try {
    console.log('📱 正在启动浏览器...');
    
    // 使用静态工厂方法创建浏览器管理器，设置为非无头模式
    browserManager = await BrowserManager.create({
      headless: false, // 需要用户手动登录，所以要显示浏览器
      timeout: 30000
    });
    
    page = await browserManager.getPage();

    console.log('🌐 正在导航到Twitter登录页面...');
    await browserManager.navigateToUrl('https://x.com/login');

    console.log('✅ 页面加载完成！');
    console.log('\n📋 请按以下步骤操作：');
    console.log('   1. 在打开的浏览器窗口中手动登录您的Twitter账号');
    console.log('   2. 确保完全登录成功（能看到主页Timeline）');
    console.log('   3. 登录完成后，回到此控制台按 Enter 键继续');
    console.log('\n⚠️  重要提示：');
    console.log('   - 请确保登录的账号有权限访问您要爬取的List');
    console.log('   - 如果遇到验证码或2FA，请正常完成验证');
    console.log('   - 不要关闭浏览器窗口\n');

    // 等待用户确认登录完成
    await waitForUserConfirmation();

    console.log('🔍 正在验证登录状态...');
    
    // 检查是否成功登录
    try {
      await browserManager.navigateToUrl('https://x.com/home');

      // 检查是否存在登录后的元素
      const isLoggedIn = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 10000 });
      
      if (isLoggedIn) {
        console.log('✅ 登录验证成功！');
        
        console.log('💾 登录状态将在浏览器关闭时自动保存');
        
        // 获取用户信息
        try {
          const userInfo = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"] [data-testid="UserAvatar-Container-unknown"]').first().getAttribute('title');
          if (userInfo) {
            console.log(`👤 当前登录用户: ${userInfo}`);
          }
        } catch (loginError) {
          console.log('ℹ️  无法获取用户信息，但登录状态将被保存');
        }

      } else {
        throw new Error('登录验证失败');
      }

    } catch (loginError) {
      console.log('❌ 登录验证失败，请确保已完全登录');
      console.log('💡 建议：重新运行此脚本并确保登录完成');
      throw loginError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 登录过程中出现错误:', errorMessage);
    console.log('\n🔄 可能的解决方案：');
    console.log('   1. 检查网络连接');
    console.log('   2. 确保Twitter没有要求额外验证');
    console.log('   3. 重新运行此脚本');
  } finally {
    if (page) {
      console.log('\n⏳ 5秒后自动关闭浏览器...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (browserManager) {
      await browserManager.close();
      console.log('🔌 浏览器已关闭');
    }
  }
}

// 等待用户确认的辅助函数
function waitForUserConfirmation() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('✋ 登录完成后请按 Enter 键继续...', () => {
      rl.close();
      resolve(undefined);
    });
  });
}

// 运行登录流程
manualLogin()
  .then(() => {
    console.log('\n🎉 手动登录完成！');
    console.log('💡 现在您可以使用爬虫功能了');
    console.log('📱 建议测试：在Web界面创建一个爬取任务');
  })
  .catch((error) => {
    console.error('\n💥 登录失败:', error);
    process.exit(1);
  }); 