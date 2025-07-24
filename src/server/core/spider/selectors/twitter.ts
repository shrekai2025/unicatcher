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
   * 获取当前页面的所有推文元素
   */
  async getTweetElements(): Promise<any[]> {
    try {
      return await this.page.$$(this.selectors.tweetContainer);
    } catch (error) {
      console.error('获取推文元素失败:', error);
      return [];
    }
  }

  /**
   * 跳过第一个推文（List信息头部）
   */
  async skipFirstTweet(tweetElements: any[]): Promise<any[]> {
    if (tweetElements.length === 0) {
      return [];
    }
    
    console.log(`总共找到 ${tweetElements.length} 个推文，跳过第一个List信息`);
    return tweetElements.slice(1);
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
   * 检查推文是否为被回复的推文（不是最新的）
   * 判断依据：Tweet-User-Avatar元素下面有同级别的空div
   */
  async isReplyTweet(tweetElement: any): Promise<boolean> {
    try {
      // 查找Tweet-User-Avatar元素
      const avatarElement = await tweetElement.$('[data-testid="Tweet-User-Avatar"]');
      if (!avatarElement) {
        return false; // 没有头像元素，可能是其他类型的内容
      }

      // 获取头像元素的父级容器
      const avatarParent = await avatarElement.evaluateHandle((el: Element) => el.parentElement);
      if (!avatarParent) {
        return false;
      }

      // 检查父级容器的下一个同级元素
      const nextSibling = await avatarParent.evaluateHandle((el: Element) => el.nextElementSibling);
      if (!nextSibling) {
        return false;
      }

      // 检查下一个同级元素是否为空div且包含特定的class模式
      const isReplyIndicator = await nextSibling.evaluate((el: Element) => {
        if (!el || el.tagName !== 'DIV') {
          return false;
        }

        // 检查是否为空元素（没有文本内容）
        const hasText = el.textContent && el.textContent.trim().length > 0;
        if (hasText) {
          return false;
        }

        // 检查是否有子元素（如果有子元素，说明不是我们要找的空div）
        const hasChildren = el.children && el.children.length > 0;
        if (hasChildren) {
          return false;
        }

        // 检查class是否包含特定模式（用于识别回复指示符）
        const className = el.className || '';
        const hasReplyClasses = className.includes('css-175oi2r') && 
                               className.includes('r-1bnu78o') && 
                               className.includes('r-f8sm7e');
        
        return hasReplyClasses;
      });

      if (isReplyIndicator) {
        console.log('🔍 检测到被回复的推文，将跳过采集');
        return true;
      }

      return false;
    } catch (error) {
      console.error('检查被回复推文失败:', error);
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
      // 检查是否为Retweet，如果是则跳过
      if (await this.isRetweet(tweetElement)) {
        return null;
      }

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
          // 检查是否为Retweet
          if (await this.isRetweet(tweetElement)) {
            retweetSkipCount++;
            continue;
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

      console.log(`页面处理完成: 新推文 ${newTweets.length}, 数据库重复 ${duplicateCount}, 任务内重复 ${taskInternalDuplicates}, 跳过转推 ${retweetSkipCount}, 跳过被回复 ${replySkipCount}`);

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