# UniCatcher Docker镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（Playwright + 中文字体支持）
RUN apt-get update && apt-get install -y \
    # Playwright浏览器依赖
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    # 工具软件
    curl \
    wget \
    git \
    # 中文字体支持
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    # 清理缓存
    && rm -rf /var/lib/apt/lists/*

# 复制package文件和prisma配置
COPY package*.json ./
COPY prisma ./prisma

# 安装依赖 (现在prisma generate可以成功运行)
RUN npm install

# 安装Playwright浏览器
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# 复制剩余源代码
COPY . .

# 构建Next.js应用
RUN npm run build

# 创建数据目录
RUN mkdir -p /app/data/database /app/data/logs /app/data/browser-data

# 设置权限
RUN chmod -R 755 /app/data
RUN chmod +x scripts/*.js scripts/*.mjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3067/api/health || exit 1

# 暴露端口
EXPOSE 3067

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3067
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 启动命令
CMD ["npm", "run", "start"] 