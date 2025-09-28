import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { db } from '~/server/db';

/**
 * X Helper 推文处理接口
 * POST /api/external/x-helper/process-tweet
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[X Helper API] 收到推文处理请求');

    // 验证API密钥
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || apiKey !== 'unicatcher-api-key-demo') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const {
      tweetUrl,
      translationAIProvider = 'openai',
      translationAIModel = 'gpt-4o',
      commentAIProvider = 'openai',
      commentAIModel = 'gpt-4o',
      userExtraInfo = '',
      systemPrompt = ''
    } = body;

    // 验证必需参数
    if (!tweetUrl || typeof tweetUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid tweetUrl' }
        },
        { status: 400 }
      );
    }

    // 验证AI提供商
    if (!['openai', 'openai-badger', 'zhipu', 'anthropic'].includes(translationAIProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid translationAIProvider: must be openai|openai-badger|zhipu|anthropic' }
        },
        { status: 400 }
      );
    }

    if (!['openai', 'openai-badger', 'zhipu', 'anthropic'].includes(commentAIProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Invalid commentAIProvider: must be openai|openai-badger|zhipu|anthropic' }
        },
        { status: 400 }
      );
    }

    // 从URL中提取推文ID
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch || !tweetIdMatch[1]) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TWEET_URL', message: 'Invalid tweet URL format' }
        },
        { status: 400 }
      );
    }

    const tweetId = tweetIdMatch[1];
    console.log(`[X Helper API] 处理推文: ${tweetId}`);

    // 创建任务记录
    const task = await db.tweetProcessTask.create({
      data: {
        tweetId,
        tweetUrl,
        taskType: 'x_helper_process',
        status: 'queued',
        userExtraInfo,
        startedAt: new Date(),
      }
    });

    console.log(`[X Helper API] 创建任务: ${task.id}`);

    // 异步处理推文
    processTweetAsync(task.id, tweetUrl, tweetId, translationAIProvider, translationAIModel, commentAIProvider, commentAIModel, userExtraInfo, systemPrompt)
      .catch(error => {
        console.error(`[X Helper API] 异步处理失败:`, error);
        // 更新任务状态为失败
        db.tweetProcessTask.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          }
        }).catch(updateError => {
          console.error(`[X Helper API] 更新任务状态失败:`, updateError);
        });
      });

    return NextResponse.json({
      success: true,
      message: '推文处理任务已创建',
      data: {
        taskId: task.id,
        tweetId,
        tweetUrl,
        status: 'queued'
      }
    });

  } catch (error) {
    console.error('[X Helper API] 处理失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal Server Error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * 异步处理推文的完整流程
 */
