/**
 * YouTube选择器和数据提取器
 * 负责从YouTube频道页面提取视频数据
 */

import type { Page } from 'playwright';
import type { YouTubeVideoData, YouTubeSelectors, YouTubePageProcessResult } from '~/types/spider';
import { config } from '~/lib/config';

export class YouTubeSelector {
  // YouTube 频道页面选择器配置
  // ⚠️ 注意: YouTube的前端结构会不定期更新，以下选择器可能需要维护
  // 选择器设计原则: 优先使用标准HTML属性 > data属性 > class名，避免依赖动态class
  // 🔄 2024年更新: 基于实际YouTube页面结构优化选择器
  private readonly selectors: YouTubeSelectors = {
    // 🔵 容器选择器 - 定位主要内容区域
    videosContainer: 'ytd-rich-grid-renderer #contents, #contents ytd-rich-grid-renderer, #contents ytd-two-column-browse-results-renderer',
    videoContainer: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer',

    // 🔵 基础信息选择器 - 提取视频核心内容 (基于实际页面结构优化)
    videoTitle: 'h3.yt-lockup-metadata-view-model__heading-reset, a.yt-lockup-metadata-view-model__title .yt-core-attributed-string, h3 a#video-title, #video-title, .ytd-video-meta-block #video-title',
    videoUrl: 'a.yt-lockup-metadata-view-model__title, h3 a#video-title, #video-title, .ytd-video-meta-block #video-title',
    thumbnail: 'yt-thumbnail-view-model img, img#img, .ytd-thumbnail img, ytd-thumbnail img, .yt-lockup-view-model__content-image img',
    duration: '.yt-badge-shape__text, span.ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer #text',
    viewCount: '.yt-lockup-metadata-view-model__secondary-text span, #metadata-line span:first-child, .ytd-video-meta-block #metadata-line span:first-child',
    publishedAt: '.yt-lockup-metadata-view-model__secondary-text span:last-child, #metadata-line span:last-child, .ytd-video-meta-block #metadata-line span:last-child',

    // 🔵 频道信息选择器 - 提取频道相关数据
    channelName: '.yt-lockup-metadata-view-model__channel-name, #channel-info #text, .ytd-channel-name #text, #owner-text a',
    channelHandle: '.yt-lockup-metadata-view-model__channel-handle, #channel-info #handle, .ytd-channel-name #handle, #owner-text #handle',
    channelUrl: '.yt-lockup-metadata-view-model a, #channel-info a, .ytd-channel-name a, #owner-text a',

    // 🔵 交互数据选择器 - 提取社交指标
    likeCount: '#factual .ytd-toggle-button-renderer #text, ytd-menu-renderer #top-level-buttons #text',

    // 🔵 导航和加载选择器 - 页面操作
    loadMoreButton: 'button[aria-label*="Show more"], ytd-continuation-item-renderer button',
    scrollContainer: 'html',
  };

  constructor(private readonly page: Page) {}

