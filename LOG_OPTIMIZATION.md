# 🔇 爬虫日志优化说明

## 📝 优化内容

### 1. 资源拦截日志优化
**位置**: `src/lib/config.ts`
- ✅ **默认关闭**详细的资源请求日志
- ✅ **环境变量控制**：`SPIDER_DEBUG=true` 开启调试模式

**修改前**：
```
✅ 允许资源: document - https://x.com/...
✅ 允许资源: script - https://abs.twimg.com/...
✅ 允许资源: stylesheet - https://abs.twimg.com/...
```

**修改后**：
```
# 默认模式：静默运行
✅ 浏览器资源优化已启用

# 调试模式 (SPIDER_DEBUG=true)：
✅ 允许: document - https://x.com/...
✅ 允许: script - https://abs.twimg.com/...
```

### 2. 网络捕获日志优化
**位置**: `src/server/core/spider/selectors/twitter.ts`

**修改前**：
```
🎯 捕获视频URL [1234567]: https://video.twimg.com/amplify_video/...
🖼️ 捕获预览图 [1234567]: https://pbs.twimg.com/amplify_video_thumb/...
🎯 捕获视频URL [7654321]: https://video.twimg.com/amplify_video/...
```

**修改后**：
```
# 默认模式：定期汇总（每10秒）
🎬 捕获媒体: 3 个

# 调试模式：详细统计（每5秒）
📊 媒体资源捕获统计: 3 个，视频缓存: 2 个
```

### 3. Timeline加载日志优化
**位置**: `src/server/core/spider/selectors/twitter.ts`

**修改前**：
```
正在等待Timeline容器加载...
尝试选择器: div[aria-label="Timeline: List"]
选择器 div[aria-label="Timeline: List"] 失败，尝试下一个...
尝试选择器: [data-testid="primaryColumn"]
Timeline容器已加载 (使用选择器: [data-testid="primaryColumn"])
```

**修改后**：
```
🔍 等待页面加载...
✅ Timeline容器已加载 (方案2)
```

## 🎛️ 调试模式控制

### 启用调试模式
```bash
# 开发环境 - 启用详细日志
export SPIDER_DEBUG=true
npm run dev

# 或者直接运行
SPIDER_DEBUG=true npm run dev
```

### 生产模式（默认）
```bash
# 生产环境 - 简洁日志
npm run dev
# 或
npm start
```

## 📊 日志级别对比

### 🔇 生产模式（默认）
```
🔍 等待页面加载...
✅ Timeline容器已加载 (方案1)
✅ 检测到 15 个推文，继续执行
🎬 捕获媒体: 5 个
✅ 成功提取推文: 15 条
```

### 🔊 调试模式 (`SPIDER_DEBUG=true`)
```
🔍 等待页面加载...
✅ Timeline容器已加载 (方案1)
✅ 检测到 15 个推文，继续执行
✅ 允许: document - https://x.com/i/lists/...
✅ 允许: script - https://abs.twimg.com/responsive-web/...
✅ 允许: stylesheet - https://abs.twimg.com/k/web/...
📊 媒体资源捕获统计: 5 个，视频缓存: 3 个
✅ 成功提取推文: 15 条，图片: 8张，视频: 3个
```

## 🎯 突出的重要环节

现在日志会重点显示：

### ✅ 关键成功事件
- 页面加载完成
- 推文提取数量
- 媒体资源捕获
- 任务完成状态

### ⚠️ 重要警告
- 登录状态异常
- 页面结构变化
- 媒体提取失败

### ❌ 错误信息
- 网络连接问题
- 选择器失效
- 任务执行失败

## 🚀 性能提升

### 日志输出减少
- **生产模式**：减少 ~80% 的日志输出
- **网络监听**：从逐条记录改为批量统计
- **选择器尝试**：隐藏中间步骤，只显示结果

### 可读性提升
- **统一图标**：🔍 🎬 ✅ ⚠️ ❌
- **信息密度**：关键信息集中显示
- **状态清晰**：进度和结果一目了然

## 📋 使用建议

### 日常开发
```bash
# 默认模式即可，日志简洁清晰
npm run dev
```

### 问题调试
```bash
# 启用详细日志，便于排查问题
SPIDER_DEBUG=true npm run dev
```

### 生产部署
```bash
# 确保未设置调试模式，保持性能
npm start
```

## 🔧 自定义配置

如需进一步调整日志级别，可修改：
- `src/lib/config.ts` - 资源拦截日志
- `src/server/core/spider/selectors/twitter.ts` - 媒体捕获日志
- `src/server/core/tasks/executor.ts` - 任务执行日志

日志优化完成！现在爬虫运行时的日志更加简洁，突出重要信息 🎉