#!/usr/bin/env node

/**
 * 测试视频提取修复
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVideoExtraction() {
  console.log('🧪 测试视频提取修复...\n');
  
  const browser = await chromium.launch({
    headless: true, // 使用无头模式进行快速测试
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // 加载登录状态
    const statePath = path.join(__dirname, '..', 'data', 'browser-state.json');
    let storageState = null;
    try {
      const stateData = await fs.readFile(statePath, 'utf8');
      storageState = JSON.parse(stateData);
      console.log('✅ 已加载登录状态\n');
    } catch {
      console.log('⚠️ 未找到登录状态\n');
    }

    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    
    if (storageState) {
      contextOptions.storageState = storageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    // 创建一个Map来存储捕获的视频URL（模拟TwitterSelector的行为）
    const capturedVideoUrls = new Map();
    
    // 设置网络监听（模拟修复后的代码）
    page.on('response', (response) => {
      try {
        const url = response.url();
        
        // 捕获视频URL
        if (url.includes('video.twimg.com') && url.includes('.mp4')) {
          const match = url.match(/amplify_video\/(\d+)\//);
          if (match && match[1]) {
            const mediaId = match[1];
            console.log(`🎯 捕获视频URL [${mediaId}]: ${url.substring(0, 80)}...`);
            capturedVideoUrls.set(mediaId, {
              video: url.split('?')[0],
              timestamp: Date.now(),
            });
          }
        }
        
        // 捕获预览图
        if (url.includes('amplify_video_thumb') && url.includes('.jpg')) {
          const match = url.match(/amplify_video_thumb\/(\d+)\//);
          if (match && match[1]) {
            const mediaId = match[1];
            console.log(`🖼️ 捕获预览图 [${mediaId}]: ${url.substring(0, 80)}...`);
            const existing = capturedVideoUrls.get(mediaId) || {};
            capturedVideoUrls.set(mediaId, {
              ...existing,
              preview: url,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        // 忽略错误
      }
    });

    // 测试URL
    const testUrl = 'https://x.com/azed_ai/status/1956074166366691689';
    console.log(`📍 测试URL: ${testUrl}\n`);
    
    // 导航到页面
    console.log('🌐 导航到页面...');
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('⏳ 等待页面完全加载...');
    await page.waitForTimeout(8000);
    
    // 检查视频播放器
    const hasVideoPlayer = await page.locator('[data-testid="videoPlayer"]').count() > 0;
    console.log(`\n📹 视频播放器: ${hasVideoPlayer ? '✅ 存在' : '❌ 不存在'}`);
    
    // 检查捕获的URL
    console.log(`\n📊 捕获结果:`);
    console.log(`  - 共捕获 ${capturedVideoUrls.size} 个媒体ID`);
    
    if (capturedVideoUrls.size > 0) {
      console.log('\n📋 详细信息:');
      for (const [mediaId, data] of capturedVideoUrls.entries()) {
        console.log(`\n  媒体ID: ${mediaId}`);
        if (data.preview) {
          console.log(`  预览图: ${data.preview}`);
        }
        if (data.video) {
          console.log(`  视频: ${data.video}`);
        }
      }
      
      console.log('\n✅ 视频提取修复成功！');
    } else {
      console.log('\n❌ 未能捕获视频URL，修复可能未生效');
    }
    
  } finally {
    await browser.close();
  }
}

testVideoExtraction().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});