#!/bin/bash

echo "🚀 UniCatcher Playwright 快速修复脚本"
echo "======================================="

# 检查当前用户
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"

# 设置正确的环境变量
export PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright
echo "设置浏览器路径: $PLAYWRIGHT_BROWSERS_PATH"

# 创建目标目录
echo "📁 创建Playwright浏览器目录..."
mkdir -p /home/appuser/.cache/ms-playwright

# 重新安装Playwright浏览器
echo "📦 重新安装Playwright浏览器..."
npx playwright install chromium

# 检查安装结果
if [ -d "/home/appuser/.cache/ms-playwright" ]; then
    echo "✅ 新路径浏览器安装成功"
    ls -la /home/appuser/.cache/ms-playwright/
    
    # 查找chromium可执行文件
    CHROMIUM_PATH=$(find /home/appuser/.cache/ms-playwright -name "chrome" -type f 2>/dev/null | head -1)
    if [ -n "$CHROMIUM_PATH" ]; then
        echo "✅ 找到Chromium: $CHROMIUM_PATH"
        
        # 创建符号链接（关键修复）
        echo "🔗 创建符号链接修复旧路径问题..."
        sudo mkdir -p /ms-playwright
        
        # 获取浏览器版本目录
        BROWSER_VERSION_DIR=$(dirname "$CHROMIUM_PATH")
        BROWSER_VERSION=$(basename "$BROWSER_VERSION_DIR")
        
        echo "浏览器版本目录: $BROWSER_VERSION_DIR"
        echo "浏览器版本: $BROWSER_VERSION"
        
        # 创建版本特定的符号链接
        sudo ln -sf "$BROWSER_VERSION_DIR" "/ms-playwright/$BROWSER_VERSION"
        
        echo "✅ 符号链接创建完成"
        ls -la /ms-playwright/
        
        # 验证旧路径现在可以访问
        if [ -f "/ms-playwright/$BROWSER_VERSION/chrome-linux/chrome" ]; then
            echo "🎉 修复成功！旧路径现在可以正常访问"
        else
            echo "⚠️ 符号链接可能未正确创建，尝试直接链接..."
            sudo ln -sf "$(dirname $CHROMIUM_PATH)" "/ms-playwright/$BROWSER_VERSION"
        fi
    else
        echo "❌ 未找到Chromium可执行文件"
        exit 1
    fi
else
    echo "❌ 浏览器目录创建失败"
    exit 1
fi

# 测试浏览器启动
echo "🧪 测试浏览器启动..."
cat > /tmp/test-browser.js << 'EOF'
const { chromium } = require('playwright');

async function testBrowser() {
  try {
    console.log('测试浏览器启动...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ 浏览器启动成功');
    await browser.close();
    console.log('✅ 浏览器关闭成功');
    
  } catch (error) {
    console.error('❌ 浏览器启动失败:', error.message);
    throw error;
  }
}

testBrowser().then(() => {
  console.log('🎉 测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
EOF

node /tmp/test-browser.js

if [ $? -eq 0 ]; then
    echo "🎉 Playwright修复完成！"
    echo "现在可以正常创建任务了"
else
    echo "❌ 修复失败，请检查错误信息"
    exit 1
fi

# 清理测试文件
rm -f /tmp/test-browser.js

echo "======================================="
echo "✅ 快速修复脚本执行完成" 