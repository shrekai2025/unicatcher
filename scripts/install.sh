#!/bin/bash

# UniCatcher 跨平台安装脚本
# 支持 Linux 和 macOS

set -e

echo "🚀 开始安装 UniCatcher..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Node.js版本
echo -e "${BLUE}🔍 检查Node.js版本...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js未安装，请先安装Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js版本过低，需要18+，当前版本: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js版本: $(node -v)${NC}"

# 检查npm
echo -e "${BLUE}🔍 检查npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm版本: $(npm -v)${NC}"

# 安装依赖
echo -e "${BLUE}📦 安装依赖...${NC}"
npm install

# 创建.env文件（如果不存在）
if [ ! -f ".env" ]; then
    echo -e "${BLUE}📝 创建.env文件...${NC}"
    cat > .env << 'EOF'
# UniCatcher 环境配置
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="unicatcher-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="development"
PORT=3067
ENABLE_RESOURCE_OPTIMIZATION=true
EOF
    echo -e "${GREEN}✅ .env文件已创建${NC}"
else
    echo -e "${YELLOW}⚠️  .env文件已存在，跳过创建${NC}"
fi

# 初始化数据库
echo -e "${BLUE}🗄️  初始化数据库...${NC}"
npm run safe-init-db

# 安装Playwright浏览器
echo -e "${BLUE}🌐 安装Playwright浏览器...${NC}"
npx playwright install chromium

echo -e "${GREEN}🎉 UniCatcher安装完成！${NC}"
echo -e "${BLUE}💡 启动开发服务器: npm run dev${NC}"
echo -e "${BLUE}💡 启动生产服务器: npm run start${NC}"
echo -e "${BLUE}💡 访问地址: http://localhost:3067${NC}" 