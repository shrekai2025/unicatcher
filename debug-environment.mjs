#!/usr/bin/env node
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugEnvironment() {
  console.log('🔍 环境调试 - GUI vs 无GUI差异检测');
  console.log('='.repeat(50));
  
  let browser = null;
  
  try {
    // 检测运行环境
    console.log('\n1️⃣ 环境信息:');
    console.log(`平台: ${process.platform}`);
    console.log(`架构: ${process.arch}`);
    console.log(`Node版本: ${process.version}`);
    console.log(`DISPLAY环境变量: ${process.env.DISPLAY || '未设置'}`);
    console.log(`是否有GUI: ${process.env.DISPLAY ? '是' : '否'}`);
    
    // 启动浏览器（模拟远程环境）
    console.log('\n2️⃣ 启动浏览器（headless模式）...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions-http-throttling',
        '--disable-login-animations',
        '--disable-notifications',
        '--disable-permissions-api',
        '--disable-presentation-api',
        '--disable-print-preview',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--allow-running-insecure-content',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--virtual-time-budget=5000',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--enable-features=NetworkService,NetworkServiceLogging',
        '--force-device-scale-factor=1',
        '--use-mock-keychain',
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // 监听网络请求
    const networkRequests = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('amplify_video') || url.includes('video.twimg.com')) {
        networkRequests.push({
          url,
          status: response.status(),
          contentType: response.headers()['content-type']
        });
      }
    });
    
    // 访问一个有视频的推文
    const testUrl = 'https://x.com/Morph_VGart/status/1956596791903932803';
    console.log(`\n3️⃣ 访问测试页面: ${testUrl}`);
    
    // 使用更宽松的加载策略
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // 等待基本内容加载
    try {
      await page.waitForSelector('body', { timeout: 10000 });
      console.log('✅ 页面body已加载');
    } catch (error) {
      console.log('⚠️ 等待body超时，继续执行');
    }
    
    // 等待更长时间让内容渲染
    await page.waitForTimeout(8000);
    
    // 检查页面基本元素
    console.log('\n4️⃣ DOM结构检查:');
    
    const articleCount = await page.$$eval('article', articles => articles.length);
    console.log(`  推文容器数量: ${articleCount}`);
    
    const videoPlayers = await page.$$eval('[data-testid="videoPlayer"]', players => players.length);
    console.log(`  视频播放器数量: ${videoPlayers}`);
    
    const allImages = await page.$$eval('img', imgs => imgs.length);
    console.log(`  图片元素总数: ${allImages}`);
    
    const videoThumbs = await page.$$eval('img[src*="amplify_video_thumb"]', thumbs => thumbs.length);
    console.log(`  视频缩略图数量: ${videoThumbs}`);
    
    // 检查具体的视频元素
    console.log('\n5️⃣ 视频元素详细检查:');
    
    if (videoPlayers > 0) {
      const videoInfo = await page.evaluate(() => {
        const player = document.querySelector('[data-testid="videoPlayer"]');
        if (!player) return null;
        
        const video = player.querySelector('video');
        const poster = video?.getAttribute('poster');
        const src = video?.getAttribute('src');
        const sources = Array.from(player.querySelectorAll('source')).map(s => s.src);
        
        return {
          hasVideo: !!video,
          poster,
          src,
          sources,
          playerHTML: player.outerHTML.substring(0, 500)
        };
      });
      
      console.log(`  视频元素: ${videoInfo.hasVideo ? '存在' : '不存在'}`);
      console.log(`  poster属性: ${videoInfo.poster || '无'}`);
      console.log(`  src属性: ${videoInfo.src || '无'}`);
      console.log(`  source元素: ${videoInfo.sources.length} 个`);
      if (videoInfo.sources.length > 0) {
        videoInfo.sources.forEach((src, i) => {
          console.log(`    source ${i + 1}: ${src}`);
        });
      }
    }
    
    // 检查所有图片的src
    console.log('\n6️⃣ 图片src检查:');
    const imageSrcs = await page.$$eval('img', imgs => 
      imgs.map(img => img.src).filter(src => src.includes('amplify_video_thumb'))
    );
    
    console.log(`  视频缩略图URL数量: ${imageSrcs.length}`);
    imageSrcs.forEach((src, i) => {
      console.log(`    缩略图 ${i + 1}: ${src}`);
    });
    
    // 网络请求总结
    console.log('\n7️⃣ 网络请求总结:');
    console.log(`  视频相关请求数量: ${networkRequests.length}`);
    networkRequests.forEach((req, i) => {
      console.log(`    请求 ${i + 1}: ${req.status} - ${req.url.substring(0, 100)}...`);
    });
    
    // 环境建议
    console.log('\n8️⃣ 环境建议:');
    if (!process.env.DISPLAY) {
      console.log('⚠️ 当前无GUI环境，可能影响媒体渲染');
      console.log('建议：');
      console.log('  1. 安装虚拟显示器：sudo apt-get install xvfb');
      console.log('  2. 启动虚拟显示：Xvfb :99 -screen 0 1920x1080x24 &');
      console.log('  3. 设置DISPLAY：export DISPLAY=:99');
    } else {
      console.log('✅ 检测到GUI环境');
    }
    
    if (videoPlayers === 0) {
      console.log('❌ 未检测到视频播放器，可能的原因：');
      console.log('  1. 页面未完全加载');
      console.log('  2. 登录状态问题');
      console.log('  3. 无GUI环境影响');
    }
    
    if (videoThumbs === 0 && imageSrcs.length === 0) {
      console.log('❌ 未检测到视频缩略图，这是映射失败的根本原因');
    }
    
  } catch (error) {
    console.error('❌ 调试过程出错:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugEnvironment().catch(console.error);