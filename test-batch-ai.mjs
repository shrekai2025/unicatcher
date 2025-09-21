#!/usr/bin/env node

/**
 * 测试批量AI处理功能
 * 运行前请确保：
 * 1. 有可用的AI API Key
 * 2. 数据库中有待处理的推文数据
 * 3. 已配置相关的主题标签和内容类型
 */

import { OpenAIService } from './src/server/core/ai/openai-service.ts';

// 模拟测试数据
const testTweets = [
  {
    id: 'test_tweet_1',
    content: '刚刚发布了一个新的React组件库，支持TypeScript，大大简化了前端开发流程。GitHub链接在评论区。'
  },
  {
    id: 'test_tweet_2', 
    content: '今天天气真不错，准备去公园散步了。'
  },
  {
    id: 'test_tweet_3',
    content: 'AI技术正在快速发展，特别是在自然语言处理领域。GPT-4的能力令人印象深刻。'
  },
  {
    id: 'test_tweet_4',
    content: '分享一个Python数据分析的实用教程，适合初学者入门。'
  },
  {
    id: 'test_tweet_5',
    content: '刚吃完午饭，感觉有点困了。'
  }
];

const testTopicTags = ['人工智能', '编程开发', '前端开发', '数据分析', 'React', 'Python'];
const testContentTypes = ['教程', '产品介绍', '工具推荐', '观点分析'];

async function testBatchProcessing() {
  console.log('开始测试批量AI处理功能...\n');

  // 需要手动设置API Key进行测试
  const testConfig = {
    apiKey: 'YOUR_API_KEY_HERE', // 请替换为实际的API Key
    provider: 'openai',
    model: 'gpt-4o-mini'
  };

  if (testConfig.apiKey === 'YOUR_API_KEY_HERE') {
    console.log('❌ 请先在脚本中配置真实的API Key');
    console.log('编辑 test-batch-ai.mjs 文件，替换 YOUR_API_KEY_HERE');
    return;
  }

  try {
    const aiService = new OpenAIService(testConfig);

    console.log('🔧 验证API配置...');
    const isValid = await aiService.validateConfig();
    if (!isValid) {
      console.log('❌ API配置验证失败');
      return;
    }
    console.log('✅ API配置验证成功\n');

    // 测试优化模式（批量处理）
    console.log('🚀 测试优化模式（批量处理）...');
    const startTime1 = Date.now();
    
    const batchResults = await aiService.analyzeTweetsBatchOptimized(
      testTweets,
      testTopicTags,
      testContentTypes,
      undefined,
      (stats) => {
        console.log(`进度: ${stats.processed}/${testTweets.length} | 成功: ${stats.succeeded} | 失败: ${stats.failed} | 无价值: ${stats.valueless}`);
      }
    );

    const batchTime = Date.now() - startTime1;
    console.log(`⏱️ 批量模式耗时: ${batchTime}ms\n`);

    // 测试传统模式（逐条处理）
    console.log('🐌 测试传统模式（逐条处理）...');
    const startTime2 = Date.now();

    const fallbackResults = await aiService.analyzeTweetsBatchFallback(
      testTweets,
      testTopicTags,
      testContentTypes,
      undefined,
      (stats) => {
        console.log(`进度: ${stats.processed}/${testTweets.length} | 成功: ${stats.succeeded} | 失败: ${stats.failed} | 无价值: ${stats.valueless}`);
      }
    );

    const fallbackTime = Date.now() - startTime2;
    console.log(`⏱️ 传统模式耗时: ${fallbackTime}ms\n`);

    // 结果对比
    console.log('📊 结果对比:');
    console.log(`批量模式耗时: ${batchTime}ms`);
    console.log(`传统模式耗时: ${fallbackTime}ms`);
    console.log(`性能提升: ${((fallbackTime - batchTime) / fallbackTime * 100).toFixed(1)}%\n`);

    // 显示详细结果
    console.log('📋 批量模式结果:');
    batchResults.forEach((result, index) => {
      const tweet = testTweets[index];
      console.log(`${index + 1}. ${tweet.content.substring(0, 50)}...`);
      if (result.result) {
        console.log(`   └ 无价值: ${result.result.isValueless}`);
        console.log(`   └ 关键词: ${result.result.keywords.join(', ') || '无'}`);
        console.log(`   └ 主题标签: ${result.result.topicTags.join(', ') || '无'}`);
        console.log(`   └ 内容类型: ${result.result.contentTypes.join(', ') || '无'}`);
      } else {
        console.log(`   └ 错误: ${result.error}`);
      }
      console.log('');
    });

    console.log('✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testBatchProcessing().catch(console.error);