  /**
   * 处理YouTube频道页面，提取视频列表
   */
  async processChannelPage(
    channelHandle: string,
    existingVideoIds: Set<string>,
    processedVideoIds: Set<string>
  ): Promise<YouTubePageProcessResult> {
    const newVideos: YouTubeVideoData[] = [];
    let duplicateCount = 0;
    let taskInternalDuplicates = 0;
    let totalProcessed = 0;

    try {
      // 等待视频容器加载
      await this.page.waitForSelector(this.selectors.videosContainer, { timeout: 10000 });
      console.log('✅ YouTube 视频容器已加载');

      // 获取所有视频容器
      const videoElements = await this.page.locator(this.selectors.videoContainer).all();
      console.log(`📊 发现 ${videoElements.length} 个视频元素`);

      for (const videoElement of videoElements) {
        try {
          const videoData = await this.extractVideoData(videoElement, channelHandle);

          if (!videoData || !videoData.id) {
            console.warn('⚠️ 跳过无效视频数据');
            continue;
          }

          totalProcessed++;

          // 检查是否已经处理过（任务内重复）
          if (processedVideoIds.has(videoData.id)) {
            taskInternalDuplicates++;
            console.log(`🔄 任务内重复视频: ${videoData.title?.substring(0, 50)}...`);
            continue;
          }

          // 检查数据库中是否已存在
          if (existingVideoIds.has(videoData.id)) {
            duplicateCount++;
            console.log(`📁 数据库重复视频: ${videoData.title?.substring(0, 50)}...`);
            processedVideoIds.add(videoData.id);
            continue;
          }

          // 新视频，添加到结果中
          newVideos.push(videoData);
          processedVideoIds.add(videoData.id);
          console.log(`✅ 新视频: ${videoData.title || '无标题'} (ID: ${videoData.id})`);

        } catch (error) {
          console.error('提取单个视频数据失败:', error);
          continue;
        }
      }

      return {
        newVideos,
        duplicateCount,
        taskInternalDuplicates,
        shouldContinue: duplicateCount < config.spider.youtubeChannel.duplicateStopCount,
        totalProcessed,
        channelName: channelHandle,
      };

    } catch (error) {
      console.error('处理YouTube频道页面失败:', error);
      return {
        newVideos: [],
        duplicateCount: 0,
        taskInternalDuplicates: 0,
        shouldContinue: false,
        totalProcessed: 0,
        channelName: channelHandle,
      };
    }
  }

