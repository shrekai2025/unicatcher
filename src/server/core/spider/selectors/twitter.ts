/**
 * Twitter选择器和数据提取器
 * 负责从Twitter List页面提取推文数据
 */

import type { Page } from 'playwright';
import type { TweetData, TwitterSelectors, PageProcessResult } from '~/types/spider';
import { config } from '~/lib/config';

export class TwitterSelector {
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

  constructor(private readonly page: Page) {}

  /**
   * 等待Timeline容器加载
   */
  async waitForTimeline(): Promise<void> {
    console.log('正在等待Timeline容器加载...');
    
    // 定义多个可能的选择器
    const possibleSelectors = [
      this.selectors.timelineContainer,
      '[data-testid="primaryColumn"]',
      '[data-testid="timeline"]', 
      'main[role="main"]',
      '[aria-label*="Timeline"]',
      'section[role="region"]',
      'div[data-testid="cellInnerDiv"]'
    ];
    
    let lastError: Error | null = null;
    
    // 尝试每个选择器
    for (const selector of possibleSelectors) {
      try {
        console.log(`尝试选择器: ${selector}`);
        await this.page.waitForSelector(selector, {
          timeout: 10000, // 减少单个选择器的等待时间
        });
        console.log(`Timeline容器已加载 (使用选择器: ${selector})`);
        return;
      } catch (error) {
        console.log(`选择器 ${selector} 失败，尝试下一个...`);
        lastError = error instanceof Error ? error : new Error('选择器等待失败');
        continue;
      }
    }
    
    // 如果所有选择器都失败，尝试检查页面是否至少有基本内容
    try {
      console.log('尝试检查页面基本内容...');
      
      // 检查是否被重定向到登录页面
      const loginButton = await this.page.$('[data-testid="loginButton"], [href="/login"], input[name="text"]');
      if (loginButton) {
        throw new Error('页面被重定向到登录页面，登录状态可能已失效');
      }
      
      // 检查是否有推文内容
      const tweetElements = await this.page.$$('article, [data-testid="tweet"]');
      if (tweetElements.length > 0) {
        console.log(`找到 ${tweetElements.length} 个推文元素，继续执行`);
        return;
      }
      
      // 最后检查页面是否至少加载了基本结构
      const mainContent = await this.page.$('main, #react-root, body');
      if (mainContent) {
        console.log('页面基本结构已加载，尝试继续');
        // 额外等待一下，让内容加载
        await this.page.waitForTimeout(5000);
        return;
      }
      
    } catch (checkError) {
      console.error('页面内容检查失败:', checkError);
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
  async getTweetElements(): Promise<any[]> {
    try {
      // 首先定位List时间线容器
      const timelineContainer = await this.page.$(this.selectors.timelineContainer);
      
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
        const fallbackSelectors = [
          '[data-testid="primaryColumn"]',
          'main[role="main"]',
          '[aria-label*="Timeline"]'
        ];
        
        for (const selector of fallbackSelectors) {
          console.log(`⚠️ 尝试回退选择器: ${selector}`);
          const container = await this.page.$(selector);
          if (container) {
            // 尝试在回退容器中也使用cellInnerDiv逻辑
            const cellElements = await container.$$('[data-testid="cellInnerDiv"]');
            if (cellElements.length > 1) {
              const tweetCells = cellElements.slice(1);
              const allTweets: any[] = [];
              for (const cell of tweetCells) {
                const tweetsInCell = await cell.$$(this.selectors.tweetContainer);
                allTweets.push(...tweetsInCell);
              }
              console.log(`📊 回退方案找到 ${allTweets.length} 个推文`);
              return allTweets;
            } else {
              // 如果没有cellInnerDiv，直接搜索推文
              const tweets = await container.$$(this.selectors.tweetContainer);
              console.log(`📊 回退方案找到 ${tweets.length} 个推文`);
              return tweets;
            }
          }
        }
        
        // 最后的回退：全局搜索（保持原有行为但记录警告）
        console.warn('⚠️ 警告：所有回退方案失败，使用全局搜索（可能包含非List推文）');
        const tweets = await this.page.$$(this.selectors.tweetContainer);
        console.log(`📊 全局搜索找到 ${tweets.length} 个推文元素`);
        return tweets;
      }
    } catch (error) {
      console.error('获取推文元素失败:', error);
      return [];
    }
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
   */
  async extractTweetText(tweetElement: any): Promise<string> {
    try {
      // 尝试查找和点击Show more按钮
      const expandedSuccessfully = await this.findAndClickShowMoreButton(tweetElement);
      
      // 提取推文文本（展开后的完整内容）
      const textElement = await tweetElement.$(this.selectors.tweetText);
      if (!textElement) {
        return '';
      }
      
      const text = await textElement.textContent();
      const fullText = text?.trim() || '';
      
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
        username: username ? `@${username}` : '' // 添加@前缀用于显示
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
   * 提取图片URLs
   */
  async extractImageUrls(tweetElement: any): Promise<string[]> {
    try {
      const imageElements = await tweetElement.$$(this.selectors.images);
      const imageUrls: string[] = [];

      for (const imgElement of imageElements) {
        const src = await imgElement.getAttribute('src');
        if (src && src.includes('pbs.twimg.com')) {
          imageUrls.push(src);
        }
      }

      return imageUrls;
    } catch (error) {
      console.error('提取图片URLs失败:', error);
      return [];
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

      // 提取推文ID
      const tweetId = await this.extractTweetId(tweetElement);
      if (!tweetId) {
        console.warn('无法提取推文ID，跳过此推文');
        return null;
      }

      // 提取各项数据
      const content = await this.extractTweetText(tweetElement);
      const { nickname, username } = await this.extractUserInfo(tweetElement);
      const publishedAt = await this.extractPublishTime(tweetElement);
      const { replyCount, retweetCount, likeCount, viewCount } = await this.extractEngagementMetrics(tweetElement);
      const imageUrls = await this.extractImageUrls(tweetElement);

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
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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
   * 处理当前页面的所有推文
   */
  async processCurrentPage(
    listId: string,
    existingTweetIds: Set<string>,
    processedTweetIds: Set<string> // 全局任务级别的已处理推文ID
  ): Promise<PageProcessResult> {
    try {
      console.log('开始处理当前页面的推文...');
      
      // 获取所有推文元素
      const allTweetElements = await this.getTweetElements();
      const tweetElements = await this.skipFirstTweet(allTweetElements);
      
      console.log(`找到 ${tweetElements.length} 条推文待处理`);

      const newTweets: TweetData[] = [];
      let duplicateCount = 0; // 数据库重复
      let taskInternalDuplicates = 0; // 任务内重复（跨滚动重复）
      let retweetSkipCount = 0;
      let replySkipCount = 0; // 新增：被回复推文跳过计数

      for (const tweetElement of tweetElements) {
        try {
          // 不再跳过Retweet，只统计数量以便日志观察
          if (await this.isRetweet(tweetElement)) {
            retweetSkipCount++;
          }

          // 检查是否为被回复的推文
          if (await this.isReplyTweet(tweetElement)) {
            replySkipCount++; // 单独计数被回复的推文
            continue;
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
      console.log(`  └─ 总处理数: ${newTweets.length + duplicateCount + taskInternalDuplicates + replySkipCount}`);

      return {
        newTweets,
        duplicateCount,
        taskInternalDuplicates,
        retweetSkipCount,
        replySkipCount, // 新增返回值
        shouldContinue,
        totalProcessed: newTweets.length + duplicateCount + taskInternalDuplicates + retweetSkipCount + replySkipCount,
      };
    } catch (error) {
      console.error('处理页面失败:', error);
      throw new Error('处理页面失败');
    }
  }
} 