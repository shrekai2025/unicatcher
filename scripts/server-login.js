/**
 * Ubuntu服务器环境Twitter登录脚本
 * 适用于无GUI环境，支持自动环境检测
 */

import { BrowserManager } from '../src/server/core/browser/manager.js';
import fs from 'fs/promises';

console.log('🚀 启动Ubuntu服务器环境Twitter登录...\n');

// 环境检测
const isServerEnvironment = !process.env.DISPLAY || process.env.NODE_ENV === 'production';
const hasVirtualDisplay = process.env.DISPLAY === ':99';

console.log('🔍 环境检测:');
console.log(`   操作系统: ${process.platform}`);
console.log(`   显示环境: ${process.env.DISPLAY || '未设置'}`);
console.log(`   服务器模式: ${isServerEnvironment ? '是' : '否'}`);
console.log(`   虚拟显示器: ${hasVirtualDisplay ? '已启用' : '未启用'}`);

// 根据环境自动选择配置
const browserConfig = {
  headless: isServerEnvironment && !hasVirtualDisplay, // 服务器环境且无虚拟显示器时使用headless
  timeout: 45000, // 服务器环境增加超时时间
  viewport: { width: 1280, height: 720 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

console.log(`\n⚙️  浏览器配置:`);
console.log(`   headless模式: ${browserConfig.headless}`);
console.log(`   超时时间: ${browserConfig.timeout}ms`);
console.log(`   User-Agent: Linux x86_64`);

async function serverLogin() {
  let browserManager;
  
  try {
    console.log('\n🌐 正在启动浏览器...');
    if (browserConfig.headless) {
      console.log('ℹ️  使用headless模式 (服务器环境)');
      console.log('⚠️  注意: headless模式下需要手动输入验证码或使用已有登录状态');
    } else {
      console.log('ℹ️  使用有界面模式 (检测到显示环境)');
    }

    browserManager = await BrowserManager.create(browserConfig);
    const page = await browserManager.getPage();

    console.log('📱 导航到Twitter登录页面...');
    await browserManager.navigateToUrl('https://x.com/i/flow/login');

    if (browserConfig.headless) {
      // headless模式下的自动化登录流程
      console.log('\n🤖 headless模式登录流程:');
      console.log('1. 等待登录表单加载...');
      
      try {
        // 等待用户名输入框
        await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
        console.log('✅ 登录表单已加载');

        console.log('\n⚠️  headless模式限制:');
        console.log('   由于Twitter的安全策略，headless模式下的自动登录有限制');
        console.log('   建议使用以下替代方案之一:');
        console.log('   1. 使用虚拟显示器: export DISPLAY=:99 && Xvfb :99 &');
        console.log('   2. 从桌面环境复制登录状态文件');
        console.log('   3. 使用环境变量配置登录凭据 (不推荐)');

        // 检查是否有现有的登录状态
        try {
          const existingState = await fs.readFile('./data/browser-state.json', 'utf8');
          console.log('✅ 发现现有登录状态文件');
          console.log('   尝试使用现有登录状态...');
          
          // 重新启动浏览器使用现有状态
          await browserManager.close();
          browserManager = await BrowserManager.create(browserConfig);
          const newPage = await browserManager.getPage();
          
          await browserManager.navigateToUrl('https://x.com/home');
          
          // 验证登录状态
          const isLoggedIn = await newPage.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 5000 });
          
          if (isLoggedIn) {
            console.log('🎉 使用现有登录状态成功!');
            return;
          } else {
            console.log('⚠️  现有登录状态已过期');
          }
        } catch (stateError) {
          console.log('ℹ️  未找到有效的登录状态文件');
        }

             } catch (error) {
         console.log('❌ headless模式登录受限:', error instanceof Error ? error.message : String(error));
       }

    } else {
      // 有界面模式下的交互式登录
      console.log('\n👤 请在浏览器中完成登录操作...');
      console.log('提示:');
      console.log('   1. 输入您的Twitter用户名/邮箱');
      console.log('   2. 输入密码');
      console.log('   3. 如需要，完成两步验证');
      console.log('   4. 登录完成后，按Enter键继续...\n');

      // 等待用户手动登录
      await waitForUserConfirmation();

      // 验证登录状态
      console.log('🔍 验证登录状态...');
      
      try {
        await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const isLoggedIn = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 10000 });
        
        if (isLoggedIn) {
          console.log('✅ 登录验证成功！');
          
          // 获取用户信息
          try {
            const userInfo = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"] [data-testid="UserAvatar-Container-unknown"]').first().getAttribute('title');
            if (userInfo) {
              console.log(`👤 当前登录用户: ${userInfo}`);
            }
          } catch (loginError) {
            console.log('ℹ️  无法获取用户信息，但登录状态将被保存');
          }

          // 保存登录状态
          console.log('💾 保存登录状态到文件...');
          const context = page.context();
          const storageState = await context.storageState();
          
          await fs.mkdir('./data', { recursive: true });
          await fs.writeFile('./data/browser-state.json', JSON.stringify(storageState, null, 2));
          console.log('✅ 登录状态已保存到 ./data/browser-state.json');

        } else {
          throw new Error('登录验证失败，请重试');
        }
             } catch (verifyError) {
         console.error('❌ 登录验证失败:', verifyError instanceof Error ? verifyError.message : String(verifyError));
         throw verifyError;
       }
    }

     } catch (error) {
     console.error('❌ 登录过程出错:', error instanceof Error ? error.message : String(error));
    
    // 提供故障排除建议
    console.log('\n🛠 故障排除建议:');
    if (isServerEnvironment) {
      console.log('   服务器环境问题排查:');
      console.log('   1. 检查Playwright依赖: npx playwright install-deps chromium');
      console.log('   2. 尝试虚拟显示器: export DISPLAY=:99 && Xvfb :99 &');
      console.log('   3. 使用桌面环境先完成登录，然后复制登录状态文件');
    } else {
      console.log('   桌面环境问题排查:');
      console.log('   1. 检查X11转发: echo $DISPLAY');
      console.log('   2. 检查权限: ls -la ./data/');
      console.log('   3. 重启X服务: sudo systemctl restart gdm3');
    }
    
    throw error;
  } finally {
    if (browserManager) {
      console.log('\n🔄 清理浏览器资源...');
      await browserManager.close();
    }
  }
}

function waitForUserConfirmation() {
  return new Promise((resolve) => {
    console.log('⏸️  完成登录后，按Enter键继续...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(undefined);
    });
  });
}

// 运行登录流程
serverLogin()
  .then(() => {
    console.log('\n🎉 Ubuntu服务器环境登录完成！');
    console.log('现在可以使用 npm run dev 启动爬虫服务');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 登录失败:', error.message);
    process.exit(1);
  }); 