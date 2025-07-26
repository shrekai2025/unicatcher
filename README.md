# UniCatcher 通用浏览器爬虫系统

UniCatcher是一个基于T3 Stack开发的通用浏览器爬虫系统，支持代码分析爬取和视觉AI分析爬取两种模式。

***
## win直接部署（非docker）

# 克隆项目
git clone <项目地址>
cd unicatcher
# 3. 清理 npm 全局缓存
npm cache verify
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# 一键安装（自动检测和修复所有问题）
npm run install-windows

# 详细输出模式（用于调试）
npm run install-windows-verbose

***手动
// 清理系统
npm cache clean --force
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue
// 安装
npm install
//  创建.env文件
$envContent = @'
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="unicatcher-2024-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="production"
PORT=3067
'@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
// 生成Prisma客户端
npx prisma generate
// 创建数据库
npx prisma db push
// 安装Playwright浏览器到正确的Windows路径
npx playwright install chromium
// 测试配置是否正确
node -e "
require('dotenv').config();
const os = require('os');
const path = require('path');

console.log('平台:', process.platform);
console.log('用户目录:', os.homedir());

if (process.platform === 'win32') {
  const expectedPath = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  console.log('预期Playwright路径:', expectedPath);
} else {
  console.log('预期Playwright路径: /home/appuser/.cache/ms-playwright');
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);

***

使用Prisma Studio(5555端口数据库)

// 启动Prisma Studio
npm run db:studio

// 或者直接运行
npx prisma studio

***

更新项目
// 拉取最新代码
git pull origin main
// 放弃本地的所有修改
git fetch --all
拉取远程仓库的最新信息，但不会修改你的本地代码。
git reset --hard origin/main
强制将本地分支重置为远程 main 分支的状态，丢弃所有未提交的改动和本地提交。

// 或者指定分支
git pull origin master

// 更新所有依赖到最新版本
npm update

// 或者删除node_modules重新安装
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install

// 重装数据库
taskkill /f /im node.exe /t
Remove-Item -Recurse -Force node_modules\.prisma\client
npx prisma generate



## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm 或 pnpm

### 预检查依赖
在安装前，可以运行依赖检查脚本：
```bash
# 检查所有依赖
npm run check-deps
```

### 一键安装

#### Linux/macOS
```bash
# 克隆项目
git clone <repository-url>
cd unicatcher

# 给安装脚本执行权限
chmod +x scripts/install.sh

# 一键安装
./scripts/install.sh

# 启动开发服务器
npm run dev
```

#### Windows
```powershell
# 克隆项目
git clone <repository-url>
cd unicatcher

# 方法1：使用PowerShell安装脚本（推荐）
powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1

# 方法2：手动安装
npm install
npm run setup-dev
npm run safe-init-db
npx playwright install chromium
npm run dev
```

#### Docker部署
```bash
# 克隆项目
git clone <repository-url>
cd unicatcher

# 复制环境配置
cp .env.example .env

# 启动Docker服务
docker-compose up -d
```

访问 http://localhost:3067

### 默认登录信息
- 用户名：`admin`
- 密码：`a2885828`

## 🛠 技术栈

### 核心框架
- **框架**: T3 Stack (Next.js 14 + TypeScript + App Router)
- **API层**: tRPC (类型安全的API)
- **数据库**: SQLite + Prisma ORM
- **认证**: NextAuth.js
- **样式**: Tailwind CSS
- **状态管理**: Zustand

### 爬虫引擎
- **代码分析爬虫**: Playwright + TypeScript (第一阶段)
- **视觉分析爬虫**: Playwright + Midscene.js (第二阶段，当前预留接口)
- **任务调度**: 内置异步任务队列
- **浏览器**: 仅支持Chromium，headless模式可配置

## 📁 项目结构

