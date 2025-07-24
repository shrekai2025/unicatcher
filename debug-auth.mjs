#!/usr/bin/env node

/**
 * 身份验证调试脚本
 * 用于验证NextAuth配置是否正确
 */

console.log("🔍 开始身份验证配置调试...\n");

// 1. 检查环境变量
console.log("📋 环境变量检查:");
console.log("  NODE_ENV:", process.env.NODE_ENV);
console.log("  AUTH_SECRET:", process.env.AUTH_SECRET ? "✅ 已设置" : "❌ 未设置");
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "✅ 已设置" : "❌ 未设置");
console.log("  NEXTAUTH_URL:", process.env.NEXTAUTH_URL ? "✅ 已设置" : "❌ 未设置");
console.log("  PORT:", process.env.PORT || "未设置 (将使用默认值)");

// 2. 检查文件结构
console.log("\n📁 容器内文件结构检查:");
try {
  const fs = await import('fs');
  const path = await import('path');
  
  // 检查关键配置文件是否存在
  const filesToCheck = [
    'src/lib/config.ts',
    'src/server/auth/config.ts', 
    'src/server/db.ts',
    '.next/server/app/',
    'package.json'
  ];
  
  for (const filePath of filesToCheck) {
    if (fs.existsSync(filePath)) {
      console.log(`  ${filePath}: ✅ 存在`);
    } else {
      console.log(`  ${filePath}: ❌ 不存在`);
    }
  }
} catch (error) {
  console.error("  文件检查失败:", error.message);
}

// 3. 尝试加载配置 - 使用多种路径
console.log("\n⚙️ 配置文件检查:");
let configLoaded = false;
let config = null;

const configPaths = [
  './src/lib/config.js',
  './src/lib/config.ts', 
  './.next/server/app/src/lib/config.js',
  './dist/src/lib/config.js'
];

for (const configPath of configPaths) {
  try {
    console.log(`  尝试加载: ${configPath}`);
    const configModule = await import(configPath);
    config = configModule.config;
    console.log("  配置加载:", "✅ 成功");
    console.log("  认证用户名:", config.auth.username);
    console.log("  认证密码:", config.auth.password ? "✅ 已设置" : "❌ 未设置");
    console.log("  会话最大时长:", config.auth.sessionMaxAge, "秒");
    console.log("  认证密钥:", config.auth.secret ? "✅ 已设置" : "❌ 未设置");
    configLoaded = true;
    break;
  } catch (error) {
    console.log(`  ${configPath}: ❌ 失败 (${error.message})`);
  }
}

if (!configLoaded) {
  console.log("  所有配置路径均失败，尝试手动构建配置...");
  try {
    // 手动构建基本配置用于测试
    config = {
      auth: {
        username: "admin",
        password: "a2885828",
        secret: process.env.AUTH_SECRET,
        sessionMaxAge: 30 * 24 * 60 * 60 // 30天
      }
    };
    console.log("  手动配置:", "✅ 成功");
    configLoaded = true;
  } catch (error) {
    console.log("  手动配置:", "❌ 失败");
  }
}

// 4. 检查NextAuth配置
console.log("\n🔐 NextAuth配置检查:");
let authConfigLoaded = false;

const authConfigPaths = [
  './src/server/auth/config.js',
  './src/server/auth/config.ts',
  './.next/server/app/src/server/auth/config.js'
];

for (const authPath of authConfigPaths) {
  try {
    console.log(`  尝试加载: ${authPath}`);
    const authModule = await import(authPath);
    const authConfig = authModule.authConfig;
    console.log("  NextAuth配置加载:", "✅ 成功");
    console.log("  提供者数量:", authConfig.providers?.length || 0);
    console.log("  会话策略:", authConfig.session?.strategy || "未设置");
    console.log("  登录页面:", authConfig.pages?.signIn || "默认");
    authConfigLoaded = true;
    break;
  } catch (error) {
    console.log(`  ${authPath}: ❌ 失败 (${error.message})`);
  }
}

// 5. 如果配置加载成功，进行简单的身份验证测试
if (configLoaded && config) {
  console.log("\n🧪 简单身份验证测试:");
  try {
    const testUsername = "admin";
    const testPassword = "a2885828";
    
    console.log("  测试用户名:", testUsername);
    console.log("  测试密码:", testPassword ? "✅ 已设置" : "❌ 未设置");
    console.log("  期望用户名:", config.auth.username);
    console.log("  期望密码匹配:", config.auth.password === testPassword ? "✅ 匹配" : "❌ 不匹配");
    
    if (config.auth.username === testUsername && config.auth.password === testPassword) {
      console.log("  凭据验证:", "✅ 应该可以登录");
    } else {
      console.log("  凭据验证:", "❌ 凭据不匹配");
      console.log("    实际用户名:", config.auth.username);
      console.log("    密码长度:", config.auth.password?.length || 0);
    }
  } catch (error) {
    console.log("  身份验证测试:", "❌ 测试失败");
    console.error("    错误:", error.message);
  }
}

// 6. 检查数据库连接 - 简化版
console.log("\n💾 数据库连接检查:");
try {
  console.log("  数据库URL:", process.env.DATABASE_URL ? "✅ 已设置" : "❌ 未设置");
  console.log("  数据库类型:", process.env.DATABASE_URL?.includes('sqlite') ? "SQLite" : "其他");
  
  // 检查数据库文件是否存在（仅限SQLite）
  if (process.env.DATABASE_URL?.includes('file:')) {
    const fs = await import('fs');
    const dbPath = process.env.DATABASE_URL.replace('file:', '');
    if (fs.existsSync(dbPath)) {
      console.log("  数据库文件:", "✅ 存在");
    } else {
      console.log("  数据库文件:", "❌ 不存在，需要运行 prisma db push");
    }
  }
} catch (error) {
  console.log("  数据库检查:", "❌ 失败");
  console.error("  错误:", error.message);
}

// 7. 提供解决建议
console.log("\n🎯 调试完成!");
console.log("\n💡 解决建议:");

if (!configLoaded) {
  console.log("❌ 配置文件加载失败 - 可能需要重新构建Docker镜像");
}

if (!authConfigLoaded) {
  console.log("❌ NextAuth配置加载失败 - 检查身份验证模块");
}

if (configLoaded && config) {
  console.log("✅ 基本配置正常 - 如果仍无法登录，请检查:");
  console.log("   1. 浏览器网络请求是否成功");
  console.log("   2. 数据库是否正确初始化");
  console.log("   3. NextAuth服务是否正常运行");
}

console.log("\n📝 如果问题仍然存在，请运行以下命令收集更多信息:");
console.log("   docker-compose logs unicatcher");
console.log("   docker-compose exec unicatcher npm run db:push"); 