  /**
   * 从单个视频元素提取数据
   */
  private async extractVideoData(
    videoElement: any,
    channelHandle: string
  ): Promise<YouTubeVideoData | null> {
    try {
      // 尝试从 content-id 类名提取视频ID (新的YouTube结构)
      let videoId = await this.extractVideoIdFromContentId(videoElement);

      // 提取视频标题和URL - 尝试多个选择器
      let title = '';
      let videoUrl = '';

      // 尝试从h3标签的title属性获取标题
      try {
        const h3Element = await videoElement.locator('h3.yt-lockup-metadata-view-model__heading-reset').first();
        const h3Exists = await h3Element.count() > 0;

        if (h3Exists) {
          const titleAttr = await h3Element.getAttribute('title');
          if (titleAttr) {
            title = titleAttr;
            console.log(`✅ 从h3的title属性提取到标题: ${title.substring(0, 50)}...`);
          }
        }
      } catch (e) {
        console.log('⚠️ 从h3 title属性提取标题失败');
      }

      const titleSelectors = [
        'a.yt-lockup-metadata-view-model__title',
        'h3 a#video-title',
        '#video-title',
        '.ytd-video-meta-block #video-title',
        '.yt-lockup-metadata-view-model__title',
        'a[href*="/watch?v="]'  // 通用的视频链接选择器
      ];

      // 提取URL
      for (const selector of titleSelectors) {
        try {
          const titleElement = await videoElement.locator(selector).first();
          const elementExists = await titleElement.count() > 0;

          if (elementExists) {
            const urlFromElement = await titleElement.getAttribute('href') || '';
            const textFromElement = await titleElement.textContent() || '';

            // 如果还没有标题，尝试从文本内容获取
            if (!title && textFromElement) {
              title = textFromElement;
              console.log(`✅ 使用选择器 "${selector}" 提取到标题: ${title.substring(0, 50)}...`);
            }

            // 如果没有URL，尝试获取
            if (!videoUrl && urlFromElement) {
              videoUrl = urlFromElement;
              console.log(`✅ 使用选择器 "${selector}" 提取到URL: ${videoUrl}`);
            }

            if (title && videoUrl) {
              console.log(`✅ 标题和URL都已获取，使用选择器: "${selector}"`);
              break;
            }
          }
        } catch (selectorError) {
          console.log(`⚠️ 选择器 "${selector}" 未找到匹配元素`);
          continue;
        }
      }

      if (!title || !videoUrl) {
        console.warn('缺少必需字段: title 或 videoUrl。已尝试所有选择器。');

        // 输出调试信息
        try {
          const elementInfo = await videoElement.evaluate((el: any) => {
            return {
              tagName: el.tagName,
              className: el.className,
              innerHTML: el.innerHTML?.substring(0, 200) + '...'
            };
          });
          console.log('🔍 视频元素调试信息:', elementInfo);
        } catch (debugError) {
          console.log('无法获取元素调试信息');
        }

        return null;
      }

      // 如果从content-id没有获取到ID，再从URL提取
      if (!videoId) {
        videoId = this.extractVideoId(videoUrl);
      }

      if (!videoId) {
        console.warn('无法从URL或content-id提取视频ID:', videoUrl);
        return null;
      }

      // 提取缩略图
      const thumbnailElement = await videoElement.locator(this.selectors.thumbnail).first();
      let thumbnailUrl = '';
      try {
        thumbnailUrl = await thumbnailElement.getAttribute('src') || '';
      } catch (e) {
        console.warn('提取缩略图失败');
      }

      // 提取时长
      const durationElement = await videoElement.locator(this.selectors.duration).first();
      let duration = '';
      try {
        duration = await durationElement.textContent() || '';
      } catch (e) {
        console.warn('提取视频时长失败');
      }

      // 提取浏览次数
      const viewCountElement = await videoElement.locator(this.selectors.viewCount).first();
      let viewCount = 0;
      try {
        const viewCountText = await viewCountElement.textContent() || '';
        viewCount = this.parseViewCount(viewCountText);
      } catch (e) {
        console.warn('提取浏览次数失败');
      }

      // 提取发布时间
      const publishedAtElement = await videoElement.locator(this.selectors.publishedAt).first();
      let publishedAt = '';
      let publishedTimestamp: number | undefined;
      try {
        publishedAt = await publishedAtElement.textContent() || '';
        publishedTimestamp = this.parsePublishedTime(publishedAt);
      } catch (e) {
        console.warn('提取发布时间失败');
      }

      // 构建完整的YouTube URL
      const fullVideoUrl = videoUrl.startsWith('http')
        ? videoUrl
        : `https://www.youtube.com${videoUrl}`;

      // 调试信息
      console.log(`🔍 视频数据提取结果: title="${title}", videoId="${videoId}", videoUrl="${videoUrl}"`);

      // 构建视频数据对象
      const videoData: YouTubeVideoData = {
        id: videoId,
        title: title.trim(),
        channelName: channelHandle, // 暂时使用传入的handle
        channelHandle: channelHandle,
        channelUrl: `https://www.youtube.com/${channelHandle}`,
        videoUrl: fullVideoUrl,
        thumbnailUrl: thumbnailUrl,
        duration: duration.trim(),
        viewCount: viewCount,
        publishedAt: publishedAt.trim(),
        publishedTimestamp: publishedTimestamp,
        scrapedAt: Date.now(),
        taskId: '', // 将在保存时设置
      };

      return videoData;

    } catch (error) {
      console.error('提取视频数据时出错:', error);
      return null;
    }
  }

  /**
   * 从 content-id 类名提取视频ID (新的YouTube页面结构)
   * 基于实际页面结构: ytd-rich-item-renderer > yt-lockup-view-model > div.content-id-*
   */
  private async extractVideoIdFromContentId(videoElement: any): Promise<string | null> {
    try {
      // 方法1: 查找 yt-lockup-view-model 容器内的 div.content-id-* 元素
      const contentIdSelectors = [
        '.yt-lockup-view-model [class*="content-id-"]',
        'yt-lockup-view-model [class*="content-id-"]',
        '[class*="content-id-"]'
      ];

      for (const selector of contentIdSelectors) {
        try {
          const contentIdElement = await videoElement.locator(selector).first();
          const elementExists = await contentIdElement.count() > 0;

          if (elementExists) {
            const className = await contentIdElement.getAttribute('class');
            if (className) {
              const match = className.match(/content-id-([a-zA-Z0-9_-]{11})/);
              if (match && match[1]) {
                console.log(`✅ 使用选择器 "${selector}" 从content-id提取视频ID: ${match[1]}`);
                return match[1];
              }
            }
          }
        } catch (selectorError) {
          console.log(`⚠️ 选择器 "${selector}" 查找content-id失败`);
          continue;
        }
      }

      console.log('⏱️ 所有content-id选择器都未找到匹配元素，继续使用URL方式提取');
      return null;
    } catch (error) {
      console.warn('从content-id提取视频ID失败:', error);
      return null;
    }
  }

