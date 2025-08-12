# UniCatcher 通用浏览器爬虫系统

UniCatcher 是一个基于 Next.js + tRPC + Prisma 的通用浏览器爬虫系统，主打 Twitter List 数据采集与管理，内置任务调度、数据导出与简单认证。

本 README 已与代码库对齐，修正了认证方式、技术栈版本、.env、部署与 API 可用性等差异。

### 关键特性
- Twitter List 爬取：Playwright 无头浏览器，滚动加载、去重、跳过转推与被回复推文
- 数据存储：SQLite + Prisma，支持导出 JSON/CSV
- 任务管理：异步调度、状态更新、限并发、重试机制
- 管理后台：仪表板、任务、推文与提取记录页面
- 外部 REST API：创建任务、查询任务、拉取数据、数据提取（批量/预览/足额）
- 健康检查：`/api/health` 端点，Docker 健康探针

访问管理后台：`http://localhost:3067`

---

## ⚠ 与旧文档不符处（重要）
- 认证方式：当前使用「极简固定账号 + cookie/localStorage」方案，不使用 NextAuth.js。
- 技术栈版本：Next.js 15 + React 19 + tRPC v11 + Tailwind CSS v4（README 旧文档标注 Next 14/NextAuth/Zustand 已过时）。
- 状态管理：使用 TanStack Query（未使用 Zustand）。
- .env 模板：仓库无 `.env.example`，需手动创建或使用脚本生成。
- 数据库文件：实际为 `prisma/db.sqlite`（不是 `data/database/unicatcher.db`）。
- 分析接口：`/api/external/analysis/*` 为占位实现（pending/complete），供后续扩展。

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18（Docker 镜像使用 Node 20-slim）

### 依赖检查（可选）
```bash
npm run check-deps
```

### 本地开发（macOS/Linux）
```bash
git clone <repository-url>
cd unicatcher

npm install
npm run setup-dev       # 生成 .env（DATABASE_URL 指向 prisma/db.sqlite），推送 schema，生成 Prisma Client
npm run safe-init-db    # 二次校验/生成，必要时写入示例数据
npx playwright install chromium

npm run dev             # 启动开发服务（默认端口 3067）
```

### 本地开发（Windows）
优先使用 NPM 脚本（已封装 PowerShell 安装脚本）：
```powershell
git clone <repository-url>
cd unicatcher

npm install
npm run setup-dev
npm run safe-init-db
npx playwright install chromium

npm run dev

# 或者使用增强安装脚本
npm run install-windows           # 简化安装
npm run install-windows-verbose   # 详细日志
```

### Docker 部署
```bash
git clone <repository-url>
cd unicatcher

# 创建 .env（示例见下）
cat > .env << 'EOF'
NODE_ENV=production
PORT=3067
AUTH_SECRET=change-me-in-production
NEXTAUTH_URL=http://localhost:3067
DATABASE_URL=file:./prisma/db.sqlite
ENABLE_RESOURCE_OPTIMIZATION=true
EOF

docker-compose up -d --build
# 查看健康状态
npm run docker:health
```

如服务器已有其它业务：
- 如 3067 端口冲突，可在 `.env` 中改 `PORT=8080`，或在 `docker-compose.yml` 中改映射 `8080:3067`
- 如需统一入口，建议置于现有反向代理（Nginx/Caddy/Traefik）后，仅暴露代理端口

Docker 会映射数据卷以持久化：
- `/app/data`（日志、浏览器数据） → `unicatcher-data`
- `/app/prisma`（SQLite 文件） → `unicatcher-db`

### 默认登录
- 用户名：`admin`
- 密码：`a2885828`

---

## 🛠 技术栈（现状）
- 应用：Next.js 15（App Router）+ TypeScript
- API：tRPC v11（服务端在 `src/server/api`）
- ORM/DB：Prisma + SQLite（`prisma/db.sqlite`）
- 样式：Tailwind CSS v4
- 数据获取：TanStack Query（React Query v5）
- 认证：极简本地认证（`src/lib/simple-auth.ts` + `src/middleware.ts`），通过 cookie `unicatcher-auth`
- 爬虫：Playwright（Chromium，无头可配）

---

