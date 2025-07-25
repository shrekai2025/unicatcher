#!/usr/bin/env node

const HEALTH_URL = 'http://localhost:3067/api/health';

async function checkHealth() {
  try {
    console.log('🔍 检查服务健康状态...');
    
    const response = await fetch(HEALTH_URL, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 服务运行正常');
      console.log('📊 健康状态详情:', JSON.stringify(data, null, 2));
      process.exit(0);
    } else {
      console.log(`❌ 服务异常，状态码: ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ 健康检查失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

checkHealth(); 