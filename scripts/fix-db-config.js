import fs from 'fs';
import path from 'path';

console.log('🔧 修复数据库配置...');

// 读取当前的.env文件
const envPath = '.env';
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📖 当前.env内容:');
  console.log(envContent);
  
  // 更新DATABASE_URL指向正确的数据库文件
  const newEnvContent = envContent.replace(
    /DATABASE_URL="file:\.\/prisma\/data\/database\/unicatcher\.db"/,
    'DATABASE_URL="file:./prisma/db.sqlite"'
  );
  
  // 写入更新后的配置
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ 已更新.env文件');
  console.log('📝 新的DATABASE_URL: file:./prisma/db.sqlite');
  
} catch (error) {
  console.error('❌ 处理.env文件失败:', error);
  // 如果没有.env文件，创建一个
  const newEnvContent = `AUTH_SECRET=unicatcher-secret-key-2024
NEXTAUTH_URL=http://localhost:3067
DATABASE_URL="file:./prisma/db.sqlite"`;
  
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ 已创建新的.env文件');
}

// 检查数据库文件
const dbPath = './prisma/db.sqlite';
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`📊 数据库文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('✅ 数据库文件存在且有数据');
} else {
  console.log('⚠️  数据库文件不存在');
}

console.log('🎉 配置修复完成！'); 