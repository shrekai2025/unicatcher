import { NextRequest, NextResponse } from 'next/server';

/**
 * 推文URL解析API
 * POST /api/tweet-processor/parse-url
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[推文URL解析API] 收到请求');

    // 解析请求体
    const body = await request.json();
    const { url } = body;

    // 验证必需参数
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing or invalid url' }
        },
        { status: 400 }
      );
    }

    console.log(`[推文URL解析API] 解析URL: ${url}`);

    // 解析推文URL
    const tweetId = extractTweetId(url);

    if (!tweetId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid Twitter/X URL format' }
        },
        { status: 400 }
      );
    }

    console.log(`[推文URL解析API] 提取的推文ID: ${tweetId}`);

    return NextResponse.json({
      success: true,
      data: {
        originalUrl: url,
        tweetId: tweetId,
        normalizedUrl: `https://x.com/i/status/${tweetId}`
      }
    });

  } catch (error) {
    console.error('[推文URL解析API] 处理失败:', error);

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
 * 从推文URL中提取推文ID
 * 支持多种URL格式：
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/username/status/1234567890
 * - https://mobile.twitter.com/username/status/1234567890
 * - https://x.com/i/status/1234567890
 */
function extractTweetId(url: string): string | null {
  try {
    // 清理URL，移除查询参数和锚点
    const cleanUrl = url.split('?')[0]?.split('#')[0];
    if (!cleanUrl) return null;

    // 支持的域名模式
    const domainPatterns = [
      'x.com',
      'twitter.com',
      'mobile.twitter.com',
      'www.twitter.com',
      'www.x.com'
    ];

    // 检查是否是支持的域名
    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.toLowerCase();

    if (!domainPatterns.includes(hostname)) {
      return null;
    }

    // 提取推文ID的正则表达式
    // 匹配 /status/数字 或 /i/status/数字 格式
    const statusMatch = cleanUrl.match(/\/(?:i\/)?status\/(\d+)/i);

    if (statusMatch && statusMatch[1]) {
      const tweetId = statusMatch[1];

      // 验证推文ID格式（应该是纯数字，长度在10-20位之间）
      if (/^\d{10,20}$/.test(tweetId)) {
        return tweetId;
      }
    }

    return null;
  } catch (error) {
    console.error('URL解析错误:', error);
    return null;
  }
}