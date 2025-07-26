#!/usr/bin/env node

/**
 * JWT Session错误诊断和修复脚本
 * 解决NextAuth JWTSessionError和相关认证问题
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

console.log('🔍 开始JWT Session问题诊断...\n');

// 加载环境变量
dotenv.config();

/**
 * 1. 检查环境变量配置
 */
async function checkEnvironmentVariables() {
  console.log('📋 检查环境变量配置...');
  
  const requiredVars = {
    'AUTH_SECRET': process.env.AUTH_SECRET,
    'DATABASE_URL': process.env.DATABASE_URL,
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT
  };
  
  let hasErrors = false;
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      console.log(`   ❌ ${key}: 未设置`);
      hasErrors = true;
    } else {
      // 对于敏感信息，只显示前几位
      const displayValue = key === 'AUTH_SECRET' ? 
        `${value.substring(0, 8)}...` : value;
      console.log(`   ✅ ${key}: ${displayValue}`);
    }
  }
  
  // 检查AUTH_SECRET的强度
  if (process.env.AUTH_SECRET) {
    const secret = process.env.AUTH_SECRET;
    if (secret.length < 32) {
      console.log('   ⚠️  AUTH_SECRET太短，建议至少32字符');
      hasErrors = true;
    }
    if (secret === 'unicatcher-secret-key-2024-change-in-production') {
      console.log('   ⚠️  AUTH_SECRET使用默认值，生产环境需要更改');
      hasErrors = true;
    }
  }
  
  // 检查生产环境配置
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_SECRET) {
      console.log('   ❌ 生产环境必须设置AUTH_SECRET');
      hasErrors = true;
    }
    if (!process.env.NEXTAUTH_URL) {
      console.log('   ❌ 生产环境必须设置NEXTAUTH_URL');
      hasErrors = true;
    }
  }
  
  return !hasErrors;
}

/**
 * 2. 修复环境变量配置
 */
async function fixEnvironmentVariables() {
  console.log('\n🔧 修复环境变量配置...');
  
  let envContent = '';
  
  if (existsSync('.env')) {
    envContent = await fs.readFile('.env', 'utf8');
  }
  
  const envVars = new Map();
  
  // 解析现有的环境变量
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars.set(key.trim(), valueParts.join('=').replace(/^"|"$/g, ''));
    }
  });
  
  // 生成强密码用于AUTH_SECRET
  const generateSecureSecret = () => {
    return crypto.randomBytes(32).toString('base64url');
  };
  
  // 设置必需的环境变量
  const updates = new Map();
  
  if (!envVars.has('DATABASE_URL') || !envVars.get('DATABASE_URL')) {
    updates.set('DATABASE_URL', 'file:./prisma/db.sqlite');
  }
  
  if (!envVars.has('AUTH_SECRET') || !envVars.get('AUTH_SECRET') || 
      envVars.get('AUTH_SECRET') === 'unicatcher-secret-key-2024-change-in-production') {
    updates.set('AUTH_SECRET', generateSecureSecret());
  }
  
  if (!envVars.has('NEXTAUTH_URL') || !envVars.get('NEXTAUTH_URL')) {
    const port = envVars.get('PORT') || '3067';
    updates.set('NEXTAUTH_URL', `http://localhost:${port}`);
  }
  
  if (!envVars.has('NODE_ENV') || !envVars.get('NODE_ENV')) {
    updates.set('NODE_ENV', 'production');
  }
  
  if (!envVars.has('PORT') || !envVars.get('PORT')) {
    updates.set('PORT', '3067');
  }
  
  if (!envVars.has('ENABLE_RESOURCE_OPTIMIZATION')) {
    updates.set('ENABLE_RESOURCE_OPTIMIZATION', 'true');
  }
  
  // 合并更新
  for (const [key, value] of updates) {
    envVars.set(key, value);
    console.log(`   ✅ 更新 ${key}`);
  }
  
  // 写入.env文件
  const newEnvContent = Array.from(envVars.entries())
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  
  await fs.writeFile('.env', newEnvContent);
  console.log('   💾 .env文件已更新');
  
  return updates.size > 0;
}

/**
 * 3. 测试JWT配置
 */
