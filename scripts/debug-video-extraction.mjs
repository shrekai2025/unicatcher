#!/usr/bin/env node

/**
 * 视频提取调试脚本
 * 用于系统性排查和测试Twitter视频提取功能
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const TEST_URLS = [
  // 在这里添加包含视频的推文URL进行测试
  'https://x.com/example/status/1234567890', // 替换为实际的视频推文URL
];

// 浏览器配置
const BROWSER_CONFIG = {
  headless: false, // 设置为false便于观察
  slowMo: 100, // 放慢操作便于观察
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loadStorageState() {
  try {
    const statePath = path.join(__dirname, '..', 'data', 'browser-state.json');
    const stateData = await fs.readFile(statePath, 'utf8');
    return JSON.parse(stateData);
  } catch (error) {
    log('⚠️ 未找到登录状态文件', 'yellow');
    return null;
  }
}

/**
 * 全面的视频提取测试
 */
async function testVideoExtraction(page, url) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📍 测试URL: ${url}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  const results = {
    url,
    timestamp: new Date().toISOString(),
    networkRequests: [],
    domAnalysis: {},
    extractedData: {},
    errors: [],
  };

  try {
    // 1. 设置网络监听
    log('🔍 步骤1: 设置网络监听...', 'blue');
    const videoRequests = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('video') || url.includes('.mp4') || url.includes('.m3u8') || url.includes('amplify')) {
        const info = {
          url,
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString(),
        };
        videoRequests.push(info);
        log(`  📡 捕获请求: ${url.substring(0, 100)}...`, 'yellow');
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('video') || url.includes('.mp4') || url.includes('.m3u8')) {
        log(`  📥 响应: ${response.status()} - ${url.substring(0, 100)}...`, 'green');
        results.networkRequests.push({
          url,
          status: response.status(),
          headers: response.headers(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 2. 导航到页面
    log('🔍 步骤2: 导航到页面...', 'blue');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // 3. 分析页面结构
    log('🔍 步骤3: 分析页面DOM结构...', 'blue');
    
    // 查找视频播放器
    const videoPlayerExists = await page.locator('[data-testid="videoPlayer"]').count();
    log(`  视频播放器存在: ${videoPlayerExists > 0 ? '✅' : '❌'} (找到 ${videoPlayerExists} 个)`, videoPlayerExists > 0 ? 'green' : 'red');
    
    // 查找video元素
    const videoElements = await page.locator('video').count();
    log(`  video元素数量: ${videoElements}`, videoElements > 0 ? 'green' : 'yellow');
    
    // 获取所有video元素的详细信息
    if (videoElements > 0) {
      for (let i = 0; i < videoElements; i++) {
        const video = page.locator('video').nth(i);
        const poster = await video.getAttribute('poster');
        const src = await video.getAttribute('src');
        const sources = await video.locator('source').count();
        
        log(`  📹 Video #${i + 1}:`, 'magenta');
        log(`     poster: ${poster || '无'}`, 'cyan');
        log(`     src: ${src || '无'}`, 'cyan');
        log(`     source标签数: ${sources}`, 'cyan');
        
        results.domAnalysis[`video_${i}`] = { poster, src, sources };
        
        // 获取source标签信息
        for (let j = 0; j < sources; j++) {
          const source = video.locator('source').nth(j);
          const sourceSrc = await source.getAttribute('src');
          const sourceType = await source.getAttribute('type');
          log(`     Source #${j + 1}: ${sourceType} - ${sourceSrc}`, 'cyan');
          
          results.domAnalysis[`video_${i}_source_${j}`] = { src: sourceSrc, type: sourceType };
        }
      }
    }

    // 4. 尝试多种提取方法
    log('\n🔍 步骤4: 尝试多种视频提取方法...', 'blue');
    
    // 方法1: 直接从DOM提取
    log('  方法1: 从DOM直接提取...', 'yellow');
    const domVideoData = await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      const data = [];
      videos.forEach(video => {
        const sources = Array.from(video.querySelectorAll('source')).map(s => ({
          src: s.src,
          type: s.type,
        }));
        data.push({
          poster: video.poster,
          src: video.src,
          currentSrc: video.currentSrc,
          sources,
        });
      });
      return data;
    });
    
    if (domVideoData.length > 0) {
      log(`    ✅ 找到 ${domVideoData.length} 个视频`, 'green');
      domVideoData.forEach((v, i) => {
        log(`    Video ${i + 1}: ${JSON.stringify(v, null, 2)}`, 'cyan');
      });
      results.extractedData.domVideos = domVideoData;
    } else {
      log('    ❌ 未找到视频元素', 'red');
    }

    // 方法2: 等待并点击触发加载
    log('  方法2: 触发视频加载...', 'yellow');
    const videoPlayer = page.locator('[data-testid="videoPlayer"]').first();
    if (await videoPlayer.count() > 0) {
      // 记录点击前的网络请求数
      const beforeClickRequests = videoRequests.length;
      
      // 尝试点击
      try {
        await videoPlayer.click({ timeout: 2000 });
        log('    ✅ 成功点击视频播放器', 'green');
        await page.waitForTimeout(3000);
        
        // 检查是否有新的网络请求
        const newRequests = videoRequests.length - beforeClickRequests;
        log(`    📊 点击后新增 ${newRequests} 个视频相关请求`, newRequests > 0 ? 'green' : 'yellow');
      } catch (e) {
        log(`    ⚠️ 点击失败: ${e.message}`, 'yellow');
      }
    }

    // 方法3: 执行JavaScript获取视频信息
    log('  方法3: 执行JavaScript分析...', 'yellow');
    const jsVideoData = await page.evaluate(() => {
      const result = {
        videoPlayers: [],
        mediaElements: [],
        networkData: [],
      };
      
      // 查找所有包含视频的元素
      const players = document.querySelectorAll('[data-testid="videoPlayer"]');
      players.forEach(player => {
        const video = player.querySelector('video');
        if (video) {
          result.videoPlayers.push({
            poster: video.poster,
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            networkState: video.networkState,
            duration: video.duration,
            paused: video.paused,
          });
        }
      });
      
      // 查找所有媒体元素
      const allMedia = document.querySelectorAll('video, audio');
      allMedia.forEach(media => {
        result.mediaElements.push({
          tagName: media.tagName,
          src: media.src,
          currentSrc: media.currentSrc,
        });
      });
      
      // 尝试从window对象获取视频数据（某些网站可能存储在全局变量中）
      if (window.__INITIAL_STATE__ || window.__DATA__ || window.videoData) {
        result.windowData = {
          __INITIAL_STATE__: window.__INITIAL_STATE__,
          __DATA__: window.__DATA__,
          videoData: window.videoData,
        };
      }
      
      return result;
    });
    
    log(`    找到 ${jsVideoData.videoPlayers.length} 个视频播放器`, 'cyan');
    log(`    找到 ${jsVideoData.mediaElements.length} 个媒体元素`, 'cyan');
    results.extractedData.jsAnalysis = jsVideoData;

    // 方法4: 监听特定事件
    log('  方法4: 监听视频事件...', 'yellow');
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((video, index) => {
        video.addEventListener('loadstart', () => console.log(`Video ${index}: loadstart`));
        video.addEventListener('loadedmetadata', () => console.log(`Video ${index}: loadedmetadata`));
        video.addEventListener('canplay', () => console.log(`Video ${index}: canplay`));
        video.addEventListener('play', () => console.log(`Video ${index}: play`));
      });
    });

    // 5. 尝试不同的选择器
    log('\n🔍 步骤5: 尝试不同的选择器...', 'blue');
    const selectors = [
      '[data-testid="videoPlayer"]',
      '[data-testid="videoComponent"]',
      'div[aria-label*="video"]',
      'div[aria-label*="Video"]',
      'div[aria-label*="视频"]',
      '[data-testid*="video"]',
      '[class*="video"]',
      'video',
      'iframe[src*="video"]',
      'div[style*="video"]',
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        log(`  ✅ ${selector}: 找到 ${count} 个元素`, 'green');
      }
    }

    // 6. 分析网络请求
    log('\n🔍 步骤6: 分析捕获的网络请求...', 'blue');
    log(`  共捕获 ${videoRequests.length} 个视频相关请求`, 'cyan');
    
    // 按域名分组
    const requestsByDomain = {};
    videoRequests.forEach(req => {
      const url = new URL(req.url);
      const domain = url.hostname;
      if (!requestsByDomain[domain]) {
        requestsByDomain[domain] = [];
      }
      requestsByDomain[domain].push(req.url);
    });
    
    Object.keys(requestsByDomain).forEach(domain => {
      log(`  📡 ${domain}: ${requestsByDomain[domain].length} 个请求`, 'yellow');
      requestsByDomain[domain].slice(0, 3).forEach(url => {
        log(`     ${url.substring(0, 100)}...`, 'cyan');
      });
    });

    results.extractedData.videoRequests = videoRequests;

  } catch (error) {
    log(`❌ 测试失败: ${error.message}`, 'red');
    results.errors.push(error.message);
  }

  return results;
}

