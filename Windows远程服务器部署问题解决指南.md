# UniCatcher Windows远程服务器部署问题解决指南

## 🚨 **问题概览**

经过深入分析，UniCatcher项目在远程Windows服务器上部署时主要面临以下几类问题：

### **核心问题分类**

| 问题类型 | 严重程度 | 影响范围 | 主要症状 |
|---------|---------|---------|---------|
| **文件权限问题** | 🔴 高 | 安装/运行 | EPERM错误、文件锁定 |
| **JWT会话错误** | 🔴 高 | 认证系统 | JWTSessionError、登录失败 |
| **数据库权限** | 🟡 中 | 数据存储 | SQLite连接失败 |
| **浏览器自动化** | 🟡 中 | 爬虫功能 | Playwright启动失败 |
| **环境配置** | 🟡 中 | 系统启动 | 环境变量缺失 |

---

## 🛠️ **快速修复流程**

### **步骤1：环境检查**
```powershell
# 以管理员身份运行PowerShell
# 运行环境检查脚本
.\scripts\windows-server-check.ps1 -Detailed

# 如果发现问题，运行自动修复
.\scripts\windows-server-check.ps1 -Fix
```

### **步骤2：权限修复**
```powershell
# 修复Windows文件权限问题
.\scripts\fix-windows-permissions.ps1

# 或者使用npm命令
npm run fix-permissions
```

### **步骤3：JWT配置修复**
```powershell
# 修复JWT会话配置
npm run fix-jwt-session

# 验证认证配置
npm run debug-auth
```

### **步骤4：标准安装流程**
```powershell
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run safe-init-db

# 3. 安装Playwright浏览器
npx playwright install chromium

# 4. 启动应用
npm run dev
```

---

## 🔧 **详细问题分析与解决方案**

### **问题1：文件权限错误 (EPERM)**

**症状表现：**
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp' -> 'query_engine-windows.dll.node'
```

**根本原因：**
- Windows文件系统权限限制
- 多个进程同时访问同一文件
- 防病毒软件干扰
- 用户权限不足

**解决方案：**

1. **立即解决：**
   ```powershell
   # 停止所有Node.js进程
   Get-Process -Name "node" | Stop-Process -Force
   
   # 清理Prisma缓存
   Remove-Item -Recurse -Force node_modules\.prisma
   
   # 以管理员身份重新安装
   npm install
   ```

2. **永久解决：**
   ```powershell
   # 运行权限修复脚本
   .\scripts\fix-windows-permissions.ps1
   ```

3. **预防措施：**
   - 关闭所有编辑器和开发工具
   - 添加防病毒软件白名单
   - 使用管理员权限运行

### **问题2：JWT Session错误**

**症状表现：**
```
JWTSessionError: JWT malformed
NextAuthError: Invalid JWT token
Session not found or expired
```

**根本原因：**
- AUTH_SECRET未设置或无效
- NEXTAUTH_URL配置错误
- 系统时间不同步
- JWT token格式问题

**解决方案：**

1. **环境变量修复：**
   ```bash
   # .env文件内容
   DATABASE_URL="file:./prisma/db.sqlite"
   AUTH_SECRET="your-32-character-secret-key-here"
   NEXTAUTH_URL="http://your-server-ip:3067"
   NODE_ENV="production"
   PORT=3067
   ```

2. **自动修复：**
   ```powershell
   npm run fix-jwt-session
   ```

3. **手动验证：**
   ```powershell
   npm run debug-auth
   ```

### **问题3：数据库权限问题**

**症状表现：**
```
SQLITE_CANTOPEN: unable to open database file
Permission denied accessing ./prisma/db.sqlite
```

**解决方案：**

 1. **创建数据库目录：**
    ```powershell
    mkdir -p prisma
    mkdir -p data\logs
    mkdir -p data\browser-data
    ```

 2. **设置目录权限：**
    ```powershell
    # 给当前用户完全控制权限
    icacls prisma /grant "%USERNAME%:F" /T
    icacls data /grant "%USERNAME%:F" /T
    ```

3. **安全初始化：**
   ```powershell
   npm run safe-init-db
   ```

### **问题4：Playwright浏览器问题**

**症状表现：**
```
Error: Executable doesn't exist at C:\Users\...\AppData\Local\ms-playwright\chromium-xxx\chrome.exe
BrowserContext creation failed
```

**解决方案：**

1. **检查安装路径：**
   ```powershell
   # 检查Playwright浏览器
   npx playwright install --dry-run
   ```

2. **重新安装浏览器：**
   ```powershell
   # 清理旧版本
   npx playwright uninstall chromium
   
   # 重新安装
   npx playwright install chromium
   ```

3. **环境变量设置：**
   ```powershell
   $env:PLAYWRIGHT_BROWSERS_PATH = "$env:USERPROFILE\AppData\Local\ms-playwright"
   ```

---

## 📋 **完整部署检查清单**

### **部署前检查**
- [ ] **系统要求**
  - [ ] Windows Server 2012+ 或 Windows 10+
  - [ ] PowerShell 5.0+
  - [ ] .NET Framework 4.7.2+
  - [ ] 至少5GB可用磁盘空间

- [ ] **用户权限**
  - [ ] 管理员权限或文件系统写权限
  - [ ] 防火墙端口3067开放
  - [ ] 防病毒软件白名单设置

- [ ] **Node.js环境**
  - [ ] Node.js 18.0.0+
  - [ ] npm 8.0.0+
  - [ ] 网络连接正常

### **部署过程检查**
- [ ] **文件权限**
  - [ ] 项目目录可写
  - [ ] data目录创建成功
  - [ ] node_modules权限正常

- [ ] **环境配置**
  - [ ] .env文件存在且配置正确
  - [ ] AUTH_SECRET强度足够
  - [ ] NEXTAUTH_URL匹配服务器地址

- [ ] **依赖安装**
  - [ ] npm install成功
  - [ ] Prisma客户端生成成功
  - [ ] Playwright浏览器安装成功

### **部署后验证**
- [ ] **服务启动**
  - [ ] `npm run dev` 启动成功
  - [ ] 端口3067监听正常
  - [ ] 健康检查通过

- [ ] **功能验证**
  - [ ] Web界面可访问 (http://server-ip:3067)
  - [ ] 登录功能正常
  - [ ] API接口响应正常
  - [ ] 数据库连接正常

---

## 🆘 **故障排除工具**

### **诊断命令**
```powershell
# 1. 环境检查
.\scripts\windows-server-check.ps1 -Detailed

