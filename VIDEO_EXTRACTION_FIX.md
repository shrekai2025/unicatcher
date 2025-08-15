# 🎬 Twitter视频提取问题系统性修复方案

## 📋 问题诊断步骤

### 1. 运行调试脚本收集信息
```bash
# 首先，运行综合调试脚本
node scripts/debug-video-extraction.mjs

# 测试特定推文
node scripts/test-single-video-tweet.mjs https://x.com/用户名/status/推文ID
```

### 2. 检查登录状态
```bash
# 确保已登录
node scripts/server-login.js
```

## 🔧 核心问题分析

### 可能的原因
1. **动态加载问题**：视频URL可能通过JavaScript动态生成
2. **认证限制**：某些视频需要登录状态才能获取真实URL
3. **时机问题**：视频URL可能在特定时机才会加载
4. **选择器变化**：Twitter可能更新了DOM结构
5. **网络拦截**：资源优化可能意外拦截了关键请求

## 🚀 修复方案

### 方案A：使用CDP（Chrome DevTools Protocol）获取网络数据

创建新文件：`src/server/core/spider/video-extractor.ts`

```typescript
import { Page } from 'playwright';

export class VideoExtractor {
  private page: Page;
  private capturedVideos: Map<string, any> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  async enableCDPCapture() {
    const client = await this.page.context().newCDPSession(this.page);
    
    // 启用网络域
    await client.send('Network.enable');
    
    // 监听响应
    client.on('Network.responseReceived', (params) => {
      const url = params.response.url;
      if (this.isVideoUrl(url)) {
        this.capturedVideos.set(params.requestId, {
          url,
          mimeType: params.response.mimeType,
          headers: params.response.headers,
        });
      }
    });
    
    // 监听响应体
    client.on('Network.loadingFinished', async (params) => {
      if (this.capturedVideos.has(params.requestId)) {
        const video = this.capturedVideos.get(params.requestId);
        console.log('🎬 捕获视频:', video.url);
      }
    });
  }
  
  private isVideoUrl(url: string): boolean {
    return url.includes('video.twimg.com') || 
           url.includes('.mp4') || 
           url.includes('.m3u8') ||
           url.includes('amplify_video');
  }
  
  async extractFromTweet(tweetElement: any): Promise<any> {
    // 实现提取逻辑
    const videos = Array.from(this.capturedVideos.values());
    return videos.length > 0 ? videos[0] : null;
  }
}
```

### 方案B：分析页面React状态

```typescript
async extractVideoFromReactState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    // 查找React Fiber节点
    const findReactFiber = (element: Element) => {
      const keys = Object.keys(element);
      const fiberKey = keys.find(key => key.startsWith('__reactFiber'));
      return element[fiberKey];
    };
    
    // 查找视频组件
    const videoPlayers = document.querySelectorAll('[data-testid="videoPlayer"]');
    const videoData = [];
    
    videoPlayers.forEach(player => {
      const fiber = findReactFiber(player);
      if (fiber?.memoizedProps) {
        // 提取props中的视频数据
        const props = fiber.memoizedProps;
        if (props.video || props.media || props.source) {
          videoData.push({
            video: props.video,
            media: props.media,
            source: props.source,
          });
        }
      }
    });
    
    return videoData;
  });
}
```

### 方案C：使用XHR/Fetch拦截

```typescript
async interceptVideoRequests(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // 拦截fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = args[0]?.toString() || '';
      
      if (url.includes('video') || url.includes('.mp4')) {
        console.log('VIDEO_FETCH:', url);
        window.__capturedVideos = window.__capturedVideos || [];
        window.__capturedVideos.push(url);
      }
      
      return response;
    };
    
    // 拦截XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      const url = args[1]?.toString() || '';
      
      if (url.includes('video') || url.includes('.mp4')) {
        console.log('VIDEO_XHR:', url);
        window.__capturedVideos = window.__capturedVideos || [];
        window.__capturedVideos.push(url);
      }
      
      return originalOpen.apply(this, args);
    };
  });
}
```

### 方案D：分析GraphQL响应

```typescript
async extractFromGraphQL(page: Page): Promise<any> {
  // Twitter使用GraphQL API，视频信息可能在响应中
  const graphqlData = await page.evaluate(() => {
    return window.__APOLLO_CLIENT__?.cache?.data?.data || 
           window.__NEXT_DATA__?.props?.pageProps || 
           {};
  });
  
  // 递归查找视频URL
  const findVideoUrls = (obj: any): string[] => {
    const urls: string[] = [];
    
    if (typeof obj === 'string' && obj.includes('video')) {
      urls.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(item => urls.push(...findVideoUrls(item)));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => urls.push(...findVideoUrls(value)));
    }
    
    return urls;
  };
  
  return findVideoUrls(graphqlData);
}
```

## 📝 实施步骤

### 第1步：诊断问题
1. 运行调试脚本，收集信息
2. 分析`data/video-debug-results.json`
3. 确定具体问题类型

### 第2步：选择合适的方案
- 如果是网络请求问题 → 使用方案A（CDP）
- 如果是React组件问题 → 使用方案B（React状态）
- 如果是动态加载问题 → 使用方案C（XHR/Fetch拦截）
- 如果是API数据问题 → 使用方案D（GraphQL）

### 第3步：实施修复
1. 根据诊断结果，选择最合适的方案
2. 更新`TwitterSelector`类，集成新的提取方法
3. 测试验证

### 第4步：优化和监控
1. 添加详细日志
2. 设置监控告警
3. 定期检查提取成功率

## 🔍 调试命令

```bash
# 1. 清理缓存和重新登录
rm -rf data/browser-data
rm data/browser-state.json
node scripts/server-login.js

# 2. 测试特定List
node scripts/test-resource-optimization.mjs

# 3. 查看数据库中的视频数据
sqlite3 prisma/db.sqlite "SELECT id, videoUrls FROM Tweet WHERE videoUrls IS NOT NULL LIMIT 5;"

# 4. 实时监控日志
tail -f data/logs/*.log | grep -i video
```

## 📊 验证检查清单

- [ ] 登录状态正常
- [ ] 网络请求未被拦截
- [ ] 视频播放器正确识别
- [ ] 网络监听器正常工作
- [ ] 视频URL成功捕获
- [ ] 数据正确保存到数据库

## 🚨 紧急修复

如果上述方案都不行，可以尝试：

1. **完全禁用资源优化**
```javascript
// config.ts
resourceOptimization: {
  enabled: false, // 完全禁用
}
```

2. **使用无头浏览器录制**
```javascript
// 录制浏览器操作，分析网络流量
const browser = await chromium.launch({
  headless: false,
  recordVideo: { dir: './videos' },
  recordHar: { path: './network.har' },
});
```

3. **手动映射已知模式**
```javascript
// 如果视频URL有固定模式，可以手动构造
const constructVideoUrl = (tweetId, mediaId) => {
  return `https://video.twimg.com/ext_tw_video/${mediaId}/pu/vid/avc1/720x1280/${tweetId}.mp4`;
};
```

## 📞 需要进一步协助

如果问题仍未解决，请提供：
1. 具体的推文URL示例
2. `data/video-debug-results.json`文件内容
3. 浏览器控制台的网络请求截图
4. 任何错误日志

这些信息将帮助我们精确定位并解决问题。