```
unicatcher/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React组件
│   ├── lib/
│   │   └── config.ts          # 全局配置文件
│   ├── server/                # tRPC服务端
│   │   ├── api/               # API路由
│   │   └── core/              # 核心业务逻辑
│   │       ├── spider/        # 爬虫引擎
│   │       ├── browser/       # 浏览器管理
│   │       └── tasks/         # 任务调度
│   └── types/                 # TypeScript类型定义
├── prisma/                    # 数据库配置
├── data/                      # 数据存储
│   ├── database/              # SQLite数据库
│   ├── logs/                  # 日志文件
│   └── browser-data/          # 浏览器用户数据
├── scripts/
│   └── setup-dev.js          # 开发环境设置脚本
└── .vscode/                   # VS Code配置
```

## ⚙ 配置选项

### 全局配置 (`src/lib/config.ts`)
```typescript
export const config = {
  app: {
    port: 3067,                      // 开发服务器端口
  },
  playwright: {
    browser: 'chromium',             // 浏览器类型
    headless: true,                  // 无头模式 (可切换为false调试)
    userDataDir: './data/browser-data',
  },
  auth: {
    username: 'admin',               // 管理后台用户名
    password: 'a2885828',            // 管理后台密码
  },
  spider: {
    maxConcurrentTasks: 3,           // 最大并发任务
    taskTimeout: 300000,             // 任务超时(5分钟)
  },
};
```

## 📝 开发命令

```bash
# 开发环境
npm run dev          # 启动开发服务器 (端口3067)
npm run setup-dev    # 一键环境设置

# 数据库
npm run db:push      # 推送数据库更改
npm run db:studio    # 打开数据库管理界面
npm run db:generate  # 生成Prisma客户端

# 构建部署
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run preview      # 预览构建结果

# 代码质量
npm run typecheck    # TypeScript类型检查

# Playwright
npx playwright install chromium  # 安装浏览器依赖
```

## 🎯 功能特性

### 第一阶段 (当前开发)
- ✅ T3 Stack基础架构
- ✅ 端口3067配置 (优化：使用cross-env设置环境变量)
- ✅ 全局配置文件 (优化：从环境变量读取配置)
- ✅ 开发环境自动化
- ✅ 配置优化 (统一配置来源，清理T3默认代码)
- 🔄 固定账号认证系统 (Phase 1.3)
- 🔄 Playwright代码分析爬虫
- 🔄 简约管理后台界面

### 第二阶段 (预留接口)
- 📋 视觉分析爬虫 (Playwright + Midscene)
- 📋 高级数据管理
- 📋 外部API接口

## 📊 管理界面

访问 http://localhost:3067 查看管理后台，包含：

1. **模板管理**: 查看采集规则模板（仅展示，不可编辑）
2. **任务管理**: 提交和监控爬取任务
3. **数据查看**: 查看和导出爬取数据
4. **系统配置**: 基础配置选项

## 🔧 开发指南

### VS Code推荐扩展
- ESLint
- Prettier - Code formatter  
- Prisma
- Tailwind CSS IntelliSense
- Playwright Test for VSCode

### 调试配置
项目已配置VS Code调试，按F5启动调试模式。

### 数据库管理
```bash
# 查看数据库
npm run db:studio

# 重置数据库
rm data/database/unicatcher.db
npm run db:push
```

## 📋 开发计划

当前处于 **Phase 1.2: 基础架构配置** 阶段

- [x] Phase 1.1: T3项目初始化
- [ ] Phase 1.2: 基础架构配置
- [ ] Phase 2: Playwright爬虫引擎
- [ ] Phase 3: Web管理界面
- [ ] Phase 4: 高级功能完善
- [ ] Phase 5: 视觉分析爬虫预留

## 🤝 贡献

本项目基于AI vibe coding开发模式，采用增量式迭代开发。

---

**项目代号**: UniCatcher  
**技术栈**: T3 Stack (Next.js + TypeScript + tRPC + Prisma)  
**开发模式**: AI Vibe Coding  
**当前版本**: v1.0.0-alpha


