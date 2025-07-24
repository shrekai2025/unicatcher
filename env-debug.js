/**
 * 环境变量诊断脚本
 * 检查.env文件加载和环境变量设置情况
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 环境变量诊断开始...\n');

// 1. 检查当前工作目录
console.log('📂 当前工作目录:', process.cwd());

// 2. 检查.env文件是否存在
const envPath = path.join(process.cwd(), '.env');
console.log('📋 .env文件路径:', envPath);
console.log('📋 .env文件存在:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  // 3. 读取.env文件内容
  console.log('\n📄 .env文件内容:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('---BEGIN .env---');
  console.log(envContent);
  console.log('---END .env---');
  
  // 4. 分析.env文件格式
  const lines = envContent.split('\n');
  console.log('\n📝 .env文件行数:', lines.length);
  lines.forEach((line, index) => {
    if (line.trim()) {
      console.log(`行${index + 1}: "${line}" (长度: ${line.length})`);
      if (line.includes('DATABASE_URL')) {
        console.log(`  ✓ 发现DATABASE_URL行`);
        // 检查是否有特殊字符
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const code = char.charCodeAt(0);
          if (code < 32 || code > 126) {
            console.log(`  ⚠️ 发现特殊字符在位置${i}: 字符码${code}`);
          }
        }
      }
    }
  });
}

// 5. 尝试手动加载dotenv
console.log('\n🔄 尝试手动加载dotenv...');
try {
  require('dotenv').config();
  console.log('✅ dotenv加载成功');
} catch (error) {
  console.log('❌ dotenv加载失败:', error.message);
  
  // 尝试安装dotenv
  console.log('📦 尝试安装dotenv...');
  try {
    require('child_process').execSync('npm install dotenv', { stdio: 'inherit' });
    console.log('✅ dotenv安装成功，重新尝试加载...');
    require('dotenv').config();
    console.log('✅ dotenv重新加载成功');
  } catch (installError) {
    console.log('❌ dotenv安装失败:', installError.message);
  }
}

// 6. 检查环境变量
console.log('\n🔧 检查环境变量:');
const envVars = ['DATABASE_URL', 'AUTH_SECRET', 'NEXTAUTH_URL', 'NODE_ENV'];

envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? `"${value}"` : '❌ 未定义'}`);
});

// 7. 打印所有环境变量（仅显示项目相关的）
console.log('\n📊 所有项目相关环境变量:');
Object.keys(process.env)
  .filter(key => 
    key.includes('DATABASE') || 
    key.includes('AUTH') || 
    key.includes('NEXTAUTH') || 
    key.includes('NODE_ENV') ||
    key.includes('PRISMA')
  )
  .sort()
  .forEach(key => {
    console.log(`${key}: "${process.env[key]}"`);
  });

// 8. 尝试直接解析.env文件
if (fs.existsSync(envPath)) {
  console.log('\n🔧 手动解析.env文件:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
        console.log(`解析: ${key} = "${value}"`);
      } else {
        console.log(`⚠️ 行${index + 1}格式错误: "${trimmedLine}"`);
      }
    }
  });
  
  console.log('\n📋 解析结果:');
  console.log('DATABASE_URL:', envVars.DATABASE_URL || '❌ 未找到');
}

// 9. 测试Prisma配置
console.log('\n🧪 测试Prisma配置:');
try {
  // 尝试读取Prisma schema
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    console.log('✅ Prisma schema文件存在');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // 查找数据源配置
    const dbConfigMatch = schemaContent.match(/datasource\s+\w+\s*{[^}]*}/);
    if (dbConfigMatch) {
      console.log('📄 数据源配置:');
      console.log(dbConfigMatch[0]);
    }
  } else {
    console.log('❌ Prisma schema文件不存在');
  }
} catch (error) {
  console.log('❌ 读取Prisma配置失败:', error.message);
}

console.log('\n🎯 诊断完成！');
console.log('\n💡 建议的修复步骤:');
if (!process.env.DATABASE_URL) {
  console.log('1. DATABASE_URL环境变量未加载，需要修复.env文件加载');
  console.log('2. 尝试重新创建.env文件，确保使用UTF-8编码');
  console.log('3. 检查.env文件权限');
  console.log('4. 尝试手动设置环境变量');
} else {
  console.log('1. 环境变量已正确加载');
  console.log('2. 可以继续进行数据库操作');
} 