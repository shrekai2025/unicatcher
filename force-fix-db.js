/**
 * 强制修复数据库BigInt问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 强制修复数据库BigInt问题...\n');

try {
  // 停止所有Node进程
  console.log('1️⃣ 停止Node.js进程...');
  try {
    execSync('taskkill /f /im node.exe', { stdio: 'pipe' });
    console.log('✅ Node.js进程已停止');
  } catch (e) {
    console.log('ℹ️ 没有运行的Node.js进程');
  }

  // 等待进程完全停止
  console.log('⏳ 等待进程完全停止...');
  require('child_process').execSync('timeout 3', { stdio: 'pipe' });

  // 删除所有可能的数据库文件
  console.log('\n2️⃣ 删除旧数据库文件...');
  const dbPaths = [
    './prisma/db.sqlite',
    './prisma/data/database/unicatcher.db',
    './data/database/unicatcher.db'
  ];

  let deletedAny = false;
  for (const dbPath of dbPaths) {
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`✅ 删除: ${dbPath}`);
        deletedAny = true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.log(`⚠️ 无法删除 ${dbPath}: ${errorMsg}`);
      // 尝试重命名
      try {
        const backupPath = `${dbPath}.backup.${Date.now()}`;
        fs.renameSync(dbPath, backupPath);
        console.log(`📦 重命名为备份: ${backupPath}`);
        deletedAny = true;
      } catch (renameError) {
        const renameMsg = renameError instanceof Error ? renameError.message : '未知错误';
        console.log(`❌ 重命名失败: ${renameMsg}`);
      }
    }
  }

  if (!deletedAny) {
    console.log('ℹ️ 没有找到旧数据库文件');
  }

  // 清理缓存目录
  console.log('\n3️⃣ 清理缓存...');
  const cachePaths = ['./.next', './node_modules/.prisma'];
  for (const cachePath of cachePaths) {
    try {
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`✅ 清理: ${cachePath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.log(`⚠️ 清理失败 ${cachePath}: ${errorMsg}`);
    }
  }

  // 确保.env文件存在
  console.log('\n4️⃣ 检查环境变量...');
  if (!fs.existsSync('.env')) {
    const envContent = `DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="unicatcher-secret-key-2024"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="development"`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ 创建.env文件');
  } else {
    console.log('✅ .env文件已存在');
  }

  // 重新生成和推送
  console.log('\n5️⃣ 重新初始化数据库...');
  
  console.log('生成Prisma客户端...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma客户端生成完成');

  console.log('推送数据库结构...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  console.log('✅ 数据库结构推送完成');

  console.log('\n🎉 数据库修复完成！');
  console.log('🚀 现在可以运行: npm run dev');

} catch (error) {
  const errorMsg = error instanceof Error ? error.message : '未知错误';
  console.error('\n❌ 修复失败:', errorMsg);
  console.log('\n🔧 请手动执行以下步骤:');
  console.log('1. 在任务管理器中结束所有node.exe进程');
  console.log('2. 删除 prisma/data 目录');
  console.log('3. 删除 .next 目录');
  console.log('4. 运行: npx prisma generate');
  console.log('5. 运行: npx prisma db push');
} 