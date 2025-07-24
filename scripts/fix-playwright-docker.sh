#!/bin/bash

echo "=== UniCatcher Playwright 修复脚本 ==="

# 检查是否在Docker容器中运行
if [ ! -f /.dockerenv ]; then
    echo "错误: 此脚本只能在Docker容器中运行"
    exit 1
fi

echo "🔍 检查Playwright安装状态..."

# 检查Playwright版本
npx playwright --version

echo "🔧 重新安装Playwright浏览器..."

# 设置环境变量
export PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright

# 创建目录
mkdir -p /home/appuser/.cache/ms-playwright

# 重新安装浏览器
npx playwright install chromium

# 验证浏览器安装
if [ -d "/home/appuser/.cache/ms-playwright" ]; then
    echo "✅ Playwright浏览器目录已创建"
    ls -la /home/appuser/.cache/ms-playwright/
    
    # 查找chromium可执行文件
    CHROMIUM_PATH=$(find /home/appuser/.cache/ms-playwright -name "chrome" -type f 2>/dev/null | head -1)
    if [ -n "$CHROMIUM_PATH" ]; then
        echo "✅ 找到Chromium可执行文件: $CHROMIUM_PATH"
        
        # 检查执行权限
        if [ -x "$CHROMIUM_PATH" ]; then
            echo "✅ Chromium可执行文件权限正常"
        else
            echo "⚠️ 修复Chromium执行权限..."
            chmod +x "$CHROMIUM_PATH"
        fi
    else
        echo "❌ 未找到Chromium可执行文件"
        exit 1
    fi
else
    echo "❌ Playwright浏览器目录创建失败"
    exit 1
fi

echo "🧪 测试Playwright浏览器启动..."

# 创建简单的测试脚本
cat > /tmp/test-playwright.js << 'EOF'
const { chromium } = require('playwright');

async function testBrowser() {
  try {
    console.log('正在启动浏览器...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ 浏览器启动成功');
    await browser.close();
    console.log('✅ 浏览器关闭成功');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 浏览器启动失败:', error.message);
    process.exit(1);
  }
}

testBrowser();
EOF

# 运行测试
node /tmp/test-playwright.js

if [ $? -eq 0 ]; then
    echo "🎉 Playwright修复完成！浏览器可以正常启动"
else
    echo "❌ 修复失败，浏览器仍无法启动"
    exit 1
fi

# 清理测试文件
rm -f /tmp/test-playwright.js

echo "=== 修复完成 ===" 