import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n.mavae.ai/webhook/ec6f55d2-070e-4ab7-9ae4-dbfef651a5fb';
const TIMEOUT_MS = 30 * 1000; // 30秒超时

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

// POST - URL转文本
export async function POST(request: NextRequest) {
  try {
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
      const requestBody = {
        url: validUrl.toString(),
      };

      const requestHeaders = {
        'Authorization': `Bearer ${authToken.trim()}`,
        'Content-Type': 'application/json',
      };

      // 打印完整请求信息
      console.log('=== Webhook Request ===');
      console.log('URL:', WEBHOOK_URL);
      console.log('Method: POST');
      console.log('Headers:', requestHeaders);
      console.log('Body:', JSON.stringify(requestBody, null, 2));
      console.log('=======================');

      // 调用外部Webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 打印响应状态
      console.log('=== Webhook Response ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      // 获取响应文本
      const responseText = await response.text();
      console.log('Response Body:', responseText);
      console.log('========================');

      // 重新创建response用于后续处理
      const responseForProcessing = new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 解析响应数据
      let webhookData: WebhookResponse;
      try {
        webhookData = JSON.parse(responseText);
        console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
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

      // 检查响应状态（如果不是200也要处理）
      if (!responseForProcessing.ok) {
        if (responseForProcessing.status === 401) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'UNAUTHORIZED', message: '认证失败，请检查Token是否正确' }
            },
            { status: 401 }
          );
        } else if (responseForProcessing.status === 404) {
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
                message: `外部服务返回错误 (${responseForProcessing.status}): ${responseText}`
              }
            },
            { status: responseForProcessing.status }
          );
        }
      }

      // 返回成功结果（使用webhook的字段名）
      return NextResponse.json({
        success: true,
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
    console.error('URL2Text API Error:', error);
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