  /**
   * 从YouTube URL提取视频ID
   */
  private extractVideoId(url: string): string | null {
    try {
      // 处理各种YouTube URL格式
      // /watch?v=VIDEO_ID
      // /shorts/VIDEO_ID
      // /embed/VIDEO_ID
      const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) return watchMatch[1] || null;

      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1] || null;

      const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1] || null;

      return null;
    } catch (error) {
      console.error('解析视频ID失败:', error);
      return null;
    }
  }

  /**
   * 解析YouTube浏览次数文本为数字
   */
  private parseViewCount(viewText: string): number {
    if (!viewText) return 0;

    try {
      // 移除 "views" 等后缀，处理不同语言
      const cleanText = viewText.toLowerCase()
        .replace(/\s*(views?|次观看|次播放)\s*/g, '')
        .replace(/,/g, '')
        .trim();

      // 处理缩写 (1.2M, 1.5K, 等)
      if (cleanText.includes('k')) {
        return Math.floor(parseFloat(cleanText) * 1000);
      }
      if (cleanText.includes('m')) {
        return Math.floor(parseFloat(cleanText) * 1000000);
      }
      if (cleanText.includes('b')) {
        return Math.floor(parseFloat(cleanText) * 1000000000);
      }

      return parseInt(cleanText) || 0;
    } catch (error) {
      console.error('解析浏览次数失败:', error);
      return 0;
    }
  }

  /**
   * 解析YouTube发布时间文本为时间戳
   */
  private parsePublishedTime(publishedText: string): number | undefined {
    if (!publishedText) return undefined;

    try {
      const now = Date.now();
      const lowerText = publishedText.toLowerCase();

      // 处理相对时间 (如 "2 days ago", "1 week ago")
      if (lowerText.includes('minute') || lowerText.includes('分钟')) {
        const minutes = parseInt(lowerText) || 0;
        return now - (minutes * 60 * 1000);
      }

      if (lowerText.includes('hour') || lowerText.includes('小时')) {
        const hours = parseInt(lowerText) || 0;
        return now - (hours * 60 * 60 * 1000);
      }

      if (lowerText.includes('day') || lowerText.includes('天')) {
        const days = parseInt(lowerText) || 0;
        return now - (days * 24 * 60 * 60 * 1000);
      }

      if (lowerText.includes('week') || lowerText.includes('周')) {
        const weeks = parseInt(lowerText) || 0;
        return now - (weeks * 7 * 24 * 60 * 60 * 1000);
      }

      if (lowerText.includes('month') || lowerText.includes('月')) {
        const months = parseInt(lowerText) || 0;
        return now - (months * 30 * 24 * 60 * 60 * 1000);
      }

      if (lowerText.includes('year') || lowerText.includes('年')) {
        const years = parseInt(lowerText) || 0;
        return now - (years * 365 * 24 * 60 * 60 * 1000);
      }

      return undefined;
    } catch (error) {
      console.error('解析发布时间失败:', error);
      return undefined;
    }
  }

  /**
   * 滚动页面加载更多视频
   */
  async scrollForMoreVideos(): Promise<boolean> {
    try {
      const beforeScrollHeight = await this.page.evaluate(() => document.body.scrollHeight);

      // 滚动到页面底部
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // 等待可能的内容加载
      await new Promise(resolve => setTimeout(resolve, config.spider.youtubeChannel.waitTime));

      const afterScrollHeight = await this.page.evaluate(() => document.body.scrollHeight);

      // 如果页面高度有变化，说明加载了新内容
      const hasNewContent = afterScrollHeight > beforeScrollHeight;

      if (hasNewContent) {
        console.log('✅ 滚动后加载了新内容');
      } else {
        console.log('⚠️ 滚动后没有新内容，可能已到底部');
      }

      return hasNewContent;
    } catch (error) {
      console.error('滚动加载更多视频失败:', error);
      return false;
    }
  }

  /**
   * 导航到频道的视频页面
   */
  async navigateToChannelVideos(channelHandle: string): Promise<boolean> {
    try {
      // 构建频道视频页面URL
      // 支持 @username 和传统的 channel/UC... 格式
      let channelUrl = '';
      if (channelHandle.startsWith('@')) {
        channelUrl = `https://www.youtube.com/${channelHandle}/videos`;
      } else if (channelHandle.startsWith('UC') || channelHandle.startsWith('channel/')) {
        channelUrl = channelHandle.startsWith('channel/')
          ? `https://www.youtube.com/${channelHandle}/videos`
          : `https://www.youtube.com/channel/${channelHandle}/videos`;
      } else {
        // 假设是用户名格式
        channelUrl = `https://www.youtube.com/@${channelHandle}/videos`;
      }

      console.log(`🎥 导航到频道视频页面: ${channelUrl}`);

      await this.page.goto(channelUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000 // 增加超时时间
      });

      // 等待页面稳定
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 检查页面是否可能是频道不存在或被重定向
      const currentUrl = this.page.url();
      console.log(`📍 当前页面URL: ${currentUrl}`);

      // 如果被重定向到404或其他错误页面，直接返回失败
      if (currentUrl.includes('/channel/404') || currentUrl.includes('www.youtube.com/oops')) {
        console.error('❌ 频道不存在或已被删除');
        return false;
      }

      // 检查页面标题，看是否包含错误信息
      const pageTitle = await this.page.title();
      console.log(`📝 页面标题: ${pageTitle}`);

      if (pageTitle.toLowerCase().includes('not found') || pageTitle.includes('找不到') || pageTitle.includes('不存在')) {
        console.error('❌ 页面标题显示频道不存在');
        return false;
      }

      // 扩展的选择器列表，用于检测不同的YouTube页面结构
      const possibleSelectors = [
        this.selectors.videosContainer,
        'ytd-rich-grid-renderer #contents',
        '#contents ytd-rich-grid-renderer',
        '#contents ytd-two-column-browse-results-renderer',
        'ytd-rich-grid-renderer',
        'ytd-two-column-browse-results-renderer',
        '#page-manager ytd-browse',
        'ytd-browse[page-subtype="channels"]',
        '[role="main"] #contents',
        'yt-lockup-view-model', // 新的YouTube视频结构
        'ytd-rich-item-renderer' // 视频容器
      ];

      // 逐一尝试每个选择器
      let containerFound = false;
      for (const selector of possibleSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            console.log(`✅ 找到页面容器: ${selector}`);
            containerFound = true;
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
          continue;
        }
      }

      if (!containerFound) {
        // 如果所有选择器都失败，输出调试信息
        console.error('❌ 所有视频容器选择器都未找到');

        // 输出页面的基本HTML结构用于调试
        const bodyHTML = await this.page.evaluate(() => {
          const body = document.body;
          if (body && body.children.length > 0) {
            // 只获取前几个主要元素的标签名和id/class
            const elements = Array.from(body.children).slice(0, 5);
            return elements.map(el => `${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''}`).join(', ');
          }
          return 'No body elements found';
        });
        console.log(`🔍 页面主要元素: ${bodyHTML}`);

        return false;
      }

      console.log('✅ 频道视频页面加载成功');
      return true;

    } catch (error) {
      console.error('导航到频道视频页面失败:', error);

      // 输出更多调试信息
      try {
        const currentUrl = this.page.url();
        const pageTitle = await this.page.title();
        console.error(`🔍 调试信息 - URL: ${currentUrl}, 标题: ${pageTitle}`);
      } catch (debugError) {
        console.error('无法获取调试信息:', debugError);
      }

      return false;
    }
  }
}