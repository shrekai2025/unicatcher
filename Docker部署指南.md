# UniCatcher Docker 部署指南

本指南详细介绍如何在Ubuntu环境下使用Docker部署UniCatcher项目，包括自动更新机制。

## 🎯 **问题解答**

### ✅ **是否能使用Docker安装到Ubuntu？**
**答案：完全可以！** UniCatcher已经提供了完整的Docker解决方案，支持Ubuntu环境下的容器化部署。

### ✅ **Docker是否能自动更新软件版本？**
**答案：是的！** 我们使用Watchtower实现自动更新，可以定时检查并更新到最新版本。

---

## 🚀 **快速开始**

### **一键部署（推荐）**
```bash
# 克隆项目
git clone <your-repo-url>
cd unicatcher

# 运行一键部署脚本
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

### **手动部署**
```bash
# 1. 构建并启动服务
docker-compose build
docker-compose up -d unicatcher

# 2. 检查服务状态
docker-compose ps

# 3. 查看健康状态
curl http://localhost:3067/api/health
```

---

## 📦 **Docker组件说明**

### **核心服务**
- **unicatcher**: 主应用服务
- **nginx**: 反向代理（可选，生产环境）
- **watchtower**: 自动更新服务
- **backup**: 自动备份服务

### **数据持久化**
- **unicatcher-data**: 应用数据
- **unicatcher-browser**: 浏览器配置和状态
- **unicatcher-db**: SQLite数据库
- **unicatcher-logs**: 日志文件

---

## 🔄 **自动更新机制**

### **1. Watchtower自动更新**

#### **启用自动更新**
```bash
# 启用自动更新（每天凌晨2点检查）
docker-compose --profile autoupdate up -d watchtower

# 或使用管理脚本
./scripts/docker-manager.sh enable-update
```

#### **配置更新策略**
```yaml
# docker-compose.yml中的配置
watchtower:
  environment:
    - WATCHTOWER_SCHEDULE=0 0 2 * * *  # 每天凌晨2点
    - WATCHTOWER_CLEANUP=true          # 清理旧镜像
    - WATCHTOWER_LABEL_ENABLE=true     # 只更新标记的容器
```

#### **更新通知**
```bash
# 配置Slack通知（可选）
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
docker-compose --profile autoupdate up -d watchtower
```

### **2. 手动更新**
```bash
# 使用管理脚本更新
./scripts/docker-manager.sh update

# 或手动执行
docker-compose stop unicatcher
docker-compose build --no-cache unicatcher
docker-compose up -d unicatcher
```

---

## 🛠 **部署配置**

### **1. 环境变量配置**
创建 `.env` 文件：
```env
# 基础配置
NODE_ENV=production
PORT=3067
AUTH_SECRET=unicatcher-secret-key-2024
NEXTAUTH_URL=http://localhost:3067
DATABASE_URL=file:./prisma/db.sqlite
ENABLE_RESOURCE_OPTIMIZATION=true

# 自动更新通知
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# 备份配置
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=7
```

### **2. 部署配置文件**
```yaml
# docker-compose.yml - 主要配置
version: '3.8'
services:
  unicatcher:
    build: .
    container_name: unicatcher-app
    ports:
      - "3067:3067"
    volumes:
      - unicatcher-data:/app/data
      - unicatcher-db:/app/prisma
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3067/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 📋 **管理命令**

### **使用Docker管理脚本**

```bash
# 给脚本添加执行权限
chmod +x scripts/docker-manager.sh

# 常用管理命令
./scripts/docker-manager.sh start         # 启动服务
./scripts/docker-manager.sh stop          # 停止服务
./scripts/docker-manager.sh restart       # 重启服务
./scripts/docker-manager.sh status        # 查看状态
./scripts/docker-manager.sh logs          # 查看日志
./scripts/docker-manager.sh update        # 更新服务
./scripts/docker-manager.sh backup        # 创建备份
./scripts/docker-manager.sh health        # 健康检查
```

### **原生Docker命令**

```bash
# 服务管理
docker-compose up -d                      # 启动所有服务
docker-compose stop                       # 停止所有服务
docker-compose restart unicatcher        # 重启主服务
docker-compose ps                         # 查看服务状态

# 日志查看
docker-compose logs -f unicatcher         # 实时日志
docker-compose logs --tail=100 unicatcher # 最近100行

# 进入容器
docker-compose exec unicatcher /bin/bash  # 进入容器Shell

# 数据管理
docker volume ls                          # 查看数据卷
docker volume inspect unicatcher-data    # 查看数据卷详情
```

---

## 💾 **备份与恢复**

### **自动备份**
```bash
# 启用自动备份（每24小时）
docker-compose --profile backup up -d backup

# 备份将保存在 ./backups/ 目录下
# 自动清理7天前的备份文件
```