/**
 * 主函数
 */
async function main() {
  log('\n🚀 Twitter视频提取调试工具', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const browser = await chromium.launch(BROWSER_CONFIG);
  
  try {
    // 创建上下文（可选择加载登录状态）
    const storageState = await loadStorageState();
    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    if (storageState) {
      contextOptions.storageState = storageState;
      log('✅ 已加载登录状态', 'green');
    } else {
      log('⚠️ 未使用登录状态', 'yellow');
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    // 启用控制台日志
    page.on('console', msg => {
      if (msg.type() === 'log') {
        log(`  [页面日志] ${msg.text()}`, 'gray');
      }
    });
    
    // 测试每个URL
    const allResults = [];
    for (const url of TEST_URLS) {
      const result = await testVideoExtraction(page, url);
      allResults.push(result);
    }
    
    // 保存结果
    const outputPath = path.join(__dirname, '..', 'data', 'video-debug-results.json');
    await fs.writeFile(outputPath, JSON.stringify(allResults, null, 2));
    log(`\n📁 调试结果已保存到: ${outputPath}`, 'green');
    
    // 总结
    log('\n📊 调试总结:', 'bright');
    allResults.forEach(result => {
      const hasVideo = result.extractedData.domVideos?.length > 0 || 
                      result.extractedData.videoRequests?.length > 0;
      log(`  ${result.url}: ${hasVideo ? '✅ 发现视频' : '❌ 未发现视频'}`, hasVideo ? 'green' : 'red');
    });
    
  } finally {
    await browser.close();
  }
}

// 运行主函数
main().catch(error => {
  log(`\n❌ 脚本执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});