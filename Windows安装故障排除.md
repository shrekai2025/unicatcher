# Windows安装故障排除指南

## 🚨 常见问题及解决方案

### **1. Prisma生成错误**

**错误信息**：
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp' -> 'query_engine-windows.dll.node'
```

**解决方案**：
```powershell
# 步骤1：关闭所有编辑器和开发工具
# - 关闭VS Code
# - 关闭WebStorm/IntelliJ
# - 关闭任何Node.js进程

# 步骤2：清理缓存
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force

# 步骤3：重新安装
npm install

# 如果还是失败，尝试管理员权限
# 右键点击PowerShell -> "以管理员身份运行"
```

### **2. PowerShell执行策略限制**

**错误信息**：
```
execution of scripts is disabled on this system
```

**解决方案**：
```powershell
# 临时绕过执行策略
powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1

# 或者设置执行策略（需要管理员权限）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **3. Node.js版本问题**

**检查Node.js版本**：
```powershell
node --version
# 需要v18.0.0或更高版本
```

**更新Node.js**：
1. 访问 https://nodejs.org/
2. 下载LTS版本
3. 安装后重启PowerShell

### **4. npm权限问题**

**解决方案**：
```powershell
# 清理npm缓存
npm cache clean --force

# 设置npm配置
npm config set cache C:\npm-cache --global
npm config set prefix C:\npm-global --global

# 或者使用yarn代替npm
npm install -g yarn
yarn install
```

### **5. Playwright浏览器安装失败**

**解决方案**：
```powershell
# 手动安装Chromium
npx playwright install chromium

# 如果网络问题，设置镜像
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com"
npx playwright install chromium

# 验证安装
npx playwright --version
```

### **6. 端口占用问题**

**检查端口3067**：
```powershell
netstat -ano | findstr :3067
```

**释放端口**：
```powershell
# 找到占用进程的PID，然后
taskkill /PID <PID> /F
```

## 🔧 手动安装步骤

如果自动安装脚本失败，请按以下步骤手动安装：

```powershell
# 1. 克隆项目
git clone <repository-url>
cd unicatcher

# 2. 检查环境
node --version  # 应该是v18+
npm --version   # 应该是9+

# 3. 安装依赖（分步执行）
npm install --no-optional
npm run setup-dev

# 4. 初始化数据库
npm run safe-init-db

# 5. 安装Playwright
npx playwright install chromium

# 6. 启动项目
npm run dev
```

## 📋 环境检查清单

安装前请确认：

- [ ] Windows 10/11
- [ ] Node.js 18+
- [ ] npm 9+
- [ ] PowerShell 5.0+
- [ ] 足够的磁盘空间（至少2GB）
- [ ] 网络连接正常
- [ ] 杀毒软件未拦截
- [ ] 管理员权限（可选）

## 🆘 获取帮助

如果以上方案都无法解决问题：

1. 运行诊断脚本：
   ```powershell
   npm run check-deps
   ```

2. 收集错误信息：
   - 错误消息截图
   - Node.js版本：`node --version`
   - npm版本：`npm --version`
   - 系统版本：`systeminfo | findstr /B /C:"OS"`

3. 查看详细日志：
   ```powershell
   npm install --verbose
   ``` 