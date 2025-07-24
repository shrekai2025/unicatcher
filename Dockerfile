# ---------------------
# --- STAGE 1: Builder ---
# ---------------------
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# 复制package文件和prisma配置
COPY package*.json ./
COPY prisma ./prisma

# 安装依赖
RUN npm install

# 复制剩余源代码
COPY . .

# 设置构建时的临时环境变量
# 注意: 这些只在构建时使用
ENV AUTH_SECRET=build-time-secret
ENV DATABASE_URL="file:./prisma/db.sqlite"
ENV NEXTAUTH_URL=http://localhost:3067

# 构建Next.js应用
RUN npm run build

# ---------------------
# --- STAGE 2: Runner ---
# ---------------------
FROM node:20-slim AS runner

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
    && rm -rf /var/lib/apt/lists/*

# 创建一个无特权的专用用户
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# 从 builder 阶段复制构建产物和依赖
COPY --from=builder /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/data ./data
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/package.json ./package.json

# 安装Playwright浏览器
RUN npx playwright install chromium

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3067

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3067
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 启动命令
# 使用 node server.js 来启动独立的 Next.js 服务器
CMD ["node", "server.js"] 