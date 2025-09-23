/**
 * 推文评论选择器
 * 用于提取推文详情页的评论数据
 */

import type { Page } from 'playwright';
import type { CommentData } from '../types';

export class CommentSelectors {
  private readonly selectors = {
    // 评论区域
    commentSection: '[data-testid="cellInnerDiv"]',
    replySection: '[aria-label*="replies" i], [aria-label*="回复" i]',

    // 单个评论容器
    commentContainer: 'article[data-testid="tweet"]',
    commentCell: '[data-testid="cellInnerDiv"]',

    // 评论内容
    commentText: '[data-testid="tweetText"]',
    commentContent: '[lang]', // 备用选择器

    // 用户信息
    userInfo: '[data-testid="User-Name"]',
    userAvatar: '[data-testid="Tweet-User-Avatar"] img',
    userNickname: '[data-testid="User-Name"] span',
    userUsername: '[data-testid="User-Name"] a[href*="@"]',

    // 互动数据
    replyButton: '[data-testid="reply"]',
    retweetButton: '[data-testid="retweet"]',
    likeButton: '[data-testid="like"]',

    // 时间信息
    timeElement: 'time[datetime]',

    // 加载更多
    showMoreReplies: '[role="button"]:has-text("Show"), [role="button"]:has-text("显示")',
    loadMoreButton: '[role="button"]:has-text("Show more replies"), [role="button"]:has-text("显示更多回复")',

    // 页面状态
    noReplies: ':has-text("No replies yet"), :has-text("还没有回复")',
    loadingSpinner: '[data-testid="spinner"]',

    // 回复层级标识
    replyIndicator: '[aria-label*="Replying to"], [aria-label*="回复给"]',
  };

  constructor(private readonly page: Page) {}

  /**
   * 等待评论区域加载
   */
  async waitForCommentsSection(): Promise<void> {
    console.log('等待评论区域加载...');

    try {
      // 等待主要内容加载
      await this.page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 10000 });

      // 等待评论区域出现或确认没有评论
      await Promise.race([
        this.page.waitForSelector(this.selectors.commentContainer, { timeout: 5000 }),
        this.page.waitForSelector(this.selectors.noReplies, { timeout: 5000 }),
        this.page.waitForTimeout(3000) // 最低等待时间
      ]);

