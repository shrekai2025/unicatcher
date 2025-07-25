# UniCatcher Docker镜像 - 简化版
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 安装 Playwright 相关的系统依赖和中文字体
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Playwright 依赖
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    # 中文字体
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    # 其他工具
    curl \
    && rm -rf /var/lib/apt/lists/*

# 创建一个无特权的专用用户
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# 复制package文件和prisma配置
COPY package*.json ./
COPY prisma ./prisma

# 安装依赖
RUN npm install

# 复制剩余源代码
COPY . .

# 设置构建时的临时环境变量
ENV AUTH_SECRET=build-time-secret
ENV NEXTAUTH_URL=http://localhost:3067
# 注意：DATABASE_URL将在运行时通过.env文件或环境变量设置

# 构建Next.js应用
RUN npm run build

# 创建数据目录并设置权限
RUN mkdir -p /app/data/logs /app/data/browser-data && \
    chown -R appuser:appgroup /app/data /app/prisma && \
    chmod -R 755 /app/data /app/prisma

# 设置Playwright环境变量（在用户切换前设置）
ENV PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright

# 切换到非 root 用户
USER appuser

# 创建Playwright浏览器目录
RUN mkdir -p /home/appuser/.cache/ms-playwright

# 安装Playwright浏览器（在用户切换后执行，确保权限正确）
RUN npx playwright install chromium

# 验证安装
RUN ls -la /home/appuser/.cache/ms-playwright/ || echo "Warning: Playwright directory not created properly"

# 创建符号链接以兼容旧路径（在用户切换前以root身份执行）
USER root
RUN mkdir -p /ms-playwright && \
    if [ -d "/home/appuser/.cache/ms-playwright" ]; then \
      find /home/appuser/.cache/ms-playwright -name "chromium-*" -type d | head -1 | \
      xargs -I {} ln -sf {} /ms-playwright/; \
    fi

# 切换回appuser
USER appuser

# 暴露端口
EXPOSE 3067

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3067

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3067/api/health || exit 1

# 启动命令
CMD ["npm", "run", "start"] 