// 测试模拟webhook响应处理
const testWebhookResponse = {
  "author": "人大金融科技研究所",
  "title": "稳定币挤兑与套利中心化",
  "text": "稳定币是一种加密资产，旨在与美元挂钩，但由流动性并不完美的美元资产支持。……经营模式、发展影响与监管框架全球稳定币发展趋势与政策演变",
  "error": ""
};

// 模拟成功响应处理逻辑
function processWebhookResponse(webhookData) {
  console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));

  // 检查是否有错误
  if (webhookData.error && webhookData.error !== '') {
    return {
      success: false,
      error: {
        code: 'CONVERSION_ERROR',
        message: webhookData.error
      }
    };
  }

  // 返回成功结果（使用webhook的字段名）
  return {
    success: true,
    data: {
      title: webhookData.title || '',
      author: webhookData.author || '',
      content: webhookData.text || '', // 注意：webhook返回的是'text'字段
    }
  };
}

console.log('=== 测试正常响应 ===');
console.log(JSON.stringify(processWebhookResponse(testWebhookResponse), null, 2));

console.log('\n=== 测试错误响应 ===');
const errorResponse = { ...testWebhookResponse, error: "网页无法访问" };
console.log(JSON.stringify(processWebhookResponse(errorResponse), null, 2));