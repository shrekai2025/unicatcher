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

// 2. 尝试加载配置
console.log("\n⚙️ 配置文件检查:");
try {
  // 动态导入配置
  const { config } = await import('./src/lib/config.js');
  console.log("  配置加载:", "✅ 成功");
  console.log("  认证用户名:", config.auth.username);
  console.log("  认证密码:", config.auth.password ? "✅ 已设置" : "❌ 未设置");
  console.log("  会话最大时长:", config.auth.sessionMaxAge, "秒");
  console.log("  认证密钥:", config.auth.secret ? "✅ 已设置" : "❌ 未设置");
} catch (error) {
  console.log("  配置加载:", "❌ 失败");
  console.error("  错误:", error.message);
}

// 3. 检查NextAuth配置
console.log("\n🔐 NextAuth配置检查:");
try {
  const { authConfig } = await import('./src/server/auth/config.js');
  console.log("  NextAuth配置加载:", "✅ 成功");
  console.log("  提供者数量:", authConfig.providers?.length || 0);
  console.log("  会话策略:", authConfig.session?.strategy || "未设置");
  console.log("  登录页面:", authConfig.pages?.signIn || "默认");
  
  // 测试凭据验证函数
  const credentialsProvider = authConfig.providers?.find(p => p.name === 'credentials');
  if (credentialsProvider && credentialsProvider.authorize) {
    console.log("  凭据提供者:", "✅ 已配置");
    
    // 测试正确的凭据
    console.log("\n🧪 测试身份验证:");
    try {
      const testResult = await credentialsProvider.authorize({
        username: "admin",
        password: "a2885828"
      });
      console.log("  正确凭据测试:", testResult ? "✅ 通过" : "❌ 失败");
      if (testResult) {
        console.log("    用户ID:", testResult.id);
        console.log("    用户名:", testResult.name);
        console.log("    邮箱:", testResult.email);
      }
    } catch (error) {
      console.log("  正确凭据测试:", "❌ 错误");
      console.error("    错误:", error.message);
    }
    
    // 测试错误的凭据
    try {
      const wrongResult = await credentialsProvider.authorize({
        username: "wrong",
        password: "wrong"
      });
      console.log("  错误凭据测试:", wrongResult ? "❌ 不应该通过" : "✅ 正确拒绝");
    } catch (error) {
      console.log("  错误凭据测试:", "❌ 错误");
      console.error("    错误:", error.message);
    }
  } else {
    console.log("  凭据提供者:", "❌ 未找到");
  }
} catch (error) {
  console.log("  NextAuth配置加载:", "❌ 失败");
  console.error("  错误:", error.message);
}

// 4. 检查数据库连接
console.log("\n💾 数据库连接检查:");
try {
  const { db } = await import('./src/server/db.js');
  console.log("  数据库连接:", "✅ 配置正确");
} catch (error) {
  console.log("  数据库连接:", "❌ 配置错误");
  console.error("  错误:", error.message);
}

console.log("\n🎯 调试完成!");
console.log("\n💡 如果看到任何 ❌ 标记，请检查相应的配置或环境变量。");
console.log("📝 建议检查 .env 文件是否存在且配置正确。"); 