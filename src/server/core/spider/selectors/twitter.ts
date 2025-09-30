/**
 * Twitter选择器和数据提取器
 * 负责从Twitter List页面提取推文数据
 */

import type { Page } from 'playwright';
import type { TweetData, TwitterSelectors, PageProcessResult } from '~/types/spider';
import { config } from '~/lib/config';

export class TwitterSelector {
  private capturedVideoUrls: Map<string, any> = new Map(); // 存储捕获的视频URL (key: 媒体ID)
  private tweetVideoMapping: Map<string, string> = new Map(); // 推文ID到媒体ID的映射

  // Twitter List选择器配置
  // ⚠️ 注意: Twitter/X的前端结构会不定期更新，以下选择器可能需要维护
  // 选择器设计原则: 优先使用data-testid > aria-label > class，避免依赖动态class
  private readonly selectors: TwitterSelectors = {
    // 🔵 容器选择器 - 定位主要内容区域
    timelineContainer: 'div[aria-label="Timeline: List"]', // List页面的时间线容器
    tweetContainer: 'article[data-testid="tweet"]',         // 单条推文容器，较稳定的testid
    
    // 🔵 数据选择器 - 提取推文核心内容
    tweetText: '[data-testid="tweetText"]',                 // 推文正文，官方测试ID
    userNickname: '[data-testid="User-Name"] span',         // 用户显示名，在用户名区域内的span
    userUsername: '[data-testid="User-Name"] a[href*="@"]', // 用户名链接，包含@符号的href
    publishTime: 'time[datetime]',                          // 发布时间，使用HTML5标准time元素
    tweetUrl: 'a[href*="/status/"]',                        // 推文链接，包含status路径
    
    // 🔵 互动数据选择器 - 提取社交指标
    replyCount: '[data-testid="reply"] span',               // 回复数，回复按钮内的span
    retweetCount: '[data-testid="retweet"] span',           // 转发数，转发按钮内的span  
    likeCount: '[data-testid="like"] span',                 // 点赞数，点赞按钮内的span
    viewCount: 'a[href*="/analytics"] span',                // 浏览数，分析链接内的span (可能不稳定)
    
    // 🔵 媒体选择器 - 提取图片资源
    images: 'img[src*="pbs.twimg.com"]',                    // Twitter CDN图片，URL特征相对稳定
    
    // 🔵 Retweet识别选择器 - 排除转发推文  
    // 使用双重验证：SVG图标路径 + 文本内容，提高识别准确性
    retweetIcon: config.spider.twitterList.retweetSelector,  // 转发图标的SVG路径特征
    retweetText: config.spider.twitterList.retweetTextSelector, // 包含"reposted"的文本元素
    
    // 🔵 展开按钮选择器 - 获取完整推文内容
    showMoreButton: '[data-testid="tweet-text-show-more-link"]', // "Show more"/"查看更多"按钮
  };

  constructor(private readonly page: Page) {
    this.setupNetworkCapture();
  }