async function testJWTConfiguration() {
  console.log('\n🧪 测试JWT配置...');
  
  try {
    // 重新加载环境变量
    dotenv.config({ override: true });
    
    // 动态导入配置
    const { config } = await import('../src/lib/config.js');
    const { authConfig } = await import('../src/server/auth/config.js');
    
    console.log('   ✅ 配置文件加载成功');
    console.log(`   📄 会话策略: ${authConfig.session?.strategy}`);
    console.log(`   ⏰ 会话最大时长: ${authConfig.session?.maxAge}秒`);
    console.log(`   🔑 认证提供者数量: ${authConfig.providers?.length}`);
    
    // 测试认证配置
    const credentialsProvider = authConfig.providers?.find(p => p.name === 'credentials');
    if (credentialsProvider && credentialsProvider.authorize) {
      console.log('   🔐 凭据提供者配置正确');
      
      // 测试正确的凭据
      try {
        const testResult = await credentialsProvider.authorize({
          username: config.auth.username,
          password: config.auth.password
        });
        
        if (testResult) {
          console.log('   ✅ 认证测试通过');
          console.log(`      用户ID: ${testResult.id}`);
          console.log(`      用户名: ${testResult.name}`);
        } else {
          console.log('   ❌ 认证测试失败');
          return false;
        }
      } catch (error) {
        console.log(`   ❌ 认证测试错误: ${error.message}`);
        return false;
      }
    } else {
      console.log('   ❌ 凭据提供者配置错误');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ 配置测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 4. 检查时间同步
 */
async function checkTimeSync() {
  console.log('\n⏰ 检查时间同步...');
  
  const now = new Date();
  const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  
  console.log(`   🕐 本地时间: ${now.toLocaleString()}`);
  console.log(`   🌍 UTC时间: ${utcNow.toLocaleString()}`);
  console.log(`   🌐 时区偏移: ${now.getTimezoneOffset()} 分钟`);
  
  // 检查时间是否合理（不能偏差太大）
  const systemTime = Date.now();
  const expectedTime = new Date('2024-01-01').getTime();
  
  if (systemTime < expectedTime) {
    console.log('   ⚠️  系统时间可能不正确，请检查服务器时间设置');
    return false;
  }
  
  console.log('   ✅ 时间同步正常');
  return true;
}

/**
 * 5. 生成JWT调试信息
 */
async function generateJWTDebugInfo() {
  console.log('\n🔬 生成JWT调试信息...');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      DATABASE_URL_SET: !!process.env.DATABASE_URL
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
  
  await fs.writeFile('./data/jwt-debug.json', JSON.stringify(debugInfo, null, 2));
  console.log('   💾 调试信息已保存到 ./data/jwt-debug.json');
}

/**
 * 主函数
 */
async function main() {
  try {
    // 确保data目录存在
    if (!existsSync('./data')) {
      await fs.mkdir('./data', { recursive: true });
    }
    
    const envOk = await checkEnvironmentVariables();
    
    if (!envOk) {
      console.log('\n🔧 尝试自动修复环境变量...');
      const fixed = await fixEnvironmentVariables();
      
      if (fixed) {
        console.log('✅ 环境变量已修复，请重新启动应用');
      }
    }
    
    const jwtOk = await testJWTConfiguration();
    const timeOk = await checkTimeSync();
    
    await generateJWTDebugInfo();
    
    console.log('\n📊 诊断结果汇总:');
    console.log(`   环境变量: ${envOk ? '✅' : '❌'}`);
    console.log(`   JWT配置: ${jwtOk ? '✅' : '❌'}`);
    console.log(`   时间同步: ${timeOk ? '✅' : '❌'}`);
    
    if (envOk && jwtOk && timeOk) {
      console.log('\n🎉 JWT Session配置正常！');
    } else {
      console.log('\n⚠️  发现问题，请检查上述错误并修复');
      console.log('\n💡 常见解决方案:');
      console.log('   1. 重新生成AUTH_SECRET: npm run fix-jwt-session');
      console.log('   2. 检查NEXTAUTH_URL是否匹配服务器地址');
      console.log('   3. 确保服务器时间正确同步');
      console.log('   4. 查看 ./data/jwt-debug.json 获取详细信息');
    }
    
  } catch (error) {
    console.error('\n💥 诊断过程出错:', error.message);
    process.exit(1);
  }
}

main(); 