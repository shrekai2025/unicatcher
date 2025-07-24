# UniCatcher 手动登录指南

UniCatcher提供了两种方式来预先登录Twitter账号，以确保爬虫能够正常访问您的数据。

## 🚀 快速开始

### 方法一：快速登录（推荐）
```bash
npm run quick-login
```

这是最简单的方法，使用纯Playwright实现，稳定性更好。

### 方法二：集成登录
```bash
npm run login
```

使用项目内置的BrowserManager，与爬虫系统完全一致。

## 📋 详细步骤

### 1. 运行登录脚本
选择上述任一方法运行登录脚本。

### 2. 浏览器自动打开
- 脚本会自动打开Chrome浏览器
- 导航到Twitter登录页面 (https://x.com/login)

### 3. 手动登录
在打开的浏览器中：
- 输入您的Twitter用户名/邮箱
- 输入密码
- 完成2FA验证（如果启用）
- 确保能正常看到Twitter主页

### 4. 确认并保存
- 登录成功后，回到控制台
- 按Enter键（或任意键）继续
- 脚本会自动验证和保存登录状态

## ⚠️ 重要注意事项

### 账号权限
- 确保使用的Twitter账号有权限访问您要爬取的List
- 如果List是私有的，确保您的账号已被添加到该List中

### 验证要求
- 如果Twitter要求短信验证或邮箱验证，请正常完成
- 如果出现CAPTCHA，请手动解决
- 某些地区可能需要VPN，请确保网络连接稳定

### 数据保存
- 登录状态会保存到 `./data/browser-state.json`
- 这个文件包含cookies和会话信息
- 请勿分享这个文件，它包含您的登录凭据

## 🔍 验证登录是否成功

### 方法1：检查文件
```bash
# 检查是否生成了登录状态文件
ls -la data/browser-state.json
```

### 方法2：测试爬虫
1. 启动开发服务器：`npm run dev`
2. 访问：http://localhost:3067/tasks
3. 创建一个Twitter List爬取任务
4. 观察是否能正常爬取数据

## 🔧 故障排除

### 登录失败
```bash
# 清除旧的登录状态
rm data/browser-state.json

# 重新运行登录脚本
npm run quick-login
```

### 浏览器无法启动
```bash
# 重新安装Playwright浏览器
npx playwright install chromium
```

### 权限问题
- 确保账号没有被限制
- 检查Twitter账号状态是否正常
- 尝试在普通浏览器中手动访问目标List

## 🎯 使用建议

### 最佳实践
1. **使用专用账号**：建议为爬虫使用专门的Twitter账号
2. **定期更新**：每周重新登录一次以保持会话有效
3. **备份状态**：定期备份 `browser-state.json` 文件

### 频率控制
- 不要过于频繁地重新登录
- 如果爬虫正常工作，无需重复登录
- 只有在遇到登录相关错误时才重新登录

## 📱 下一步

登录完成后，您可以：

1. **启动服务**：`npm run dev`
2. **访问管理界面**：http://localhost:3067
3. **创建爬取任务**：在Tasks页面添加Twitter List
4. **监控数据**：在Dashboard查看爬取进度

## 🆘 获取帮助

如果遇到问题：
1. 检查网络连接
2. 确认Twitter账号状态
3. 查看控制台错误信息
4. 尝试清除登录状态重新登录 