  /**
   * 设置网络捕获 - 在构造函数中立即开始监听
   */
  private async setupNetworkCapture(): Promise<void> {
    let captureCount = 0;
    
    // 监听所有网络响应
    this.page.on('response', (response) => {
      try {
        const url = response.url();
        
        // 捕获视频相关的URL
        if (url.includes('video.twimg.com') && url.includes('.mp4')) {
          // 从URL中提取媒体ID
          const match = url.match(/amplify_video\/(\d+)\//);
          if (match && match[1]) {
            const mediaId = match[1];
            captureCount++;
            const existing = this.capturedVideoUrls.get(mediaId);
            if (!existing?.video) { // 只在首次捕获时记录日志
              console.log(`🎯 捕获视频URL [${mediaId}]: ${url.substring(0, 100)}...`);
            }
            this.capturedVideoUrls.set(mediaId, {
              ...existing,
              video: url.split('?')[0], // 移除查询参数
              timestamp: Date.now(),
            });
          }
        }
        
        // 捕获预览图
        if (url.includes('amplify_video_thumb') && url.includes('.jpg')) {
          const match = url.match(/amplify_video_thumb\/(\d+)\//);
          if (match && match[1]) {
            const mediaId = match[1];
            captureCount++;
            const existing = this.capturedVideoUrls.get(mediaId) || {};
            if (!existing.preview) { // 只在首次捕获时记录日志
              console.log(`🖼️ 捕获预览图 [${mediaId}]: ${url}`);
            }
            this.capturedVideoUrls.set(mediaId, {
              ...existing,
              preview: url,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        // 忽略错误，继续监听
      }
    });
    
    // 每5秒汇总一次捕获情况（调试模式下输出详细统计）
    if (process.env.SPIDER_DEBUG === 'true') {
      setInterval(() => {
        if (captureCount > 0) {
          console.log(`📊 媒体资源捕获统计: ${captureCount} 个，视频缓存: ${this.capturedVideoUrls.size} 个`);
          captureCount = 0; // 重置计数器
        }
      }, 5000);
    } else {
      // 生产模式：只在捕获到重要资源时输出简要信息
      setInterval(() => {
        if (captureCount > 0) {
          console.log(`🎬 捕获媒体: ${captureCount} 个`);
          captureCount = 0;
        }
      }, 10000); // 更长的间隔
    }
  }

  /**
   * 等待Timeline容器加载
   */
  async waitForTimeline(): Promise<void> {
    console.log('🔍 等待页面加载...');
    
    // 定义多个可能的选择器
    const possibleSelectors: string[] = [
      this.selectors.timelineContainer,
      '[data-testid="primaryColumn"]',
      '[data-testid="timeline"]', 
      'main[role="main"]',
      '[aria-label*="Timeline"]',
      'section[role="region"]',
      'div[data-testid="cellInnerDiv"]'
    ].filter((selector): selector is string => typeof selector === 'string' && selector.length > 0);
    
    let lastError: Error | null = null;
    
    // 尝试每个选择器
    for (let i = 0; i < possibleSelectors.length; i++) {
      try {
        await this.page.waitForSelector(possibleSelectors[i]!, {
          timeout: 10000, // 减少单个选择器的等待时间
        });
        console.log(`✅ Timeline容器已加载 (方案${i + 1})`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('选择器等待失败');
        continue;
      }
    }
    
    // 如果所有选择器都失败，尝试检查页面是否至少有基本内容
    try {
      // 检查是否被重定向到登录页面
      const loginButton = await this.page.$('[data-testid="loginButton"], [href="/login"], input[name="text"]');
      if (loginButton) {
        throw new Error('页面被重定向到登录页面，登录状态可能已失效');
      }
      
      // 检查是否有推文内容
      const tweetElements = await this.page.$$('article, [data-testid="tweet"]');
      if (tweetElements.length > 0) {
        console.log(`✅ 检测到 ${tweetElements.length} 个推文，继续执行`);
        return;
      }
      
      // 最后检查页面是否至少加载了基本结构
      const mainContent = await this.page.$('main, #react-root, body');
      if (mainContent) {
        console.log('⚠️ 页面结构已加载，等待内容...');
        await this.page.waitForTimeout(5000);
        return;
      }
      
    } catch (checkError) {
      console.error('❌ 页面检查失败:', checkError);
    }
    
    // 所有尝试都失败了
    const errorMessage = lastError ? lastError.message : '未知错误';
    throw new Error(`等待Timeline容器失败: ${errorMessage}。可能原因：1) 网络连接慢 2) 登录状态失效 3) 页面结构变化`);
  }

  /**
   * 获取List时间线中的推文元素
   * 🎯 正确逻辑：Timeline: List > cellInnerDiv (跳过第一个) > 推文
   * 🔧 修复：避免抓取展开详情页的评论
   */
  async getTweetElements(isUsernameMode: boolean = false): Promise<any[]> {
    try {
      // Username模式直接跳过List时间线容器检测，使用回退方案
      if (isUsernameMode) {
        console.log('🎯 Username模式，直接使用回退选择器');
        return this.getTweetElementsFallback();
      }

      // List模式：首先定位List时间线容器
      let timelineContainer = await this.page.$(this.selectors.timelineContainer);

      // 如果没有找到时间线容器，等待3秒后重试（缩短等待时间）
      if (!timelineContainer) {
        console.log('⏳ 未找到List时间线容器，等待3秒后重试...');
        await this.page.waitForTimeout(3000);
        timelineContainer = await this.page.$(this.selectors.timelineContainer);

        if (timelineContainer) {
          console.log('✅ 等待后成功找到时间线容器');
        }
      }

      if (timelineContainer) {
        console.log('✅ 找到List时间线容器，开始按cellInnerDiv逻辑搜索...');
        
        // 在时间线容器内找所有cellInnerDiv
        const cellElements = await timelineContainer.$$('[data-testid="cellInnerDiv"]');
        console.log(`📊 找到 ${cellElements.length} 个cellInnerDiv`);
        
        if (cellElements.length === 0) {
          console.warn('⚠️ 未找到cellInnerDiv，使用备用方案');
          const tweets = await timelineContainer.$$(this.selectors.tweetContainer);
          console.log(`📊 备用方案找到 ${tweets.length} 个推文`);
          return tweets;
        }
        
        // 跳过第一个cellInnerDiv（List信息），处理剩余的
        const tweetCells = cellElements.slice(1);
        console.log(`📊 跳过第一个List信息，处理 ${tweetCells.length} 个推文单元格`);
        
        const allTweets: any[] = [];
        for (const cell of tweetCells) {
          try {
            // 检查是否为UserCell（推荐关注卡片），跳过
            const isUserCell = await cell.$('[data-testid="UserCell"]');
            if (isUserCell) {
              console.log('⚠️ 跳过UserCell推荐关注卡片');
              continue;
            }

            // 在每个cellInnerDiv内查找推文
            const tweetsInCell = await cell.$$(this.selectors.tweetContainer);
            if (tweetsInCell.length > 0) {
              allTweets.push(...tweetsInCell);
            }
          } catch (error) {
            console.warn('处理单个cellInnerDiv失败:', error);
            continue;
          }
        }
        
        console.log(`📊 从 ${tweetCells.length} 个单元格中提取到 ${allTweets.length} 个推文`);
        return allTweets;
        
      } else {
        // 回退方案：如果找不到特定容器，尝试其他容器选择器
        console.warn('⚠️ 未找到List时间线容器，尝试回退方案...');
        return this.getTweetElementsFallback();
      }
    } catch (error) {
      console.error('获取推文元素失败:', error);
      return [];
    }
  }

  /**
   * 回退方案：使用通用选择器获取推文
   */
  private async getTweetElementsFallback(): Promise<any[]> {
    const fallbackSelectors = [
      '[data-testid="primaryColumn"]',
      'main[role="main"]',
      '[aria-label*="Timeline"]'
    ];

    for (const selector of fallbackSelectors) {
      const container = await this.page.$(selector);
      if (container) {
        // 尝试在回退容器中也使用cellInnerDiv逻辑
        const cellElements = await container.$$('[data-testid="cellInnerDiv"]');
        if (cellElements.length > 1) {
          const tweetCells = cellElements.slice(1);
          const allTweets: any[] = [];
          for (const cell of tweetCells) {
            // 检查是否为UserCell（推荐关注卡片），跳过
            const isUserCell = await cell.$('[data-testid="UserCell"]');
            if (isUserCell) {
              continue; // 静默跳过，减少日志
            }

            const tweetsInCell = await cell.$$(this.selectors.tweetContainer);
            allTweets.push(...tweetsInCell);
          }
          console.log(`📊 回退方案 [${selector}] 找到 ${allTweets.length} 个推文`);
          return allTweets;
        } else {
          // 如果没有cellInnerDiv，直接搜索推文
          const tweets = await container.$$(this.selectors.tweetContainer);
          console.log(`📊 回退方案 [${selector}] 找到 ${tweets.length} 个推文`);
          return tweets;
        }
      }
    }

    // 最后的回退：全局搜索
    console.warn('⚠️ 所有回退方案失败，使用全局搜索');
    const tweets = await this.page.$$(this.selectors.tweetContainer);
    console.log(`📊 全局搜索找到 ${tweets.length} 个推文`);
    return tweets;
  }

  /**
   * 跳过第一个推文（List信息头部）- 已在getTweetElements中处理cellInnerDiv层面
   * 🔧 现在主要用于双重保险，防止List信息推文混入
   */
  async skipFirstTweet(tweetElements: any[]): Promise<any[]> {
    if (tweetElements.length === 0) {
      return [];
    }
    
    // 由于已经在cellInnerDiv层面跳过了第一个，这里主要做最后检查
    // 检查第一个推文是否是List相关信息
    if (tweetElements.length > 0) {
      try {
        const firstTweet = tweetElements[0];
        const tweetText = await firstTweet.$(this.selectors.tweetText);
        if (tweetText) {
          const content = await tweetText.textContent();
          if (content && (
            content.includes('List') || 
            content.includes('列表') ||
            content.includes('Members') ||
            content.includes('成员')
          )) {
            console.log(`🔍 检测到第一个推文疑似List信息，跳过: ${content.slice(0, 50)}...`);
            return tweetElements.slice(1);
          }
        }
      } catch (error) {
        console.warn('检查第一个推文内容失败:', error);
      }
    }
    
    console.log(`📊 cellInnerDiv逻辑已处理，直接返回 ${tweetElements.length} 个推文`);
    return tweetElements;
  }

  /**
   * 检查推文是否为Retweet
   */
  async isRetweet(tweetElement: any): Promise<boolean> {
    try {
      // 检查是否包含转发图标
      const retweetIcon = await tweetElement.$(this.selectors.retweetIcon);
      
      // 检查是否包含"reposted"文本
      const retweetTextElement = await tweetElement.$(this.selectors.retweetText);
      const retweetText = retweetTextElement ? await retweetTextElement.textContent() : '';
      
      const hasRetweetIcon = !!retweetIcon;
      const hasRetweetText = retweetText?.includes('reposted') || false;
      
      return hasRetweetIcon && hasRetweetText;
    } catch (error) {
      console.error('检查Retweet失败:', error);
      return false;
    }
  }

  /**
   * 检查推文是否为回复推文（使用多种稳定特征）
   * 🔧 修复：不再依赖动态CSS类名，使用更稳定的特征
   */
  async isReplyTweet(tweetElement: any): Promise<boolean> {
    try {
      // 特征1: 检查是否有"Replying to"文本
      const replyingToElement = await tweetElement.$('[aria-label*="Replying to"], [data-testid="reply-context"]');
      if (replyingToElement) {
        const replyText = await replyingToElement.textContent();
        if (replyText && (replyText.includes('Replying to') || replyText.includes('回复'))) {
          console.log('🔍 通过"Replying to"文本识别为回复推文');
          return true;
        }
      }

      // 特征2: 检查推文内容是否以@用户名开头（强回复特征）
      const tweetTextElement = await tweetElement.$(this.selectors.tweetText);
      if (tweetTextElement) {
        const content = await tweetTextElement.textContent();
        if (content && content.trim().startsWith('@')) {
          console.log('🔍 通过@用户名开头识别为回复推文');
          return true;
        }
      }

      // 特征3: 检查推文结构中是否有回复指示符
      const replyIndicators = await tweetElement.$$('[aria-label*="reply"], [data-testid*="reply"], .r-reply, .reply-indicator');
      for (const indicator of replyIndicators) {
        try {
          const ariaLabel = await indicator.getAttribute('aria-label');
          const testId = await indicator.getAttribute('data-testid');
          
          if (ariaLabel && (ariaLabel.includes('reply') || ariaLabel.includes('回复'))) {
            console.log('🔍 通过aria-label识别为回复推文');
            return true;
          }
          
          if (testId && testId.includes('reply')) {
            console.log('🔍 通过data-testid识别为回复推文');
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      // 特征4: 检查推文在时间线中的位置和上下文（回复通常有特定的缩进或连接线）
      const hasReplyThread = await tweetElement.evaluate((el: Element) => {
        // 查找回复线程的视觉指示符
        const parent = el.parentElement;
        if (parent) {
          // 检查是否有连接线或缩进结构
          const hasThreadLine = parent.querySelector('[class*="thread"], [class*="reply"], [class*="connect"]');
          if (hasThreadLine) {
            return true;
          }
          
          // 检查是否在回复容器中
          const isInReplyContainer = parent.closest('[aria-label*="reply"], [data-testid*="reply"]');
          if (isInReplyContainer) {
            return true;
          }
        }
        return false;
      });

      if (hasReplyThread) {
        console.log('🔍 通过回复线程结构识别为回复推文');
        return true;
      }

      // 如果所有特征都不匹配，则不是回复
      return false;
      
    } catch (error) {
      console.error('检查回复推文失败:', error);
      return false; // 出错时默认不跳过
    }
  }

  /**
   * 提取推文ID（从URL中）
   */
  async extractTweetId(tweetElement: any): Promise<string | null> {
    try {
      const linkElement = await tweetElement.$(this.selectors.tweetUrl);
      if (!linkElement) {
        return null;
      }
      
      const href = await linkElement.getAttribute('href');
      if (!href) {
        return null;
      }
      
      // 从URL中提取推文ID: /username/status/1234567890
      const match = href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('提取推文ID失败:', error);
      return null;
    }
  }

  /**
   * 查找和点击Show more按钮
   */
  async findAndClickShowMoreButton(tweetElement: any): Promise<boolean> {
    try {
      // 首先尝试主要的data-testid选择器
      let showMoreButton = await tweetElement.$(this.selectors.showMoreButton);
      
      if (!showMoreButton) {
        // 如果没找到，尝试查找包含"Show more"或"查看更多"文本的按钮
        const allButtons = await tweetElement.$$('button');
        
        for (const button of allButtons) {
          try {
            const buttonText = await button.textContent();
            if (buttonText && (
              buttonText.includes('Show more') || 
              buttonText.includes('查看更多') ||
              buttonText.includes('show more') ||
              buttonText.toLowerCase().includes('show more')
            )) {
              showMoreButton = button;
              console.log(`通过文本找到"Show more"按钮: "${buttonText}"`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (showMoreButton) {
        console.log('发现"Show more"按钮，点击展开完整内容...');
        
        try {
          // 检查按钮是否仍然附加到DOM
          const isAttached = await showMoreButton.evaluate((el: Element) => el.isConnected);
          if (!isAttached) {
            console.log('⚠️ "Show more"按钮已从DOM中分离，跳过');
            return false;
          }

          // 检查按钮是否可见和可点击
          const isVisible = await showMoreButton.isVisible();
          const isEnabled = await showMoreButton.isEnabled();
          
          if (isVisible && isEnabled) {
            // 点击按钮展开内容
            await showMoreButton.click();
            
            // 等待内容展开完成
            await this.page.waitForTimeout(1500);
            
            console.log('✅ 推文内容已展开');
            return true;
          } else {
            console.log('⚠️ "Show more"按钮存在但不可点击');
          }
        } catch (elementError) {
          // 元素相关操作失败，可能是DOM变化导致的
          const errorMessage = elementError instanceof Error ? elementError.message : '未知错误';
          console.log('⚠️ "Show more"按钮操作失败，可能已从DOM分离:', errorMessage);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('查找Show more按钮失败:', error);
      return false;
    }
  }

  /**
   * 提取推文正文（包含处理Show more按钮）
   * 🔧 排除引用推文(Quote Tweet)的内容
   */
  async extractTweetText(tweetElement: any): Promise<string> {
    try {
      // 尝试查找和点击Show more按钮
      const expandedSuccessfully = await this.findAndClickShowMoreButton(tweetElement);

      // 查找所有推文文本元素
      const textElements = await tweetElement.$$(this.selectors.tweetText);

      if (textElements.length === 0) {
        return '';
      }

      // 如果只有一个文本元素,直接返回
      if (textElements.length === 1) {
        const text = await textElements[0].textContent();
        const fullText = text?.trim() || '';

        if (expandedSuccessfully && fullText.length > 100) {
          console.log(`✅ 成功提取完整推文文本 (${fullText.length} 字符)`);
        }

        return fullText;
      }

      // 如果有多个文本元素,第一个是主推文,后面的是引用推文
      // 只取第一个(主推文)
      const mainTextElement = textElements[0];
      const text = await mainTextElement.textContent();
      const fullText = text?.trim() || '';

      console.log(`🔍 检测到引用推文，只提取主推文内容 (${fullText.length} 字符)`);

      // 记录文本长度以便调试
      if (expandedSuccessfully && fullText.length > 100) {
        console.log(`✅ 成功提取完整推文文本 (${fullText.length} 字符)`);
      }

      return fullText;
    } catch (error) {
      console.error('提取推文正文失败:', error);
      return '';
    }
  }

  /**
   * 提取用户信息
   */
  async extractUserInfo(tweetElement: any): Promise<{ nickname: string; username: string }> {
    try {
      // 提取用户昵称
      const nicknameElements = await tweetElement.$$(this.selectors.userNickname);
      let nickname = '';
      
      // 遍历span元素，找到用户名（通常是第一个不为空的）
      for (const element of nicknameElements) {
        const text = await element.textContent();
        if (text && text.trim() && !text.includes('@')) {
          nickname = text.trim();
          break;
        }
      }

      // 提取用户名(@handle) - 多种方法尝试
      let username = '';
      
      // 方法1：使用主要选择器
      const usernameElement = await tweetElement.$(this.selectors.userUsername);
      if (usernameElement) {
        const href = await usernameElement.getAttribute('href');
        if (href) {
          // 从href中提取用户名: /username
          const match = href.match(/\/([^\/]+)$/);
          if (match && match[1]) {
            username = match[1]; // 不加@前缀，因为后面URL构建时会处理
            console.log(`✅ 通过主选择器提取用户名: ${username}`);
          }
        }
      }
      
      // 方法2：如果主选择器失败，尝试其他方法
      if (!username) {
        // 查找所有包含用户名的链接
        const userLinks = await tweetElement.$$('a[href*="/"]');
        
        for (const link of userLinks) {
          try {
            const href = await link.getAttribute('href');
            if (href && href.match(/^\/[a-zA-Z0-9_]+$/) && !href.includes('/status/')) {
              // 匹配 /username 格式，但排除 /status/ 链接
              const match = href.match(/\/([a-zA-Z0-9_]+)$/);
              if (match && match[1] && match[1].length > 0) {
                username = match[1];
                console.log(`✅ 通过备用方法提取用户名: ${username}`);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // 方法3：从推文链接中提取用户名
      if (!username) {
        const tweetUrlElement = await tweetElement.$(this.selectors.tweetUrl);
        if (tweetUrlElement) {
          const href = await tweetUrlElement.getAttribute('href');
          if (href) {
            // 从推文URL中提取: /username/status/1234567890
            const match = href.match(/\/([^\/]+)\/status\/\d+/);
            if (match && match[1]) {
              username = match[1];
              console.log(`✅ 从推文URL提取用户名: ${username}`);
            }
          }
        }
      }
      
      if (!username) {
        console.warn('⚠️ 无法提取用户名，将影响推文URL生成');
      }

      return {
        nickname,
        username: username || '' // 不添加@前缀，保持纯用户名
      };
    } catch (error) {
      console.error('提取用户信息失败:', error);
      return { nickname: '', username: '' };
    }
  }

  /**
   * 提取发布时间
   */
  async extractPublishTime(tweetElement: any): Promise<number> {
    try {
      const timeElement = await tweetElement.$(this.selectors.publishTime);
      if (!timeElement) {
        return Date.now();
      }
      
      const datetime = await timeElement.getAttribute('datetime');
      if (!datetime) {
        return Date.now();
      }
      
      // 转换为时间戳
      return new Date(datetime).getTime();
    } catch (error) {
      console.error('提取发布时间失败:', error);
      return Date.now();
    }
  }

  /**
   * 提取互动数据
   */
  async extractEngagementMetrics(tweetElement: any): Promise<{
    replyCount: number;
    retweetCount: number;
    likeCount: number;
    viewCount: number;
  }> {
    const defaultMetrics = { replyCount: 0, retweetCount: 0, likeCount: 0, viewCount: 0 };

    try {
      // 提取评论数
      const replyElement = await tweetElement.$(this.selectors.replyCount);
      const replyText = replyElement ? await replyElement.textContent() : '';
      const replyCount = this.parseCount(replyText);

      // 提取转发数
      const retweetElement = await tweetElement.$(this.selectors.retweetCount);
      const retweetText = retweetElement ? await retweetElement.textContent() : '';
      const retweetCount = this.parseCount(retweetText);

      // 提取点赞数
      const likeElement = await tweetElement.$(this.selectors.likeCount);
      const likeText = likeElement ? await likeElement.textContent() : '';
      const likeCount = this.parseCount(likeText);

      // 提取浏览数
      const viewElement = await tweetElement.$(this.selectors.viewCount);
      const viewText = viewElement ? await viewElement.textContent() : '';
      const viewCount = this.parseCount(viewText);

      return { replyCount, retweetCount, likeCount, viewCount };
    } catch (error) {
      console.error('提取互动数据失败:', error);
      return defaultMetrics;
    }
  }

  /**
   * 提取推文配图URLs（排除用户头像）
   */
  async extractImageUrls(tweetElement: any): Promise<string[]> {
    try {
      const imageElements = await tweetElement.$$(this.selectors.images);
      const imageUrls: string[] = [];

      for (const imgElement of imageElements) {
        const src = await imgElement.getAttribute('src');
        if (src && src.includes('pbs.twimg.com')) {
          // 排除profile图片和视频预览图
          if (!src.includes('profile_images') && !src.includes('amplify_video_thumb')) {
            imageUrls.push(src);
          }
        }
      }

      return imageUrls;
    } catch (error) {
      console.error('提取推文配图URLs失败:', error);
      return [];
    }
  }

  /**
   * 提取用户头像URL
   */
  async extractProfileImage(tweetElement: any): Promise<string | null> {
    try {
      const imageElements = await tweetElement.$$(this.selectors.images);

      for (const imgElement of imageElements) {
        const src = await imgElement.getAttribute('src');
        if (src && src.includes('pbs.twimg.com') && src.includes('profile_images')) {
          console.log(`✅ 提取到用户头像: ${src}`);
          return src;
        }
      }

      return null;
    } catch (error) {
      console.error('提取用户头像失败:', error);
      return null;
    }
  }

  /**
   * 建立推文ID到媒体ID的映射（增强版 - 从已捕获的URL推断）
   */
  async buildTweetVideoMapping(tweetElement: any, tweetId: string): Promise<void> {
    try {
      console.log(`🔍 为推文 [${tweetId}] 建立视频映射...`);
      
      // 方法1: 在推文中查找所有视频相关的媒体ID
      const videoThumbs = await tweetElement.$$('img[src*="amplify_video_thumb"]');
      console.log(`  📊 找到 ${videoThumbs.length} 个视频缩略图`);
      
      if (videoThumbs.length === 0) {
        // 方法2: 尝试更宽泛的选择器
        const allImages = await tweetElement.$$('img');
        console.log(`  📊 查找所有图片: ${allImages.length} 个`);
        
        for (const img of allImages) {
          try {
            const src = await img.getAttribute('src');
            if (src && src.includes('amplify_video_thumb')) {
              console.log(`  📸 发现视频缩略图: ${src}`);
              const match = src.match(/amplify_video_thumb\/(\d+)/);
              if (match && match[1]) {
                const mediaId = match[1];
                this.tweetVideoMapping.set(tweetId, mediaId);
                console.log(`🔗 建立映射: 推文[${tweetId}] -> 媒体[${mediaId}]`);
                return;
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        // 方法3: 如果DOM中找不到，从已捕获的URL中尝试匹配
        console.log(`  🎯 DOM中未找到缩略图，尝试从缓存匹配...`);
        
        // 检查最近捕获的视频URL，看是否与当前推文相关
        const recentMediaIds = Array.from(this.capturedVideoUrls.keys());
        console.log(`  📋 可用媒体ID: ${recentMediaIds.join(', ')}`);
        
        // 简单策略：如果只有一个最近的媒体ID，就假设是当前推文的
        if (recentMediaIds.length === 1) {
          const mediaId = recentMediaIds[0];
          if (mediaId) {
            this.tweetVideoMapping.set(tweetId, mediaId);
            console.log(`🔗 通过单一匹配建立映射: 推文[${tweetId}] -> 媒体[${mediaId}]`);
            return;
          }
        }
        
        // 更智能的策略：基于时间戳匹配最近的媒体ID
        if (recentMediaIds.length > 1) {
          const sortedByTime = recentMediaIds
            .map(id => ({ id, timestamp: this.capturedVideoUrls.get(id)?.timestamp || 0 }))
            .sort((a, b) => b.timestamp - a.timestamp);
          
          const latestMediaId = sortedByTime[0]?.id;
          if (latestMediaId) {
            this.tweetVideoMapping.set(tweetId, latestMediaId);
            console.log(`🔗 通过时间匹配建立映射: 推文[${tweetId}] -> 媒体[${latestMediaId}]`);
          }
          return;
        }
        
      } else {
        // 处理找到的视频缩略图
        for (const thumb of videoThumbs) {
          try {
            const src = await thumb.getAttribute('src');
            if (src) {
              console.log(`  📸 处理缩略图: ${src}`);
              const match = src.match(/amplify_video_thumb\/(\d+)/);
              if (match && match[1]) {
                const mediaId = match[1];
                this.tweetVideoMapping.set(tweetId, mediaId);
                console.log(`🔗 建立映射: 推文[${tweetId}] -> 媒体[${mediaId}]`);
                return; // 找到一个就返回
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      console.log(`⚠️ 未能为推文 [${tweetId}] 建立视频映射`);
    } catch (error) {
      console.warn('建立推文视频映射失败:', error);
    }
  }

  /**
   * 提取视频相关URLs（增强版 - 支持推文ID到媒体ID映射）
   */
  async extractVideoUrls(tweetElement: any, tweetId?: string): Promise<{ preview?: string; video?: string } | null> {
    try {
      // 检查是否包含视频播放器
      const videoPlayer = await tweetElement.$('[data-testid="videoPlayer"]');
      if (!videoPlayer) {
        return null;
      }

      console.log(`🎬 发现视频内容，开始提取... [推文ID: ${tweetId}]`);
      const result: { preview?: string; video?: string } = {};

      // 1. 首先尝试从DOM获取预览图
      const videoElement = await videoPlayer.$('video[poster]');
      if (videoElement) {
        const poster = await videoElement.getAttribute('poster');
        if (poster && poster.includes('amplify_video_thumb')) {
          result.preview = poster;
          console.log(`✅ 从DOM提取到视频预览图: ${poster}`);
          
          // 从预览图中提取媒体ID
          const match = poster.match(/amplify_video_thumb\/(\d+)/);
          if (match && match[1]) {
            const mediaId = match[1];
            console.log(`🔎 媒体ID: ${mediaId}`);
            
            // 2. 从已捕获的网络请求中查找对应的视频URL
            const capturedData = this.capturedVideoUrls.get(mediaId);
            if (capturedData) {
              if (capturedData.video) {
                result.video = capturedData.video;
                console.log(`✅ 从缓存获取视频URL: ${result.video}`);
              }
              if (capturedData.preview && !result.preview) {
                result.preview = capturedData.preview;
              }
            } else {
              console.log(`⚠️ 未在缓存中找到媒体ID ${mediaId} 的视频URL`);
              
              // 3. 如果缓存中没有，尝试构造URL（基于已知模式）
              // Twitter视频URL通常遵循固定模式
              const possibleUrls = [
                `https://video.twimg.com/amplify_video/${mediaId}/vid/avc1/720x1280/`,
                `https://video.twimg.com/amplify_video/${mediaId}/vid/avc1/1280x720/`,
                `https://video.twimg.com/amplify_video/${mediaId}/vid/avc1/1920x1080/`,
                `https://video.twimg.com/ext_tw_video/${mediaId}/pu/vid/avc1/720x1280/`,
                `https://video.twimg.com/ext_tw_video/${mediaId}/pu/vid/avc1/1280x720/`,
              ];
              
              // 检查缓存的所有URL，看是否有包含该媒体ID的
              for (const [id, data] of this.capturedVideoUrls.entries()) {
                if (data.video && data.video.includes(mediaId)) {
                  result.video = data.video;
                  console.log(`✅ 从缓存找到相关视频URL: ${result.video}`);
                  break;
                }
              }
            }
          }
        }
      }

      // 1.b 若未从 video[poster] 提取到媒体ID，则尝试在推文内查找缩略图 IMG 提取媒体ID
      if (!result.preview) {
        try {
          const thumbImg = await tweetElement.$('img[src*="amplify_video_thumb/"]');
          if (thumbImg) {
            const thumbSrc = await thumbImg.getAttribute('src');
            if (thumbSrc) {
              result.preview = thumbSrc;
              const thumbMatch = thumbSrc.match(/amplify_video_thumb\/(\d+)\//);
              if (thumbMatch && thumbMatch[1]) {
                const mediaId = thumbMatch[1];
                console.log(`🔎 通过IMG提取媒体ID: ${mediaId}`);
                const capturedData = this.capturedVideoUrls.get(mediaId);
                if (capturedData && capturedData.video) {
                  result.video = capturedData.video;
                  console.log(`✅ 通过IMG媒体ID从缓存获取视频URL: ${result.video}`);
                }
              }
            }
          }
        } catch {}
      }

      // 4. 如果还没有找到视频URL，尝试从DOM中的source标签获取
      if (!result.video) {
        console.log('🔄 尝试从DOM获取视频源...');
        const sources = await videoPlayer.$$('video source');
        for (const source of sources) {
          try {
            const src = await source.getAttribute('src');
            if (src && !src.startsWith('blob:')) {
              console.log(`📹 从source标签获取: ${src}`);
              result.video = src;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      // 5. 最后尝试从video元素的src属性获取
      if (!result.video && videoElement) {
        try {
          const videoSrc = await videoElement.getAttribute('src');
          if (videoSrc && !videoSrc.startsWith('blob:')) {
            console.log(`📺 从video元素获取: ${videoSrc}`);
            result.video = videoSrc;
          }
        } catch (e) {
          // 忽略错误
        }
      }

      // 6. 最后兜底：使用推文ID到媒体ID的映射
      if ((!result.video || !result.preview) && tweetId) {
        const mappedMediaId = this.tweetVideoMapping.get(tweetId);
        if (mappedMediaId) {
          console.log(`🎯 使用映射: 推文[${tweetId}] -> 媒体[${mappedMediaId}]`);
          const mappedData = this.capturedVideoUrls.get(mappedMediaId);
          if (mappedData) {
            if (mappedData.video && !result.video) {
              result.video = mappedData.video;
              console.log(`✅ 通过映射获取视频URL: ${result.video}`);
            }
            if (mappedData.preview && !result.preview) {
              result.preview = mappedData.preview;
              console.log(`✅ 通过映射获取预览图: ${result.preview}`);
            }
          }
        }
      }

      // 7. 输出调试信息
      if (!result.video && !result.preview) {
        console.log('❌ 未能提取视频信息');
        console.log('📊 当前缓存的视频URL数量:', this.capturedVideoUrls.size);
        console.log('📊 推文映射数量:', this.tweetVideoMapping.size);
        if (this.capturedVideoUrls.size > 0) {
          console.log('📋 缓存内容:', Array.from(this.capturedVideoUrls.entries()));
        }
        if (this.tweetVideoMapping.size > 0) {
          console.log('📋 映射内容:', Array.from(this.tweetVideoMapping.entries()));
        }
        return null;
      }

      console.log('🎉 视频提取成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 提取视频URLs失败:', error);
      return null;
    }
  }

  /**
   * 解析数量文本（如"1.2K" -> 1200）
   */
  private parseCount(text: string | null): number {
    if (!text || text.trim() === '') {
      return 0;
    }

    const cleanText = text.trim().toLowerCase();
    
    // 移除逗号
    let numText = cleanText.replace(/,/g, '');
    
    // 处理K、M等单位
    if (numText.includes('k')) {
      const num = parseFloat(numText.replace('k', ''));
      return Math.floor(num * 1000);
    }
    
    if (numText.includes('m')) {
      const num = parseFloat(numText.replace('m', ''));
      return Math.floor(num * 1000000);
    }
    
    // 普通数字
    const num = parseInt(numText, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 构建推文URL
   */
  async buildTweetUrl(tweetElement: any, tweetId: string, username: string): Promise<string> {
    try {
      // 清理用户名（移除@前缀）
      let cleanUsername = username.replace('@', '');
      
      // 如果用户名为空或无效，尝试从推文链接中提取
      if (!cleanUsername || cleanUsername.length === 0) {
        console.warn('用户名为空，尝试从推文链接中提取...');
        
        const tweetUrlElement = await tweetElement.$(this.selectors.tweetUrl);
        if (tweetUrlElement) {
          const href = await tweetUrlElement.getAttribute('href');
          if (href) {
            // 从推文URL中提取: /username/status/1234567890
            const match = href.match(/\/([^\/]+)\/status\/\d+/);
            if (match && match[1]) {
              cleanUsername = match[1];
              console.log(`✅ 从推文链接提取用户名: ${cleanUsername}`);
            }
          }
        }
      }
      
      // 如果仍然没有用户名，使用占位符
      if (!cleanUsername || cleanUsername.length === 0) {
        console.warn(`⚠️ 无法获取用户名，推文ID: ${tweetId}`);
        cleanUsername = 'unknown_user';
      }
      
      const tweetUrl = `https://x.com/${cleanUsername}/status/${tweetId}`;
      console.log(`🔗 构建推文URL: ${tweetUrl}`);
      
      return tweetUrl;
    } catch (error) {
      console.error('构建推文URL失败:', error);
      return `https://x.com/unknown_user/status/${tweetId}`;
    }
  }

  /**
   * 提取单个推文的完整数据
   */
  async extractTweetData(tweetElement: any, listId: string): Promise<TweetData | null> {
    try {
      // 检查是否为Retweet，用于标记 isRT（不再跳过）
      const isRetweet = await this.isRetweet(tweetElement);
      // 检查是否为回复推文（仅用于标记，不跳过）
      const isReply = await this.isReplyByContext(tweetElement);

      // 提取推文ID
      const tweetId = await this.extractTweetId(tweetElement);
      if (!tweetId) {
        console.warn('无法提取推文ID，跳过此推文');
        return null;
      }

      // 🎯 建立推文ID到媒体ID的映射 - 在提取视频前先扫描并建立映射
      await this.buildTweetVideoMapping(tweetElement, tweetId);

      // 提取各项数据
      const content = await this.extractTweetText(tweetElement);
      const { nickname, username } = await this.extractUserInfo(tweetElement);
      const publishedAt = await this.extractPublishTime(tweetElement);
      const { replyCount, retweetCount, likeCount, viewCount } = await this.extractEngagementMetrics(tweetElement);
      
      // 分别提取不同类型的媒体内容
      const imageUrls = await this.extractImageUrls(tweetElement);
      const profileImageUrl = await this.extractProfileImage(tweetElement);
      const videoUrls = await this.extractVideoUrls(tweetElement, tweetId); // 传入推文ID

      // 构建推文URL（增强的方法，确保正确性）
      const tweetUrl = await this.buildTweetUrl(tweetElement, tweetId, username);

      const tweetData: TweetData = {
        id: tweetId,
        content,
        userNickname: nickname,
        userUsername: username,
        replyCount,
        retweetCount,
        likeCount,
        viewCount,
        isRT: isRetweet,
        isReply,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        profileImageUrl: profileImageUrl || undefined,
        videoUrls: videoUrls || undefined,
        tweetUrl,
        publishedAt,
        listId,
        scrapedAt: Date.now(),
      };

      return tweetData;
    } catch (error) {
      console.error('提取推文数据失败:', error);
      return null;
    }
  }

  /**
   * 通过上下文精确识别回复推文（仅标记，不用于过滤）
   * 规则：
   *  - 优先检测“Replying to …”多语言文本区域
   *  - 可选结合正文是否以@开头进行补强
   */
  private async isReplyByContext(tweetElement: any): Promise<boolean> {
    try {
      // 1) 查找含有“Replying to …”的文本区域（多语言）
      const hintTexts = [
        'Replying to', '正在回复', '回复给', '回覆給', '返信先'
      ];

      // 遍历 div/span/a 文本，避免误扫操作栏按钮
      const candidateNodes = await tweetElement.$$('div, span, a');
      for (const node of candidateNodes) {
        try {
          const text = (await node.textContent())?.trim() || '';
          if (!text) continue;
          if (hintTexts.some(h => text.includes(h))) {
            // 命中上下文文案，进一步可选校验：正文是否以 @ 开头
            const textEl = await tweetElement.$(this.selectors.tweetText);
            if (textEl) {
              const content = (await textEl.textContent())?.trim() || '';
              if (content.startsWith('@')) {
                return true; // A+B 同时命中
              }
            }
            // 即便正文不以@开头，也判定为回复（依赖强文案）
            return true;
          }
        } catch {}
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 处理当前页面的所有推文
   */
  async processCurrentPage(
    listId: string,
    existingTweetIds: Set<string>,
    processedTweetIds: Set<string>, // 全局任务级别的已处理推文ID
    targetUsername?: string // 按Username爬取时的目标用户名(不带@)
  ): Promise<PageProcessResult> {
    try {
      console.log('开始处理当前页面的推文...');

      // 验证当前URL，防止意外跳转到其他页面
      const currentUrl = this.page.url();
      if (targetUsername && !currentUrl.includes(`/${targetUsername}`)) {
        console.warn(`⚠️ 检测到页面URL不匹配！当前: ${currentUrl}, 期望包含: /${targetUsername}`);
        console.warn('⚠️ 可能误点了推荐关注链接，尝试导航回目标页面...');
        try {
          // 使用domcontentloaded而非networkidle，更快但可靠性稍低
          await this.page.goto(`https://x.com/${targetUsername}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          await this.page.waitForTimeout(2000);
          console.log('✅ 已恢复到目标用户页面');
        } catch (navError) {
          console.error('⚠️ 导航恢复失败，继续尝试处理当前页面:', navError);
          // 不抛出错误，继续处理
        }
      }

      // 获取所有推文元素（Username模式直接使用回退方案）
      const allTweetElements = await this.getTweetElements(!!targetUsername);
      const tweetElements = await this.skipFirstTweet(allTweetElements);
      
      console.log(`找到 ${tweetElements.length} 条推文待处理`);

      const newTweets: TweetData[] = [];
      let duplicateCount = 0; // 数据库重复
      let taskInternalDuplicates = 0; // 任务内重复（跨滚动重复）
      let retweetSkipCount = 0;
      let replySkipCount = 0; // 新增：被回复推文跳过计数

      for (const tweetElement of tweetElements) {
        try {
          // 按Username爬取时的过滤逻辑
          if (targetUsername) {
            // 跳过转发
            if (await this.isRetweet(tweetElement)) {
              retweetSkipCount++;
              continue;
            }

            // 检查推文作者是否为目标用户
            const userInfo = await this.extractUserInfo(tweetElement);
            if (userInfo.username && userInfo.username !== targetUsername) {
              console.log(`⚠️ 跳过非目标用户推文: ${userInfo.username}`);
              continue;
            }
          } else {
            // 按List爬取时的原有逻辑：不跳过Retweet，只统计数量
            if (await this.isRetweet(tweetElement)) {
              retweetSkipCount++;
            }

            // 不再跳过回复，仅统计并继续采集
            if (await this.isReplyTweet(tweetElement)) {
              replySkipCount++;
            }
          }

          // 提取推文ID检查重复
          const tweetId = await this.extractTweetId(tweetElement);
          if (!tweetId) {
            continue;
          }

          // 首先检查是否为任务内重复（跨滚动重复）
          if (processedTweetIds.has(tweetId)) {
            taskInternalDuplicates++;
            console.log(`🔄 任务内重复推文: ${tweetId}`);
            continue;
          }

          // 然后检查是否与数据库重复
          if (existingTweetIds.has(tweetId)) {
            duplicateCount++;
            console.log(`💾 数据库重复推文: ${tweetId}`);
            continue;
          }

          // 提取推文数据
          const tweetData = await this.extractTweetData(tweetElement, listId);
          if (tweetData) {
            newTweets.push(tweetData);
            existingTweetIds.add(tweetId);
            processedTweetIds.add(tweetId); // 添加到全局已处理ID集合
          }
        } catch (error) {
          console.error('处理单个推文失败:', error);
        }
      }

      const shouldContinue = duplicateCount < config.spider.twitterList.duplicateStopCount;

      // 统计转推被采集的数量
      const collectedRetweets = newTweets.filter(tweet => tweet.isRT).length;
      
      console.log(`📊 页面处理完成统计:`);
      console.log(`  ├─ 新推文: ${newTweets.length} (含转推: ${collectedRetweets})`);
      console.log(`  ├─ 数据库重复: ${duplicateCount}`);
      console.log(`  ├─ 任务内重复: ${taskInternalDuplicates}`);
      console.log(`  ├─ 检测到转推: ${retweetSkipCount} (已全部采集)`);
      console.log(`  ├─ 跳过回复: ${replySkipCount}`);
      console.log(`  ├─ 页面推文元素: ${tweetElements.length}`);
      console.log(`  └─ 总处理数: ${newTweets.length + duplicateCount + taskInternalDuplicates + replySkipCount}`);

      return {
        newTweets,
        duplicateCount,
        taskInternalDuplicates,
        retweetSkipCount,
        replySkipCount, // 新增返回值
        shouldContinue,
        totalProcessed: newTweets.length + duplicateCount + taskInternalDuplicates + retweetSkipCount + replySkipCount,
        totalTweetElements: tweetElements.length, // 页面上实际找到的推文元素数量
      };
    } catch (error) {
      console.error('处理页面失败:', error);
      throw new Error('处理页面失败');
    }
  }
} 