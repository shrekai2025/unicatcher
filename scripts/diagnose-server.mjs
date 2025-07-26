#!/usr/bin/env node

/**
 * 远程服务器诊断脚本
 * 专门用于排查远程服务器上的问题
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

console.log('🔍 Remote Server Diagnostics\n');

// 加载环境变量
dotenv.config();

/**
 * 1. 系统环境检查
 */
async function checkSystemEnvironment() {
  console.log('🖥️  System Environment Check...');
  
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`   ✅ Node.js: ${nodeVersion}`);
    console.log(`   ✅ npm: ${npmVersion}`);
  } catch (error) {
    console.log(`   ❌ Node.js/npm check failed: ${error.message}`);
    return false;
  }
  
  // 检查关键目录
  const directories = ['src', 'prisma', 'data', 'node_modules'];
  for (const dir of directories) {
    if (existsSync(dir)) {
      console.log(`   ✅ Directory exists: ${dir}`);
    } else {
      console.log(`   ❌ Directory missing: ${dir}`);
    }
  }
  
  // 检查关键文件
  const files = [
    'package.json',
    'next.config.mjs',
    'src/lib/config.ts',
    'src/server/auth/config.ts',
    '.env'
  ];
  
  for (const file of files) {
    if (existsSync(file)) {
      console.log(`   ✅ File exists: ${file}`);
    } else {
      console.log(`   ❌ File missing: ${file}`);
    }
  }
  
  return true;
}

/**
 * 2. 环境变量检查
 */
async function checkEnvironmentVariables() {
  console.log('\n📋 Environment Variables Check...');
  
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
      console.log(`   ❌ ${key}: Not set`);
      hasErrors = true;
    } else {
      const displayValue = key === 'AUTH_SECRET' ? 
        `${value.substring(0, 8)}...` : value;
      console.log(`   ✅ ${key}: ${displayValue}`);
    }
  }
  
  return !hasErrors;
}

/**
 * 3. 依赖检查
 */
async function checkDependencies() {
  console.log('\n📦 Dependencies Check...');
  
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    console.log(`   ✅ Project: ${packageJson.name}@${packageJson.version}`);
    
    // 检查关键依赖
    const criticalDeps = [
      'next',
      'react',
      'nextauth',
      'prisma',
      '@prisma/client',
      'playwright'
    ];
    
    for (const dep of criticalDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        console.log(`   ✅ ${dep}: ${version}`);
      } else {
        console.log(`   ❌ ${dep}: Missing`);
      }
    }
    
    // 检查node_modules
    if (existsSync('node_modules')) {
      const nodeModulesCount = (await fs.readdir('node_modules')).length;
      console.log(`   ✅ node_modules: ${nodeModulesCount} packages`);
    } else {
      console.log(`   ❌ node_modules: Not found`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Package.json read error: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 4. 数据库检查
 */
async function checkDatabase() {
  console.log('\n🗄️  Database Check...');
  
  try {
    // 检查数据库文件
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/db.sqlite';
    
    if (existsSync(dbPath)) {
      const stats = await fs.stat(dbPath);
      console.log(`   ✅ Database file exists: ${dbPath}`);
      console.log(`   📊 Database size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`   ❌ Database file missing: ${dbPath}`);
    }
    
    // 检查Prisma客户端
    if (existsSync('node_modules/.prisma/client')) {
      console.log(`   ✅ Prisma client generated`);
    } else {
      console.log(`   ❌ Prisma client not generated`);
    }
    
    // 检查schema文件
    if (existsSync('prisma/schema.prisma')) {
      console.log(`   ✅ Prisma schema exists`);
    } else {
      console.log(`   ❌ Prisma schema missing`);
    }
    
  } catch (error) {
    console.log(`   ❌ Database check error: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 5. 网络和端口检查
 */
async function checkNetworkAndPorts() {
  console.log('\n🌐 Network and Ports Check...');
  
  const port = process.env.PORT || '3067';
  
  try {
    // 检查端口是否被占用
    const { spawn } = await import('child_process');
    
    console.log(`   📡 Checking port ${port}...`);
    
    // 简单的端口检查
    const net = await import('net');
    const server = net.createServer();
    
    const isPortFree = await new Promise((resolve) => {
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
    
    if (isPortFree) {
      console.log(`   ✅ Port ${port} is available`);
    } else {
      console.log(`   ⚠️  Port ${port} is in use`);
    }
    
  } catch (error) {
    console.log(`   ❌ Network check error: ${error.message}`);
  }
}

/**
 * 6. 构建状态检查
 */
async function checkBuildStatus() {
  console.log('\n🏗️  Build Status Check...');
  
  try {
    // 检查.next目录
    if (existsSync('.next')) {
      console.log(`   ✅ Next.js build directory exists`);
      
      if (existsSync('.next/BUILD_ID')) {
        const buildId = await fs.readFile('.next/BUILD_ID', 'utf8');
        console.log(`   📋 Build ID: ${buildId.trim()}`);
      }
    } else {
      console.log(`   ❌ Next.js build directory missing`);
      console.log(`   💡 Run: npm run build`);
    }
    
    // 检查TypeScript编译
    if (existsSync('tsconfig.json')) {
      console.log(`   ✅ TypeScript config exists`);
    }
    
  } catch (error) {
    console.log(`   ❌ Build check error: ${error.message}`);
  }
}

/**
 * 7. 生成修复建议
 */
function generateFixSuggestions(results) {
  console.log('\n💡 Fix Suggestions:');
  
  if (!results.dependencies) {
    console.log('   1. Install dependencies: npm install');
  }
  
  if (!results.environment) {
    console.log('   2. Fix environment variables: npm run fix-env');
  }
  
  if (!results.database) {
    console.log('   3. Initialize database: npm run safe-init-db');
    console.log('   4. Generate Prisma client: npx prisma generate');
  }
  
  if (!existsSync('.next')) {
    console.log('   5. Build application: npm run build');
  }
  
  console.log('   6. Check logs: npm run logs');
  console.log('   7. Restart application: npm run restart');
}

/**
 * 主函数
 */
async function main() {
  try {
    const results = {
      system: await checkSystemEnvironment(),
      environment: await checkEnvironmentVariables(),
      dependencies: await checkDependencies(),
      database: await checkDatabase(),
    };
    
    await checkNetworkAndPorts();
    await checkBuildStatus();
    
    console.log('\n📊 Diagnostic Summary:');
    console.log(`   System Environment: ${results.system ? '✅' : '❌'}`);
    console.log(`   Environment Variables: ${results.environment ? '✅' : '❌'}`);
    console.log(`   Dependencies: ${results.dependencies ? '✅' : '❌'}`);
    console.log(`   Database: ${results.database ? '✅' : '❌'}`);
    
    const allGood = Object.values(results).every(Boolean);
    
    if (allGood) {
      console.log('\n🎉 All checks passed! System appears healthy.');
      console.log('\n📋 Next steps:');
      console.log('   - Start application: npm run start');
      console.log('   - Check status: npm run status');
    } else {
      generateFixSuggestions(results);
    }
    
  } catch (error) {
    console.error('\n💥 Diagnostic error:', error.message);
    process.exit(1);
  }
}

main(); 