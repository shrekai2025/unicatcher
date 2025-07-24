#!/usr/bin/env node

/**
 * UniCatcher 登录状态管理工具
 * 用于诊断、清理和修复登录状态问题
 */

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const STORAGE_STATE_PATH = './data/browser-state.json';

console.log('🔧 UniCatcher 登录状态管理工具\n');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'check':
      await checkLoginState();
      break;
    case 'clear':
      await clearLoginState();
      break;
    case 'test':
      await testLoginState();
      break;
    case 'fix':
      await fixLoginState();
      break;
    default:
      showUsage();
  }
}

function showUsage() {
  console.log('用法：');
  console.log('  npm run login-state check   # 检查登录状态');
  console.log('  npm run login-state clear   # 清除登录状态');
  console.log('  npm run login-state test    # 测试登录状态');
  console.log('  npm run login-state fix     # 修复登录状态');
  console.log('');
  console.log('或直接运行：');
  console.log('  node scripts/login-state-manager.mjs check');
}

/**
 * 检查登录状态
 */
async function checkLoginState() {
  console.log('🔍 检查登录状态文件...\n');

  try {
    // 检查文件是否存在
    const exists = await fileExists(STORAGE_STATE_PATH);
    if (!exists) {
      console.log('❌ 登录状态文件不存在');
      console.log('💡 建议运行: npm run quick-login');
      return;
    }

    // 读取文件内容
    const content = await fs.readFile(STORAGE_STATE_PATH, 'utf8');
    const storageState = JSON.parse(content);

    console.log('✅ 登录状态文件存在');
    console.log(`📄 文件大小: ${(Buffer.byteLength(content, 'utf8') / 1024).toFixed(2)} KB`);

    // 检查基本结构
    if (!storageState.cookies || !Array.isArray(storageState.cookies)) {
      console.log('❌ 登录状态格式无效：缺少cookies数组');
      return;
    }

    console.log(`🍪 Cookies数量: ${storageState.cookies.length}`);

    // 检查Twitter相关cookies
    const twitterCookies = storageState.cookies.filter((cookie) => 
      cookie.domain && (cookie.domain.includes('x.com') || cookie.domain.includes('twitter.com'))
    );

    console.log(`🐦 Twitter相关cookies: ${twitterCookies.length}`);

    if (twitterCookies.length === 0) {
      console.log('⚠️  没有找到Twitter相关的cookies');
      console.log('💡 可能需要重新登录');
    } else {
      console.log('✅ 找到Twitter相关的cookies');
      
      // 检查关键cookies
      const keyCookies = ['auth_token', 'ct0', 'twid'];
      for (const keyName of keyCookies) {
        const found = twitterCookies.find((c) => c.name === keyName);
        if (found) {
          console.log(`  ✅ ${keyName}: 存在`);
        } else {
          console.log(`  ❌ ${keyName}: 缺失`);
        }
      }
    }

    // 检查过期时间
    const now = Date.now() / 1000;
    const expiredCookies = twitterCookies.filter((cookie) => 
      cookie.expires && cookie.expires < now
    );

    if (expiredCookies.length > 0) {
      console.log(`⚠️  有 ${expiredCookies.length} 个cookies已过期`);
    } else {
      console.log('✅ 所有cookies都在有效期内');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 检查登录状态失败:', errorMessage);
  }
}

/**
 * 清除登录状态
 */
async function clearLoginState() {
  console.log('🗑️  清除登录状态...\n');

  try {
    const exists = await fileExists(STORAGE_STATE_PATH);
    if (!exists) {
      console.log('ℹ️  登录状态文件不存在，无需清除');
      return;
    }

    await fs.unlink(STORAGE_STATE_PATH);
    console.log('✅ 登录状态已清除');
    console.log('💡 现在可以重新登录: npm run quick-login');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 清除登录状态失败:', errorMessage);
  }
}

/**
 * 测试登录状态
 */
async function testLoginState() {
  console.log('🧪 测试登录状态有效性...\n');

  let browser = null;
  let context = null;
  let page = null;

  try {
    // 检查文件是否存在
    const exists = await fileExists(STORAGE_STATE_PATH);
    if (!exists) {
      console.log('❌ 登录状态文件不存在');
      return;
    }

    // 读取登录状态
    const content = await fs.readFile(STORAGE_STATE_PATH, 'utf8');
    const storageState = JSON.parse(content);

    console.log('📱 启动浏览器进行测试...');
    browser = await chromium.launch({ headless: true });

    console.log('🔄 使用登录状态创建上下文...');
    context = await browser.newContext({
      storageState: storageState,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    page = await context.newPage();

    console.log('🌐 测试Twitter访问...');
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 检查是否成功登录
    const isLoggedIn = await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').isVisible({ timeout: 10000 });

    if (isLoggedIn) {
      console.log('✅ 登录状态有效！');
      console.log('🎉 可以正常使用爬虫功能');
    } else {
      console.log('❌ 登录状态无效');
      console.log('💡 建议重新登录: npm run quick-login');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 测试失败:', errorMessage);
    console.log('💡 建议重新登录: npm run quick-login');
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

/**
 * 修复登录状态
 */
async function fixLoginState() {
  console.log('🔧 修复登录状态...\n');

  try {
    // 先检查当前状态
    await checkLoginState();
    console.log('\n🧪 测试当前状态...');
    await testLoginState();

    console.log('\n💡 修复建议：');
    console.log('  1. 如果测试失败，运行: npm run login-state clear');
    console.log('  2. 然后重新登录: npm run quick-login');
    console.log('  3. 最后验证: npm run login-state test');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 修复过程失败:', errorMessage);
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// 运行主函数
main().catch(error => {
  const errorMessage = error instanceof Error ? error.message : '未知错误';
  console.error('💥 工具运行失败:', errorMessage);
  process.exit(1);
}); 