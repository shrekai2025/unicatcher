#!/usr/bin/env node

/**
 * 单个视频推文测试脚本
 * 用于快速测试特定推文的视频提取
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从命令行参数获取推文URL
const tweetUrl = process.argv[2];

if (!tweetUrl) {
  console.error('❌ 请提供推文URL作为参数');
  console.log('用法: node test-single-video-tweet.mjs <推文URL>');
  console.log('示例: node test-single-video-tweet.mjs https://x.com/username/status/1234567890');
  process.exit(1);
}

async function testSingleTweet() {
  console.log('🎬 测试单个视频推文提取');
  console.log('URL:', tweetUrl);
  console.log('-'.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  try {
    // 加载登录状态
    const statePath = path.join(__dirname, '..', 'data', 'browser-state.json');
    let storageState = null;
    try {
      const stateData = await fs.readFile(statePath, 'utf8');
      storageState = JSON.parse(stateData);
      console.log('✅ 已加载登录状态');
    } catch {
      console.log('⚠️ 未找到登录状态');
    }

    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };
    
    if (storageState) {
      contextOptions.storageState = storageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // 监听所有网络请求
    const networkLogs = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('video') || url.includes('.mp4') || url.includes('.m3u8')) {
        networkLogs.push({ type: 'request', url, method: request.method() });
        console.log('📡 请求:', url.substring(0, 100));
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('video') || url.includes('.mp4') || url.includes('.m3u8')) {
        networkLogs.push({ type: 'response', url, status: response.status() });
        console.log('📥 响应:', response.status(), url.substring(0, 100));
      }
    });

    // 导航到页面
    console.log('\n🌐 导航到页面...');
    await page.goto(tweetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 检查视频元素
    console.log('\n🔍 检查视频元素...');
    const hasVideoPlayer = await page.locator('[data-testid="videoPlayer"]').count() > 0;
    const videoCount = await page.locator('video').count();
    
    console.log('视频播放器:', hasVideoPlayer ? '✅ 存在' : '❌ 不存在');
    console.log('video元素数量:', videoCount);

    // 提取视频信息
    if (videoCount > 0) {
      console.log('\n📹 提取视频信息...');
      const videoInfo = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        return videos.map(video => ({
          poster: video.poster,
          src: video.src,
          currentSrc: video.currentSrc,
          sources: Array.from(video.querySelectorAll('source')).map(s => ({
            src: s.src,
            type: s.type,
          })),
        }));
      });
      
      console.log('视频信息:', JSON.stringify(videoInfo, null, 2));

      // 尝试点击播放
      console.log('\n🖱️ 尝试触发视频加载...');
      try {
        const videoPlayer = page.locator('[data-testid="videoPlayer"]').first();
        await videoPlayer.click();
        console.log('✅ 已点击视频播放器');
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('⚠️ 点击失败:', e.message);
      }

      // 再次检查
      console.log('\n📹 再次提取视频信息...');
      const videoInfoAfter = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        return videos.map(video => ({
          poster: video.poster,
          src: video.src,
          currentSrc: video.currentSrc,
          sources: Array.from(video.querySelectorAll('source')).map(s => ({
            src: s.src,
            type: s.type,
          })),
        }));
      });
      
      console.log('更新后的视频信息:', JSON.stringify(videoInfoAfter, null, 2));
    }

    // 输出网络日志
    console.log('\n📊 网络请求总结:');
    console.log(`共捕获 ${networkLogs.length} 个视频相关请求`);
    
    // 等待用户查看
    console.log('\n⏸️ 按任意键退出...');
    await page.waitForTimeout(30000);

  } finally {
    await browser.close();
  }
}

testSingleTweet().catch(console.error);