### **手动备份**
```bash
# 创建即时备份
./scripts/docker-manager.sh backup

# 或手动执行
docker run --rm -v unicatcher-data:/data:ro -v $(pwd)/backups:/backup alpine \
  tar -czf /backup/unicatcher-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### **备份恢复**
```bash
# 从备份恢复
./scripts/docker-manager.sh restore

# 选择备份文件并确认恢复
```

---

## 🔧 **故障排除**

### **常见问题**

#### **1. 容器启动失败**
```bash
# 查看容器日志
docker-compose logs unicatcher

# 检查容器状态
docker-compose ps

# 重新构建镜像
docker-compose build --no-cache unicatcher
```

#### **2. 端口占用**
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3067

# 修改端口映射
# 在docker-compose.yml中修改 "3067:3067" 为 "8080:3067"
```

#### **3. 权限问题**
```bash
# 检查Docker权限
sudo usermod -aG docker $USER
# 重新登录生效

# 检查数据目录权限
sudo chown -R $USER:$USER ./data
```

#### **4. 内存不足**
```bash
# 检查系统资源
docker stats

# 限制容器内存使用
# 在docker-compose.yml中添加：
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

### **健康检查**
```bash
# 检查服务健康状态
curl http://localhost:3067/api/health

# 详细健康信息
curl -s http://localhost:3067/api/health | python3 -m json.tool
```

---

## 🏗 **生产环境配置**

### **使用Nginx反向代理**
```bash
# 启用生产环境配置
docker-compose --profile production up -d

# Nginx配置文件位置: ./nginx/nginx.conf
```

### **SSL证书配置**
```nginx
# nginx/nginx.conf
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://unicatcher:3067;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **监控和日志**
```bash
# 集成Prometheus监控（可选）
# 添加监控标签到docker-compose.yml

# 日志轮转配置
docker-compose exec unicatcher logrotate -f /etc/logrotate.conf
```

---

## 📊 **性能优化**

### **资源限制**
```yaml
# docker-compose.yml
services:
  unicatcher:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          memory: 1G
```

### **网络优化**
```yaml
# 使用自定义网络
networks:
  unicatcher-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## 🔒 **安全配置**

### **环境变量安全**
```bash
# 使用Docker secrets（推荐生产环境）
echo "your-secret-key" | docker secret create auth_secret -

# 在docker-compose.yml中引用
secrets:
  - auth_secret
```

### **网络安全**
```yaml
# 限制网络访问
networks:
  unicatcher-network:
    driver: bridge
    internal: true  # 禁止外网访问
```

---

## 📈 **升级策略**

### **蓝绿部署**
```bash
# 1. 构建新版本
docker-compose -f docker-compose.blue.yml build

# 2. 启动新版本（不同端口）
docker-compose -f docker-compose.blue.yml up -d

# 3. 验证新版本
curl http://localhost:3068/api/health

# 4. 切换流量（更新Nginx配置）
# 5. 停止旧版本
```

### **滚动更新**
```bash
# 使用Watchtower的滚动更新
WATCHTOWER_ROLLING_RESTART=true docker-compose --profile autoupdate up -d watchtower
```

---

## 🎉 **部署完成检查清单**

### **安装验证**
- [ ] Docker和Docker Compose已安装
- [ ] 项目已克隆到本地
- [ ] 环境变量已配置（.env文件）
- [ ] 脚本权限已设置（chmod +x）

### **服务验证**
- [ ] 容器启动成功（docker-compose ps）
- [ ] 健康检查通过（/api/health）
- [ ] Web界面可访问（localhost:3067）
- [ ] API文档可访问（/api-docs）

### **功能验证**
- [ ] 登录功能正常
- [ ] 爬虫任务可创建
- [ ] 数据可正常保存
- [ ] 日志记录正常

### **可选功能**
- [ ] 自动更新已启用
- [ ] 自动备份已启用
- [ ] 监控告警已配置
- [ ] SSL证书已配置（生产环境）

---

## 🔗 **相关文档**

- [Ubuntu部署指南.md](./Ubuntu部署指南.md) - 非Docker部署方案
- [API使用指南.md](./API使用指南.md) - API接口文档
- [项目开发规划方案.md](./项目开发规划方案.md) - 项目总体规划

---

## 📞 **技术支持**

如果在Docker部署过程中遇到问题：

1. **查看日志**: `docker-compose logs unicatcher`
2. **检查健康状态**: `curl http://localhost:3067/api/health`
3. **重启服务**: `docker-compose restart unicatcher`
4. **重新构建**: `docker-compose build --no-cache unicatcher`

**总结**: UniCatcher提供了完整的Docker解决方案，支持一键部署、自动更新、自动备份等企业级功能。在Ubuntu环境下部署简单可靠，是推荐的生产部署方式。 