## 📁 目录与数据
- 代码关键位置：
  - tRPC 路由：`src/server/api/routers/{tasks,tweets,system,extracts}.ts`
  - REST 外部 API：`src/app/api/external/*`
  - 健康检查：`src/app/api/health/route.ts`
  - 爬虫核心：
    - 浏览器：`src/server/core/browser/manager.ts`
    - 选择器：`src/server/core/spider/selectors/twitter.ts`
    - 任务执行：`src/server/core/tasks/executor.ts`
    - 数据存储：`src/server/core/data/storage.ts`
  - Web 页面：`/dashboard`、`/tasks`、`/tweets`、`/extracts`、`/api-docs`
- 数据持久化：
  - 数据库文件：`prisma/db.sqlite`
  - 浏览器会话：`data/browser-state.json`（自动读写）
  - 日志目录：`data/logs`

---

## ⚙ 配置与环境变量
必需/常用环境变量：
```bash
AUTH_SECRET=change-me-in-production
DATABASE_URL=file:./prisma/db.sqlite
NODE_ENV=development
PORT=3067
NEXTAUTH_URL=http://localhost:3067   # 仅用于生成 baseUrl（并未启用 NextAuth）
ENABLE_RESOURCE_OPTIMIZATION=true     # 资源拦截优化（节流图片/媒体请求）
```

Playwright 浏览器路径会自动在服务端启动时设置：
- Windows：`%USERPROFILE%/AppData/Local/ms-playwright`
- Linux/macOS（容器用户）：`/home/appuser/.cache/ms-playwright`

---

## 🧭 管理与 API

### 管理后台
`/dashboard`、`/tasks`、`/tweets`、`/extracts` 四大模块已可用。

### tRPC（内部 API）
命名空间：`tasks.*`、`tweets.*`、`system.*`、`extracts.*`。页面均已对接（详见 `src/app/*`）。

### REST（外部 API）
- 任务管理：`/api/external/tasks`（POST 创建、GET 列表、GET /[id] 详情）
- 数据获取：`/api/external/data/[taskId]`（JSON/CSV）
- 批量提取：`/api/external/data/extract`（支持 dryRun 与足额返回）
- 分析占位：`/api/external/analysis/pending`、`/api/external/analysis/complete`（占位，需二次实现）

API Key 认证（演示用）：在请求头使用 `X-API-Key: unicatcher-api-key-demo` 或 `Authorization: Bearer unicatcher-api-key-demo`。

完整示例与 cURL 请访问页面文档：`/api-docs`

---

## 🧑‍💻 常用命令
```bash
# 开发
npm run dev

# 构建/启动
npm run build && npm run start

# 数据库
npm run db:push
npm run db:generate
npm run db:studio           # 端口 5555

# Docker
npm run docker:build
npm run docker:up
npm run docker:logs

# 健康检查
npm run docker:health
```

---

## 🔒 认证说明（当前实现）
- 登录页：`/login`，固定账号密码（见上）。
- 会话存储：浏览器 `localStorage` + cookie `unicatcher-auth`。
- 中间件：`src/middleware.ts` 拦截受保护路由并重定向到 `/login`。
- tRPC 保护：`protectedProcedure` 通过 cookie 解析会话。

如需替换为 NextAuth/OAuth，请在未来迭代替换 `simple-auth.ts` 与相关中间件。

---

## 🧪 爬虫说明（Twitter List）
- 入口：`TaskExecutor.executeTwitterListTask` → `TwitterSelector` → `StorageService`
- 去重策略：数据库重复、任务内重复（跨滚动）分离统计
- 结束条件：目标数量、连续数据库重复、无更多内容、错误、超时等
- 可调参数：`src/lib/config.ts` 中 `spider.twitterList.*` 与资源优化配置

---

## ✅ 维护与升级建议
- 将 API Key 移至环境变量并替换默认演示值
- 若部署在服务器，建议启用 Docker 并使用健康检查与日志采集
- 定期运行 `db:studio` 检查数据，或通过 `extracts` 页面导出/审计

---

## 版本与计划（简）
- 当前：基础采集、后台与外部接口已就绪；分析相关接口为占位
- 后续：
  - 接入真实分析管道，完善 `/api/external/analysis/*`
  - 替换极简认证为 NextAuth/OAuth（如需）
  - 丰富 UI 与数据可视化

---

© UniCatcher | 技术栈：Next.js + tRPC + Prisma + Playwright