async function processTweetAsync(
  taskId: string,
  tweetUrl: string,
  tweetId: string,
  translationAIProvider: string,
  translationAIModel: string,
  commentAIProvider: string,
  commentAIModel: string,
  userExtraInfo: string,
  systemPrompt: string
) {
  console.log(`[X Helper Async] 开始处理任务: ${taskId}`);

  try {
    // 更新任务状态为处理中
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: { status: 'running' }
    });

    // 1. 爬取推文内容
    console.log(`[X Helper Async] === 第1步：开始爬取推文内容 ===`);
    console.log(`[X Helper Async] 目标URL: ${tweetUrl}`);
    console.log(`[X Helper Async] 任务ID: ${taskId}`);

    const startTime = Date.now();
    const tweetData = await scrapeTweetData(tweetUrl);
    const scrapeTime = Date.now() - startTime;

    console.log(`[X Helper Async] ✅ 爬取完成，耗时: ${scrapeTime}ms`);
    console.log(`[X Helper Async] 推文长度: ${tweetData.content.length}字符`);
    console.log(`[X Helper Async] 作者: ${tweetData.authorNickname} (@${tweetData.authorUsername})`);

    // 更新任务数据
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: {
        tweetContent: tweetData.content,
        authorUsername: tweetData.authorUsername,
        authorNickname: tweetData.authorNickname,
        authorProfileImage: tweetData.authorProfileImage,
      }
    });

    console.log(`[X Helper Async] ✅ 推文数据已保存到数据库`);

    // 2. 翻译推文
    console.log(`[X Helper Async] === 第2步：开始翻译推文 ===`);
    console.log(`[X Helper Async] 翻译供应商: ${translationAIProvider}`);
    console.log(`[X Helper Async] 翻译模型: ${translationAIModel}`);
    const translationResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/external/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'unicatcher-api-key-demo'
      },
      body: JSON.stringify({
        content: tweetData.content,
        targetLanguage: 'zh-CN',
        aiProvider: translationAIProvider,
        aiModel: translationAIModel
      })
    });

    if (!translationResponse.ok) {
      const errorBody = await translationResponse.text();
      console.error(`[X Helper Async] ❌ 翻译API调用失败: ${translationResponse.status}`);
      console.error(`[X Helper Async] 错误响应: ${errorBody}`);
      throw new Error(`翻译失败: ${translationResponse.status} - ${errorBody}`);
    }

    const translationResult = await translationResponse.json();
    const translatedContent = translationResult.data?.translatedContent || '';

    console.log(`[X Helper Async] ✅ 翻译成功`);
    console.log(`[X Helper Async] 原文长度: ${tweetData.content.length}字符`);
    console.log(`[X Helper Async] 译文长度: ${translatedContent.length}字符`);
    console.log(`[X Helper Async] 译文预览: ${translatedContent.substring(0, 100)}...`);

    // 更新翻译结果
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: { translatedContent }
    });

    console.log(`[X Helper Async] ✅ 翻译结果已保存到数据库`);

    // 3. 生成AI评论（不参考现有评论）
    console.log(`[X Helper Async] === 第3步：开始生成AI评论 ===`);
    console.log(`[X Helper Async] 评论供应商: ${commentAIProvider}`);
    console.log(`[X Helper Async] 评论模型: ${commentAIModel}`);
    console.log(`[X Helper Async] 系统提示词: ${systemPrompt ? '已设置' : '使用默认'}`);
    console.log(`[X Helper Async] 用户信息: ${userExtraInfo ? '已提供' : '无'}`);
    console.log(`[X Helper Async] 参考现有评论: false`);
    const commentsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/external/generate-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'unicatcher-api-key-demo'
      },
      body: JSON.stringify({
        tweetId,
        content: tweetData.content,
        aiProvider: commentAIProvider,
        aiModel: commentAIModel,
        includeExistingComments: false,
        userInfo: userExtraInfo,
        systemPrompt: systemPrompt,
        commentLength: 'medium',
        commentCount: 3,
        language: 'zh-CN'
      })
    });

    if (!commentsResponse.ok) {
      const errorBody = await commentsResponse.text();
      console.error(`[X Helper Async] ❌ AI评论生成API调用失败: ${commentsResponse.status}`);
      console.error(`[X Helper Async] 错误响应: ${errorBody}`);
      throw new Error(`AI评论生成失败: ${commentsResponse.status} - ${errorBody}`);
    }

    const commentsResult = await commentsResponse.json();
    const generatedComments = commentsResult.data?.comments || [];
    const aiComments = JSON.stringify(generatedComments);

    console.log(`[X Helper Async] ✅ AI评论生成成功`);
    console.log(`[X Helper Async] 生成评论数量: ${generatedComments.length}条`);
    if (generatedComments.length > 0) {
      const firstComment = generatedComments[0];
      const commentText = typeof firstComment === 'string' ? firstComment : firstComment?.content || JSON.stringify(firstComment);
      console.log(`[X Helper Async] 第一条评论预览: ${commentText.substring(0, 50)}...`);
    }

    // 更新AI评论结果
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: {
        aiComments,
        status: 'completed',
        completedAt: new Date(),
        result: JSON.stringify({
          success: true,
          tweetContent: tweetData.content,
          translatedContent,
          aiCommentsCount: generatedComments.length
        })
      }
    });

    console.log(`[X Helper Async] ✅ 任务完成: ${taskId}`);
    console.log(`[X Helper Async] === 完成统计 ===`);
    console.log(`[X Helper Async] - 推文爬取: ✅ (${tweetData.content.length}字符)`);
    console.log(`[X Helper Async] - 内容翻译: ✅ (${translatedContent.length}字符)`);
    console.log(`[X Helper Async] - 评论生成: ✅ (${generatedComments.length}条)`);
    console.log(`[X Helper Async] - 总耗时: ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error(`[X Helper Async] 任务失败: ${taskId}`, error);

    // 更新任务状态为失败
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      }
    });
  }
}

/**
 * 爬取推文数据
 */
async function scrapeTweetData(tweetUrl: string) {
  console.log(`[Scraper] 开始初始化浏览器`);
  const browser = await chromium.launch({
    headless: true,
    timeout: 60000 // 增加浏览器启动超时时间
  });

  console.log(`[Scraper] 创建浏览器上下文`);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  console.log(`[Scraper] 创建页面完成`);

  try {
    console.log(`[Scraper] 开始访问推文页面: ${tweetUrl}`);

    // 设置页面超时处理
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);

    // 分步骤访问，先尝试基本页面加载
    console.log(`[Scraper] Step 1: 基本页面导航`);
    await page.goto(tweetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log(`[Scraper] 页面基本加载完成`);

    // 等待网络空闲
    console.log(`[Scraper] Step 2: 等待网络稳定`);
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log(`[Scraper] 网络已稳定`);
    } catch (networkError) {
      const errorMessage = networkError instanceof Error ? networkError.message : String(networkError);
      console.warn(`[Scraper] 网络稳定等待超时，继续执行: ${errorMessage}`);
    }

    // 等待推文内容加载
    console.log(`[Scraper] Step 3: 等待推文内容元素`);
    const tweetSelectors = [
      '[data-testid="tweetText"]',
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]',
      '[data-testid="tweetText"] span',
      'div[data-testid="tweetText"]'
    ];

    let foundSelector = null;
    for (const selector of tweetSelectors) {
      try {
        console.log(`[Scraper] 尝试选择器: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        foundSelector = selector;
        console.log(`[Scraper] 找到推文内容选择器: ${selector}`);
        break;
      } catch (error) {
        console.log(`[Scraper] 选择器 ${selector} 未找到，继续尝试下一个`);
      }
    }

    if (!foundSelector) {
      console.error(`[Scraper] 所有推文选择器都未找到，尝试获取页面基本信息`);
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`[Scraper] 页面标题: ${pageTitle}`);
      console.log(`[Scraper] 当前URL: ${pageUrl}`);

      // 尝试截图调试
      try {
        const screenshot = await page.screenshot({ type: 'png' });
        console.log(`[Scraper] 截图大小: ${screenshot.length} bytes`);
      } catch (screenshotError) {
        const errorMessage = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
        console.error(`[Scraper] 截图失败: ${errorMessage}`);
      }
    }

    // 提取推文内容
    console.log(`[Scraper] Step 4: 提取推文内容`);
    const tweetContent = await page.evaluate(() => {
      // 尝试多种选择器获取推文内容
      const selectors = [
        '[data-testid="tweetText"]',
        'article[data-testid="tweet"] div[lang]',
        'div[data-testid="tweetText"] span',
        '[data-testid="tweet"] div[lang] span'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim()) {
          console.log(`[Browser] 找到内容，选择器: ${selector}`);
          return element.textContent.trim();
        }
      }

      console.log(`[Browser] 所有选择器都未找到有效内容`);
      return '';
    });

    console.log(`[Scraper] 提取的推文内容长度: ${tweetContent.length}`);
    if (tweetContent) {
      console.log(`[Scraper] 推文内容预览: ${tweetContent.substring(0, 100)}...`);
    }

    // 提取作者信息
    console.log(`[Scraper] Step 5: 提取作者信息`);
    const authorInfo = await page.evaluate(() => {
      // 尝试多种作者选择器
      const authorSelectors = [
        '[data-testid="User-Name"]',
        'article[data-testid="tweet"] div[data-testid="User-Name"]',
        'div[data-testid="User-Name"]'
      ];

      const avatarSelectors = [
        '[data-testid="Tweet-User-Avatar"] img',
        'article[data-testid="tweet"] img[alt*="avatar"]',
        'img[data-testid="Tweet-User-Avatar"]'
      ];

      let nickname = '';
      let username = '';
      let profileImage = '';

      // 查找作者名称
      for (const selector of authorSelectors) {
        const authorElement = document.querySelector(selector);
        if (authorElement) {
          const nicknameEl = authorElement.querySelector('div > div > div > span') ||
                           authorElement.querySelector('span');
          const usernameEl = authorElement.querySelector('div > div:nth-child(2) > div > span') ||
                           authorElement.querySelector('span:nth-child(2)');

          if (nicknameEl) nickname = nicknameEl.textContent?.trim() || '';
          if (usernameEl) username = usernameEl.textContent?.trim()?.replace('@', '') || '';

          if (nickname || username) break;
        }
      }

      // 查找头像
      for (const selector of avatarSelectors) {
        const avatarElement = document.querySelector(selector);
        if (avatarElement) {
          profileImage = avatarElement.getAttribute('src') || '';
          if (profileImage) break;
        }
      }

      console.log(`[Browser] 作者信息 - 昵称: ${nickname}, 用户名: ${username}, 头像: ${profileImage ? '已找到' : '未找到'}`);

      return {
        nickname,
        username,
        profileImage
      };
    });

    console.log(`[Scraper] 作者信息: ${authorInfo.nickname} (@${authorInfo.username})`);
    console.log(`[Scraper] 头像URL: ${authorInfo.profileImage ? '已获取' : '未获取'}`);

    if (!tweetContent) {
      const errorMsg = `无法获取推文内容。页面标题: ${await page.title()}, URL: ${page.url()}`;
      console.error(`[Scraper] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[Scraper] ✅ 推文内容获取成功: ${tweetContent.substring(0, 50)}...`);
    console.log(`[Scraper] ✅ 作者信息: ${authorInfo.nickname} (@${authorInfo.username})`);
    console.log(`[Scraper] ✅ 数据提取完成`);

    return {
      content: tweetContent,
      authorUsername: authorInfo.username,
      authorNickname: authorInfo.nickname,
      authorProfileImage: authorInfo.profileImage
    };

  } catch (error) {
    console.error(`[Scraper] ❌ 爬取过程发生错误:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Scraper] 错误详情: ${errorMessage}`);

    // 尝试获取更多调试信息
    try {
      const pageTitle = await page.title();
      const pageUrl = page.url();
      const content = await page.content();
      console.error(`[Scraper] 调试信息 - 标题: ${pageTitle}, URL: ${pageUrl}, HTML长度: ${content.length}`);
    } catch (debugError) {
      const errorMessage = debugError instanceof Error ? debugError.message : String(debugError);
      console.error(`[Scraper] 无法获取调试信息: ${errorMessage}`);
    }

    throw error;
  } finally {
    console.log(`[Scraper] 清理资源，关闭浏览器`);
    try {
      await browser.close();
      console.log(`[Scraper] 浏览器已关闭`);
    } catch (closeError) {
      const errorMessage = closeError instanceof Error ? closeError.message : String(closeError);
      console.error(`[Scraper] 关闭浏览器失败: ${errorMessage}`);
    }
  }
}