#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

console.log('🔍 检查UniCatcher依赖...');

const platform = os.platform();
const isWindows = platform === 'win32';

// 检查工具函数
function checkCommand(command, description) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description}: ${result.trim()}`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: 未安装或不可用`);
    return false;
  }
}

// 检查Node.js
console.log('\n📦 检查Node.js环境...');
const nodeOk = checkCommand('node --version', 'Node.js版本');
const npmOk = checkCommand('npm --version', 'npm版本');

if (!nodeOk || !npmOk) {
  console.log('\n❌ Node.js环境检查失败，请先安装Node.js 18+');
  process.exit(1);
}

// 检查系统工具
console.log('\n🛠️  检查系统工具...');
if (isWindows) {
  // Windows特定检查
  checkCommand('powershell --version', 'PowerShell版本');
} else {
  // Linux/macOS检查
  checkCommand('curl --version', 'curl版本');
  checkCommand('python3 --version', 'Python3版本');
}

// 检查项目文件
console.log('\n📁 检查项目文件...');
const requiredFiles = [
  'package.json',
  'prisma/schema.prisma',
  'src/env.js'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}: 存在`);
  } else {
    console.log(`❌ ${file}: 缺失`);
  }
}

// 检查环境变量
console.log('\n⚙️  检查环境配置...');
if (fs.existsSync('.env')) {
  console.log('✅ .env文件: 存在');
} else {
  console.log('⚠️  .env文件: 不存在（将在安装时创建）');
}

console.log('\n🎉 依赖检查完成！');
console.log('💡 如果所有检查都通过，可以运行安装脚本'); 