# 2. 权限检查
.\scripts\fix-windows-permissions.ps1

# 3. JWT配置检查
npm run fix-jwt-session

# 4. 认证调试
npm run debug-auth

# 5. 健康检查
npm run docker:health
```

### **日志查看**
```powershell
# 查看应用日志
Get-Content .\data\logs\*.log -Tail 50

# 查看系统事件
Get-EventLog -LogName Application -Newest 20 | Where-Object {$_.Source -like "*Node*"}
```

### **服务管理**
```powershell
# 停止所有相关进程
Get-Process -Name "node","npm" | Stop-Process -Force

# 清理缓存
npm cache clean --force
Remove-Item -Recurse node_modules\.next -ErrorAction SilentlyContinue

# 重启服务
npm run dev
```

---

## 📞 **常见错误代码对照表**

| 错误代码 | 错误描述 | 解决方案 |
|---------|---------|---------|
| `EPERM` | 权限不足 | 使用管理员权限或修复文件权限 |
| `EACCES` | 访问被拒绝 | 检查文件权限和用户权限 |
| `ENOENT` | 文件不存在 | 确保路径正确，创建缺失的目录 |
| `ECONNREFUSED` | 连接被拒绝 | 检查端口占用和防火墙设置 |
| `JWTSessionError` | JWT会话错误 | 修复AUTH_SECRET和时间同步 |
| `DATABASE_URL` | 数据库连接错误 | 检查SQLite文件路径和权限 |

---

## 🎯 **最佳实践建议**

### **部署环境**
1. **使用专用服务器账户**：创建专门的服务账户运行应用
2. **设置合适的权限**：给予必要的最小权限
3. **定期备份**：备份数据库和配置文件
4. **监控日志**：设置日志轮转和监控

### **安全配置**
1. **强化AUTH_SECRET**：使用32位以上随机字符串
2. **限制网络访问**：配置防火墙规则
3. **更新依赖**：定期更新npm包到最新版本
4. **SSL/TLS**：生产环境使用HTTPS

### **性能优化**
1. **资源优化**：启用ENABLE_RESOURCE_OPTIMIZATION
2. **缓存策略**：合理配置浏览器缓存
3. **进程管理**：使用PM2等进程管理器
4. **监控指标**：监控内存、CPU和磁盘使用

---

## 📚 **相关文档**

- [Windows安装故障排除](./Windows安装故障排除.md)
- [服务器部署完整指南](./服务器部署完整指南.md)
- [登录状态复制使用指南](./登录状态复制使用指南.md)
- [API使用指南](./API使用指南.md)

---

**🎉 部署成功后，访问 `http://your-server-ip:3067` 开始使用UniCatcher！** 