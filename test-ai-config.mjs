import { OpenAIService } from './src/server/core/ai/openai-service.ts';

async function testAIConfig() {
  console.log('测试AI配置验证...');
  
  const aiConfig = {
    apiKey: 'sk-AUswvdigbCaTkkjVJv6tBuv3uE2BALd3HqYaymw6XICBsQ0F',
    provider: 'openai-badger',
    model: 'gpt-4o'
  };
  
  try {
    const aiService = new OpenAIService(aiConfig);
    console.log('OpenAI服务实例创建成功');
    
    const isValid = await aiService.validateConfig();
    console.log('配置验证结果:', isValid);
    
    if (!isValid) {
      console.log('配置验证失败！');
      return;
    }
    
    // 测试简单的AI调用
    console.log('测试简单的AI分析...');
    const result = await aiService.analyzeTweet(
      '这是一个关于人工智能的教程分享',
      [{ name: '人工智能', description: 'AI相关技术' }],
      [{ name: '教程', description: '操作指南和学习材料' }]
    );
    
    console.log('AI分析结果:', result);
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAIConfig();
