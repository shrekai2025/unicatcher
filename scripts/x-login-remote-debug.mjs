#!/usr/bin/env node

/**
 * X.com 远程调试登录脚本
 * 适配自 Puppeteer+Xvfb+远程调试方案，改为 Playwright 版本
 * 
 * 使用方法：
 * 1. 在 Docker 容器中启动此脚本（会启动带远程调试的 Chromium）
 * 2. 本地通过 SSH 隧道连接到调试端口
 * 3. 在本地 Chrome DevTools 中手动完成登录
 * 4. 登录状态会自动保存到持久化目录
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// 配置
const config = {
  // 用户数据目录（持久化登录状态）
  userDataDir: '/app/data/chrome-profile',
  // 远程调试端口
  debugPort: 9222,
  // 虚拟显示
  display: ':99',
  // Chromium 启动参数
  launchArgs: [
    `--remote-debugging-address=0.0.0.0`,
    `--remote-debugging-port=9222`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--disable-dev-shm-usage`,
    `--disable-gpu`,
    `--no-sandbox`,
    `--disable-setuid-sandbox`,
    `--lang=zh-CN`,
    `--window-size=1280,900`,
    // 重要：禁用自动化检测
    `--disable-blink-features=AutomationControlled`,
    `--disable-features=VizDisplayCompositor`,
    // 性能优化
    `--disable-background-timer-throttling`,
    `--disable-backgrounding-occluded-windows`,
    `--disable-renderer-backgrounding`,
  ]
};

async function setupUserDataDir() {
  console.log(`[REMOTE-DEBUG] 设置用户数据目录: ${config.userDataDir}`);
  
  if (!fs.existsSync(config.userDataDir)) {
    fs.mkdirSync(config.userDataDir, { recursive: true });
    console.log(`[REMOTE-DEBUG] 创建用户数据目录: ${config.userDataDir}`);
  } else {
    console.log(`[REMOTE-DEBUG] 用户数据目录已存在: ${config.userDataDir}`);
  }
}

async function startRemoteDebugBrowser() {
  console.log(`[REMOTE-DEBUG] 启动 Chromium 远程调试模式...`);
  console.log(`[REMOTE-DEBUG] 调试端口: ${config.debugPort}`);
  console.log(`[REMOTE-DEBUG] 用户数据目录: ${config.userDataDir}`);
  
  // 设置环境变量
  process.env.DISPLAY = config.display;
  
  try {
    // 启动浏览器（不使用 Playwright 的浏览器管理，直接启动带远程调试的 Chromium）
    const browser = await chromium.launch({
      headless: false,
      args: [
        ...config.launchArgs,
        `--user-data-dir=${config.userDataDir}`,
      ],
      env: {
        ...process.env,
        DISPLAY: config.display,
      }
    });

    // 创建页面并导航到 X.com
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();
    
    console.log(`[REMOTE-DEBUG] 导航到 X.com 登录页面...`);
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });
    
    console.log(`\n==================== 远程调试就绪 ====================`);
    console.log(`🔗 浏览器已启动，远程调试端口: ${config.debugPort}`);
    console.log(`📱 请在本地执行以下命令建立 SSH 隧道:`);
    console.log(`   ssh -N -L ${config.debugPort}:localhost:${config.debugPort} ubuntu@你的服务器IP`);
    console.log(`\n🌐 然后在本地 Chrome 中:`);
    console.log(`   1. 打开: chrome://inspect/#devices`);
    console.log(`   2. 点击 "Configure..." → 添加 localhost:${config.debugPort}`);
    console.log(`   3. 在 "Remote Target" 列表中找到 X.com 页面`);
    console.log(`   4. 点击 "inspect" 打开 DevTools`);
    console.log(`   5. 在打开的远程页面中完成 X.com 登录（用户名→密码→2FA）`);
    console.log(`\n💾 登录完成后，登录状态会自动保存到: ${config.userDataDir}`);
    console.log(`🔄 下次可以直接复用该登录状态`);
    console.log(`===============================================\n`);
    
    // 保持浏览器运行，等待手动登录
    console.log(`[REMOTE-DEBUG] 浏览器保持运行中，等待手动登录...`);
    console.log(`[REMOTE-DEBUG] 按 Ctrl+C 停止脚本`);
    
    // 监听页面变化，检测登录状态
    let loginCheckInterval = setInterval(async () => {
      try {
        // 检查是否已登录（页面 URL 变化或特定元素存在）
        const currentUrl = page.url();
        if (currentUrl.includes('/home') || currentUrl.includes('/i/flow/login/success')) {
          console.log(`[REMOTE-DEBUG] ✅ 检测到登录成功！URL: ${currentUrl}`);
          console.log(`[REMOTE-DEBUG] 登录状态已保存到: ${config.userDataDir}`);
          
          // 可选：保存 cookies 到项目的 browser-state.json
          const cookies = await context.cookies();
          const browserStatePath = join(projectRoot, 'data', 'browser-state.json');
          const browserState = {
            cookies: cookies,
            origins: [
              {
                origin: 'https://x.com',
                localStorage: await page.evaluate(() => {
                  const items = {};
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    items[key] = localStorage.getItem(key);
                  }
                  return items;
                })
              }
            ]
          };
          
          fs.writeFileSync(browserStatePath, JSON.stringify(browserState, null, 2));
          console.log(`[REMOTE-DEBUG] 浏览器状态已同步到: ${browserStatePath}`);
          
          clearInterval(loginCheckInterval);
        }
      } catch (error) {
        // 忽略检查错误，继续监听
      }
    }, 5000);
    
    // 优雅退出处理
    process.on('SIGINT', async () => {
      console.log(`\n[REMOTE-DEBUG] 收到退出信号，正在关闭浏览器...`);
      clearInterval(loginCheckInterval);
      try {
        await browser.close();
        console.log(`[REMOTE-DEBUG] 浏览器已关闭`);
      } catch (error) {
        console.log(`[REMOTE-DEBUG] 关闭浏览器时出错: ${error.message}`);
      }
      process.exit(0);
    });
    
    // 保持脚本运行
    await new Promise(() => {});
    
  } catch (error) {
    console.error(`[REMOTE-DEBUG] 启动浏览器失败:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log(`[REMOTE-DEBUG] 开始设置 X.com 远程调试登录...`);
    
    // 检查 DISPLAY 环境变量
    if (!process.env.DISPLAY) {
      console.log(`[REMOTE-DEBUG] 设置 DISPLAY=${config.display}`);
      process.env.DISPLAY = config.display;
    }
    
    // 设置用户数据目录
    await setupUserDataDir();
    
    // 启动远程调试浏览器
    await startRemoteDebugBrowser();
    
  } catch (error) {
    console.error(`[REMOTE-DEBUG] 脚本执行失败:`, error);
    process.exit(1);
  }
}

// 执行主函数
main();