      console.log('✅ 评论区域加载完成');
    } catch (error) {
      console.warn('⚠️ 评论区域加载超时，继续处理:', error);
    }
  }

  /**
   * 滚动加载更多评论 - 优化版本：小幅滚动避免评论被滚走
   */
  async scrollToLoadMoreComments(maxScrolls: number = 20): Promise<void> {
    console.log(`开始滚动加载更多评论，最多滚动 ${maxScrolls} 次...`);

    let previousCommentCount = 0;
    let noNewContentCount = 0;
    let bottomStayCount = 0; // 底部停留次数计数器
    let actualScrollCount = 0; // 实际执行的滚动次数

    for (let i = 0; i < maxScrolls; i++) {
      actualScrollCount = i + 1;
      console.log(`第 ${i + 1} 次滚动...`);

      // 记录当前评论数量
      const currentCommentCount = await this.page.$$eval(
        '[data-testid="cellInnerDiv"]',
        (cells) => cells.length
      );

      // 优化滚动策略：每次只滚动1个屏幕高度，避免评论被滚走
      await this.page.evaluate(() => {
        const currentScroll = window.pageYOffset;
        const screenHeight = window.innerHeight;
        // 每次只滚动1个屏幕高度，使用平滑滚动
        const targetScroll = currentScroll + screenHeight;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      });

      // 等待滚动完成和内容加载 - 增加50%等待时间
      await this.page.waitForTimeout(1500);

      // 检查是否有"显示更多回复"按钮并点击
      try {
        const loadMoreButtons = await this.page.$$(this.selectors.loadMoreButton);
        for (const button of loadMoreButtons) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            await button.click();
            console.log(`点击"显示更多回复"按钮 (第${i + 1}次滚动)`);
            await this.page.waitForTimeout(2250);
          }
        }
      } catch (error) {
        console.log('处理"显示更多回复"按钮失败:', error);
      }

      // 稍等一下让内容完全加载 - 增加50%等待时间
      await this.page.waitForTimeout(1500);

      // 检查是否已到达页面底部
      const isAtBottom = await this.page.evaluate(() => {
        const scrollHeight = document.body.scrollHeight;
        const scrollTop = window.pageYOffset;
        const clientHeight = window.innerHeight;
        const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
        // 如果距离底部不到100px，认为已到底部
        console.log(`页面滚动检测: scrollHeight=${scrollHeight}, scrollTop=${scrollTop}, clientHeight=${clientHeight}, 距离底部=${distanceToBottom}px`);
        return distanceToBottom <= 100;
      });

      if (isAtBottom) {
        bottomStayCount++;
        console.log(`检测到页面底部，底部停留次数: ${bottomStayCount}/3`);

        if (bottomStayCount >= 3) {
          console.log('🔴 连续3次检测到底部，结束滚动 (底部检测触发)');
          break;
        }

        // 在底部等待5秒，给页面更多时间加载
        console.log('在底部等待5秒，等待可能的内容加载...');
        await this.page.waitForTimeout(5000);

        // 重新检查是否还在底部
        const stillAtBottom = await this.page.evaluate(() => {
          const scrollHeight = document.body.scrollHeight;
          const scrollTop = window.pageYOffset;
          const clientHeight = window.innerHeight;
          return (scrollTop + clientHeight) >= (scrollHeight - 100);
        });

        if (!stillAtBottom) {
          console.log('页面高度发生变化，有新内容加载，重置底部计数器');
          bottomStayCount = 0;
        }
      } else {
        // 不在底部，重置底部停留计数器
        bottomStayCount = 0;
      }

      // 检查是否有新内容加载
      const newCommentCount = await this.page.$$eval(
        '[data-testid="cellInnerDiv"]',
        (cells) => cells.length
      );

      if (newCommentCount <= previousCommentCount) {
        noNewContentCount++;
        console.log(`第 ${i + 1} 次滚动没有新内容，当前评论元素: ${newCommentCount}`);

        // 如果连续10次没有新内容，提前结束
        if (noNewContentCount >= 10) {
          console.log('🔴 连续10次滚动无新内容，结束滚动 (无新内容触发)');
          break;
        }
      } else {
        noNewContentCount = 0;
        console.log(`第 ${i + 1} 次滚动加载了新内容: ${previousCommentCount} -> ${newCommentCount}`);
      }

      previousCommentCount = newCommentCount;

      // 检查是否还有加载中的元素
      const isLoading = await this.page.$(this.selectors.loadingSpinner);
      if (isLoading) {
        await this.page.waitForSelector(this.selectors.loadingSpinner, {
          state: 'hidden',
          timeout: 3000
        }).catch(() => {
          console.log('等待加载完成超时，继续处理');
        });
      }
    }

    console.log(`✅ 评论滚动加载完成，实际执行了 ${actualScrollCount}/${maxScrolls} 次滚动`);
  }

  /**
   * 获取所有评论元素 - 基于语义化选择器的鲁棒方案
   */
  async getCommentElements(): Promise<any[]> {
    console.log('获取页面中的所有评论元素...');

    try {
      // 使用更鲁棒的语义化选择器，并过滤掉原推文
      const commentElements = await this.page.$$eval(
        'body',
        () => {
          // 首先尝试找到对话时间线容器
          const timelineContainer = document.querySelector('[aria-label*="Timeline" i][aria-label*="Conversation" i], [aria-label*="时间线" i][aria-label*="对话" i]');

          let searchContainer = timelineContainer || document.body;
          console.log('搜索容器:', timelineContainer ? 'Timeline容器' : 'document.body');

          // 找到progressbar分隔符，这个元素下方才是评论区域
          const progressBar = document.querySelector('[role="progressbar"]');
          let progressBarIndex = -1;

          // 获取所有可能的内容单元
          const allCells = Array.from(searchContainer.querySelectorAll('[data-testid="cellInnerDiv"], article, [role="article"]'));

          // 如果找到了progressbar，计算它在所有元素中的位置
          if (progressBar) {
            for (let i = 0; i < allCells.length; i++) {
              if (allCells[i]?.contains(progressBar) || allCells[i] === progressBar) {
                progressBarIndex = i;
                console.log(`找到progressbar分隔符，位置: ${i}`);
                break;
              }
            }
          }

          return allCells
            .map((cell, index) => ({ element: cell, index }))
            .filter(({ element, index }) => {
              // 如果找到了progressbar，只处理它后面的元素（真正的评论）
              if (progressBarIndex >= 0 && index <= progressBarIndex) {
                console.log(`跳过progressbar之前的元素 (index: ${index})`);
                return false;
              }
              // 更智能的内容识别 - 基于语义而不是具体DOM结构
              const textContent = element.textContent?.trim() || '';

              // 排除明显的非评论内容
              if (!textContent) return false;
              if (textContent.includes('Show more replies') || textContent.includes('显示更多回复')) return false;
              if (textContent.includes('Advertisement') || textContent.includes('广告')) return false;
              if (element.querySelector('[data-testid="promotedIndicator"]')) return false;

              // 排除原推文相关元素
              if (element.querySelector('[role="progressbar"]')) return false;
              if (element.querySelector('[data-testid="tweet"]') && !element.querySelector('[data-testid="reply"]')) {
                // 可能是原推文，进一步检查
                console.log('可能发现原推文，跳过');
                return false;
              }

              // 检查是否包含用户相关信息的多种方式
              const hasUserIndicators = (
                element.querySelector('[data-testid="User-Name"]') ||
                element.querySelector('[aria-label*="@" i]') ||
                element.querySelector('a[href*="/@"]') ||
                (element.querySelector('a[href*="/"]') as HTMLAnchorElement)?.href?.includes('/') ||
                // 检查是否有头像图片
                element.querySelector('img[src*="profile"]') ||
                element.querySelector('[data-testid*="avatar" i]') ||
                element.querySelector('[data-testid="Tweet-User-Avatar"]')
              );

              // 检查是否包含内容文本的多种方式
              const hasContentIndicators = (
                element.querySelector('[data-testid="tweetText"]') ||
                element.querySelector('[lang]') ||
                element.querySelector('div[dir]') ||
                // 通过内容长度判断（评论通常有一定长度）
                (textContent.length > 10 && textContent.length < 2000)
              );

              // 检查是否有交互按钮的多种方式
              const hasInteractionIndicators = (
                element.querySelector('[data-testid="reply"]') ||
                element.querySelector('[data-testid="like"]') ||
                element.querySelector('[aria-label*="reply" i]') ||
                element.querySelector('[aria-label*="like" i]') ||
                element.querySelector('[aria-label*="回复" i]') ||
                element.querySelector('[aria-label*="喜欢" i]') ||
                element.querySelector('button[aria-label]')
              );

              // 检查是否有时间信息
              const hasTimeIndicators = (
                element.querySelector('time[datetime]') ||
                element.querySelector('[datetime]') ||
                // 时间格式文本模式匹配
                /\d+[hms]|\d+小时|\d+分钟|\d+秒/.test(textContent) ||
                /\d{1,2}:\d{2}/.test(textContent)
              );

              // 更宽松的条件组合：满足任意2个或以上指标即可
              const indicators = [
                hasUserIndicators,
                hasContentIndicators,
                hasInteractionIndicators,
                hasTimeIndicators
              ];

              const indicatorCount = indicators.filter(Boolean).length;
              const isLikelyComment = indicatorCount >= 2;

              // 特殊情况：如果有明确的推文容器，降低要求
              const hasTweetContainer = element.querySelector('article[data-testid="tweet"]');
              const isDefinitelyComment = hasTweetContainer && hasUserIndicators && hasContentIndicators;

              const result = isLikelyComment || isDefinitelyComment;

              // 调试日志
              if (textContent.length > 10) {
                console.log(`评论识别: ${result ? '✅通过' : '❌过滤'}`, {
                  content: textContent.substring(0, 60) + '...',
                  indicators: { hasUserIndicators, hasContentIndicators, hasInteractionIndicators, hasTimeIndicators },
                  indicatorCount,
                  hasTweetContainer,
                  isLikelyComment,
                  isDefinitelyComment
                });
              }

              return result;
            });
        }
      );

      console.log(`找到 ${commentElements.length} 个可能的评论元素`);
      return commentElements;
    } catch (error) {
      console.error('获取评论元素失败:', error);
      return [];
    }
  }

  /**
   * 从评论元素提取数据
   */
  async extractCommentData(elementIndex: number, tweetId: string): Promise<CommentData | null> {
    try {
      const commentData = await this.page.evaluate(
        ({ index, tweetId }) => {
          // 使用与新过滤逻辑一致的方法获取元素
          const timelineContainer = document.querySelector('[aria-label*="Timeline" i][aria-label*="Conversation" i], [aria-label*="时间线" i][aria-label*="对话" i]');
          const searchContainer = timelineContainer || document.body;
          const allCells = Array.from(searchContainer.querySelectorAll('[data-testid="cellInnerDiv"], article, [role="article"]'));

          const cell = allCells[index];
          if (!cell) return null;

          const textContent = cell.textContent?.trim() || '';

          // 使用与过滤逻辑相同的验证条件
          if (!textContent) return null;
          if (textContent.includes('Show more replies') || textContent.includes('显示更多回复')) return null;
          if (textContent.includes('Advertisement') || textContent.includes('广告')) return null;
          if (cell.querySelector('[data-testid="promotedIndicator"]')) return null;

          // 检查是否符合评论标准（简化版，因为已经通过了过滤）
          const hasBasicContent = textContent.length > 10 && textContent.length < 2000;
          if (!hasBasicContent) return null;

          // 提取评论ID（从URL或其他标识）
          let commentId = '';
          const timeElement = cell.querySelector('time[datetime]');
          if (timeElement) {
            const timeLink = timeElement.closest('a');
            if (timeLink && timeLink.href) {
              const match = timeLink.href.match(/\/status\/(\d+)/);
              if (match && match[1]) {
                commentId = match[1];
              }
            }
          }

          // 智能内容提取 - 优先级选择器
          let content = '';

          // 尝试标准选择器
          const contentElement = cell.querySelector('[data-testid="tweetText"]');
          if (contentElement) {
            content = contentElement.textContent || '';
          } else {
            // 尝试语言属性选择器
            const langElement = cell.querySelector('[lang]');
            if (langElement && langElement.textContent?.trim()) {
              content = langElement.textContent.trim();
            } else {
              // 尝试方向属性选择器
              const dirElement = cell.querySelector('div[dir]');
              if (dirElement && dirElement.textContent?.trim()) {
                content = dirElement.textContent.trim();
              } else {
                // 最后尝试通过文本长度筛选合适的div
                const textDivs = Array.from(cell.querySelectorAll('div')).filter(div => {
                  const text = div.textContent?.trim() || '';
                  return text.length > 10 && text.length < 500 &&
                         !text.includes('Show more') &&
                         !text.includes('显示更多');
                });
                if (textDivs.length > 0) {
                  // 选择文本最长的div作为内容
                  content = textDivs.reduce((longest, current) =>
                    (current.textContent?.length || 0) > (longest.textContent?.length || 0) ? current : longest
                  ).textContent || '';
                }
              }
            }
          }

          // 清理内容：移除不必要的空格和换行
          content = content.replace(/\s+/g, ' ').trim();

          // 如果没找到ID，生成一个基于内容的ID
          if (!commentId) {
            const user = cell.querySelector('[data-testid="User-Name"] a')?.textContent ||
                        cell.querySelector('a[href*="/"]')?.textContent ||
                        'unknown';
            const contentHash = btoa(encodeURIComponent(user + content)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
            commentId = `${tweetId}_${contentHash}`;
          }

          // 智能用户信息提取
          let authorNickname = '';
          let authorUsername = '';

          // 方法1：标准User-Name选择器
          const userNameElement = cell.querySelector('[data-testid="User-Name"]');
          if (userNameElement) {
            const userSpans = userNameElement.querySelectorAll('span');
            if (userSpans.length > 0 && userSpans[0]) {
              authorNickname = userSpans[0].textContent?.trim() || '';
            }

            const usernameLink = userNameElement.querySelector('a[href*="/"]');
            if (usernameLink) {
              const href = usernameLink.getAttribute('href');
              if (href) {
                const match = href.match(/\/([^\/\?#]+)$/);
                if (match && match[1]) {
                  authorUsername = match[1];
                }
              }
            }
          }

          // 方法2：如果标准方法失败，尝试其他方式
          if (!authorNickname || !authorUsername) {
            // 查找包含@符号的链接
            const atLinks = Array.from(cell.querySelectorAll('a[href*="/"]')).filter(link =>
              (link as HTMLAnchorElement).href.includes('/') && !(link as HTMLAnchorElement).href.includes('/status/')
            );

            if (atLinks.length > 0) {
              const userLink = atLinks[0];
              if (userLink) {
                const href = userLink.getAttribute('href');
                if (href) {
                  const match = href.match(/\/([^\/\?#]+)$/);
                  if (match && match[1] && !authorUsername) {
                    authorUsername = match[1];
                  }
                }

                if (!authorNickname && userLink.textContent?.trim()) {
                  authorNickname = userLink.textContent.trim();
                }
              }
            }

            // 方法3：从头像alt文本或aria-label获取
            if (!authorNickname) {
              const avatarImg = cell.querySelector('img[alt], img[aria-label]');
              if (avatarImg) {
                const alt = avatarImg.getAttribute('alt') || avatarImg.getAttribute('aria-label');
                if (alt && alt.includes('profile')) {
                  authorNickname = alt.replace(/profile|image|photo/gi, '').trim();
                }
              }
            }
          }

          // 智能头像提取
          let authorProfileImage = '';
          const avatarImg = cell.querySelector('[data-testid="Tweet-User-Avatar"] img') ||
                           cell.querySelector('img[src*="profile"]') ||
                           cell.querySelector('img[alt*="profile" i]') ||
                           cell.querySelector('img[src*="pbs.twimg.com"]');
          if (avatarImg) {
            authorProfileImage = (avatarImg as HTMLImageElement).src || '';
          }

          // 智能互动数据提取
          let replyCount = 0;
          let likeCount = 0;

          // 提取回复数的多种方法
          const extractCount = (element: Element | null | undefined) => {
            if (!element) return 0;
            const text = element.textContent || element.getAttribute('aria-label') || '';
            const match = text.match(/(\d+)/);
            return match && match[1] ? parseInt(match[1]) : 0;
          };

          // 尝试提取回复数
          const replyButton = cell.querySelector('[data-testid="reply"]') ||
                             cell.querySelector('[aria-label*="reply" i]') ||
                             cell.querySelector('[aria-label*="回复" i]') ||
                             cell.querySelector('button[aria-label]');
          replyCount = extractCount(replyButton);

          // 尝试提取点赞数
          const likeButton = cell.querySelector('[data-testid="like"]') ||
                            cell.querySelector('[aria-label*="like" i]') ||
                            cell.querySelector('[aria-label*="喜欢" i]') ||
                            Array.from(cell.querySelectorAll('button[aria-label]')).find(btn =>
                              btn.getAttribute('aria-label')?.toLowerCase().includes('like')
                            );
          likeCount = extractCount(likeButton);

          // 提取时间
          let publishedAt = Date.now();
          if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
              publishedAt = new Date(datetime).getTime();
            }
          }

          // 检查是否为回复
          const isReply = cell.querySelector('[aria-label*="Replying to"], [aria-label*="回复给"]') !== null;

          // 获取父评论ID（如果是回复）
          let parentCommentId = '';
          if (isReply) {
            const replyIndicator = cell.querySelector('[aria-label*="Replying to"], [aria-label*="回复给"]');
            if (replyIndicator) {
              // 这里可能需要更复杂的逻辑来确定父评论ID
              // 暂时留空，后续可以根据需要完善
            }
          }

          return {
            commentId,
            content,
            authorUsername,
            authorNickname,
            authorProfileImage,
            replyCount,
            likeCount,
            publishedAt,
            scrapedAt: Date.now(),
            isReply,
            parentCommentId: parentCommentId || undefined,
            tweetId, // Add the tweetId to the returned data
          };
        },
        { index: elementIndex, tweetId }
      );

      if (!commentData || !commentData.commentId || !commentData.content) {
        return null;
      }

      console.log(`提取评论成功: ${commentData.authorUsername} - ${commentData.content.substring(0, 50)}...`);
      return commentData as CommentData;

    } catch (error) {
      console.error(`提取评论数据失败 (索引 ${elementIndex}):`, error);
      return null;
    }
  }

  /**
   * 获取所有评论数据
   */
  async extractAllComments(tweetId: string): Promise<CommentData[]> {
    console.log('开始提取所有评论数据...');

    const comments: CommentData[] = [];
    const commentElements = await this.getCommentElements();

    if (commentElements.length === 0) {
      console.log('没有找到评论元素');
      return comments;
    }

    console.log(`准备处理 ${commentElements.length} 个评论元素`);

    // 排重用的Set，基于"用户名+内容"
    const seenComments = new Set<string>();

    for (let i = 0; i < commentElements.length; i++) {
      try {
        const commentData = await this.extractCommentData(i, tweetId);
        if (commentData) {
          // 生成排重键：用户名+内容的组合
          const dedupeKey = `${commentData.authorUsername}:${commentData.content}`;

          if (!seenComments.has(dedupeKey)) {
            seenComments.add(dedupeKey);
            comments.push(commentData);
          } else {
            console.log(`发现重复评论，已排除: ${commentData.authorUsername} - ${commentData.content.slice(0, 50)}...`);
          }
        }
      } catch (error) {
        console.error(`处理评论 ${i} 失败:`, error);
        continue;
      }

      // 添加小延迟避免过快处理
      if (i % 10 === 0) {
        await this.page.waitForTimeout(100);
      }
    }

    console.log(`评论提取完成，共获得 ${comments.length} 条有效评论 (从 ${commentElements.length} 个元素中去重后)`);
    return comments;
  }

  /**
   * 检查是否有评论
   */
  async hasComments(): Promise<boolean> {
    try {
      const noRepliesElement = await this.page.$(this.selectors.noReplies);
      if (noRepliesElement) {
        return false;
      }

      const commentElements = await this.page.$$(this.selectors.commentContainer);
      return commentElements.length > 0;
    } catch (error) {
      console.error('检查评论存在失败:', error);
      return false;
    }
  }

  /**
   * 获取评论总数估计
   */
  async getEstimatedCommentCount(): Promise<number> {
    try {
      const commentElements = await this.page.$$(this.selectors.commentContainer);
      return commentElements.length;
    } catch (error) {
      console.error('获取评论数量失败:', error);
      return 0;
    }
  }
}