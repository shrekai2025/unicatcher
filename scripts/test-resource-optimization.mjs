#!/usr/bin/env node

/**
 * 测试资源优化功能
 * 验证图片、视频等资源是否被正确拦截以节省带宽
 */

import { chromium } from 'playwright';

console.log('🧪 测试资源拦截优化功能...\n');

// 模拟 UniCatcher 的资源优化配置
const resourceOptimization = {
  enabled: true,
  blockedResourceTypes: ['image', 'media', 'font', 'other'],
  allowedResourceTypes: ['document', 'script', 'stylesheet', 'xhr', 'fetch', 'websocket'],
  allowedDomains: ['x.com', 'twitter.com', 'abs.twimg.com', 'pbs.twimg.com'],
  logBlockedRequests: true,
};

async function testResourceOptimization() {
  let browser;
  let blockedCount = 0;
  let allowedCount = 0;
  
  try {
    console.log('🚀 启动浏览器...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 设置资源拦截
    if (resourceOptimization.enabled) {
      await page.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 检查是否为需要拦截的资源类型
        if (resourceOptimization.blockedResourceTypes.includes(resourceType)) {
          const isAllowedDomain = resourceOptimization.allowedDomains.some(domain => 
            url.includes(domain)
          );

          if (!isAllowedDomain) {
            console.log(`🚫 拦截资源: ${resourceType} - ${url.substring(0, 80)}...`);
            blockedCount++;
            
            route.fulfill({
              status: 200,
              contentType: getContentType(resourceType),
              body: getEmptyResponse(resourceType)
            });
            return;
          }
        }

        // 允许的资源
        if (resourceOptimization.allowedResourceTypes.includes(resourceType)) {
          console.log(`✅ 允许资源: ${resourceType} - ${url.substring(0, 80)}...`);
          allowedCount++;
        }
        
        route.continue();
      });

      console.log('✅ 资源拦截已启用\n');
    }

    // 访问测试页面
    console.log('📄 访问测试页面...');
    await page.goto('https://x.com', { waitUntil: 'domcontentloaded' });
    
    // 等待页面加载
    await page.waitForTimeout(5000);
    
    console.log('\n📊 资源加载统计:');
    console.log(`   🚫 拦截的资源: ${blockedCount} 个`);
    console.log(`   ✅ 允许的资源: ${allowedCount} 个`);
    console.log(`   💾 节省带宽: 预计 ${Math.round(blockedCount * 0.1)} MB`);
    
    if (blockedCount > 0) {
      console.log('\n🎉 资源拦截功能工作正常！');
      console.log('   ⚡ 页面加载速度将显著提升');
      console.log('   💰 网络带宽消耗将大幅减少');
    } else {
      console.log('\n⚠️  未检测到资源拦截，请检查配置');
    }

    // 测试页面基本功能是否正常
    console.log('\n🔍 检查页面基本功能...');
    try {
      // 检查页面标题
      const title = await page.title();
      console.log(`   📑 页面标题: ${title}`);
      
      // 检查页面是否有基本内容
      const bodyText = await page.textContent('body');
      if (bodyText && bodyText.length > 100) {
        console.log('   ✅ 页面内容加载正常');
      } else {
        console.log('   ⚠️  页面内容可能不完整');
      }
    } catch (error) {
      console.log('   ❌ 页面功能检查失败:', error.message);
    }

    console.log('\n⏸️  按 Enter 键关闭浏览器...');
    await waitForEnter();

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function getContentType(resourceType) {
  switch (resourceType) {
    case 'image': return 'image/png';
    case 'stylesheet': return 'text/css';
    case 'font': return 'font/woff2';
    case 'media': return 'video/mp4';
    default: return 'text/plain';
  }
}

function getEmptyResponse(resourceType) {
  switch (resourceType) {
    case 'image':
      // 1x1 透明 PNG
      return Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);
    case 'stylesheet': return '/* blocked stylesheet */';
    case 'font': return '';
    case 'media': return '';
    default: return '';
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(undefined);
    });
  });
}

// 显示配置信息
console.log('🔧 当前资源优化配置:');
console.log(`   启用状态: ${resourceOptimization.enabled ? '✅ 已启用' : '❌ 已禁用'}`);
console.log(`   拦截类型: ${resourceOptimization.blockedResourceTypes.join(', ')}`);
console.log(`   允许类型: ${resourceOptimization.allowedResourceTypes.join(', ')}`);
console.log(`   允许域名: ${resourceOptimization.allowedDomains.join(', ')}`);
console.log('');

testResourceOptimization().catch(console.error); 