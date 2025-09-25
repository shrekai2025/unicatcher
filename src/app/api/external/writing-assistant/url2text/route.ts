import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n.mavae.ai/webhook/ec6f55d2-070e-4ab7-9ae4-dbfef651a5fb';
const TIMEOUT_MS = 30 * 1000; // 30秒超时

// API密钥验证
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey === 'unicatcher-api-key-demo';
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
    },
    { status: 401 }
  );
}

interface ConversionRequest {
  url: string;
  authToken: string;
}

interface ConversionResult {
  title: string;
  author: string;
  content: string;
}

// Webhook实际返回的格式
interface WebhookResponse {
  author?: string;
  title?: string;
  text?: string;
  error?: string;
}

// POST - URL转文本（外部API）
export async function POST(request: NextRequest) {
  try {
    // 验证API密钥
    if (!validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body: ConversionRequest = await request.json();
    const { url, authToken } = body;

    // 参数验证
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: '缺少或无效的URL参数' }
        },
        { status: 400 }
      );
    }

    if (!authToken || typeof authToken !== 'string' || authToken.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: '缺少或无效的认证Token' }
        },
        { status: 400 }
      );
    }

    // URL格式验证
    let validUrl: URL;
    try {
      validUrl = new URL(url.trim());
      if (!validUrl.protocol.startsWith('http')) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_URL', message: '无效的URL格式' }
        },
        { status: 400 }
      );
    }

    // 创建带超时的fetch控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // 调用外部Webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: validUrl.toString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 解析响应数据
      let webhookData: WebhookResponse;
      try {
        webhookData = await response.json();
      } catch (parseError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_RESPONSE',
              message: '外部服务返回的数据格式无效'
            }
          },
          { status: 502 }
        );
      }

      // 检查是否有错误
      if (webhookData.error && webhookData.error !== '') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONVERSION_ERROR',
              message: webhookData.error
            }
          },
          { status: 400 }
        );
      }

      // 检查响应状态
      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'WEBHOOK_UNAUTHORIZED', message: '外部服务认证失败，请检查authToken是否正确' }
            },
            { status: 401 }
          );
        } else if (response.status === 404) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'WEBHOOK_NOT_FOUND', message: 'Webhook服务未找到或未激活，请检查服务状态' }
            },
            { status: 404 }
          );
        } else {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'WEBHOOK_ERROR',
                message: `外部服务返回错误 (${response.status})`
              }
            },
            { status: response.status }
          );
        }
      }

      // 返回成功结果（使用webhook的字段名）
      return NextResponse.json({
        success: true,
        message: 'URL转文本成功',
        data: {
          title: webhookData.title || '',
          author: webhookData.author || '',
          content: webhookData.text || '', // 注意：webhook返回的是'text'字段
        }
      });

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TIMEOUT',
              message: '请求超时，请稍后重试'
            }
          },
          { status: 408 }
        );
      }

      // 网络错误或其他fetch错误
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: '网络请求失败，请检查网络连接'
          }
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('External URL2Text API Error:', error);
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