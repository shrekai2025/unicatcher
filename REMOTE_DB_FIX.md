# 🔧 远程数据库页面修复指南

## 问题诊断结果
- ✅ 主应用 `http://43.153.84.145:3067/` 正常运行
- ❌ Prisma Studio `http://43.153.84.145:5555/` 无法访问

## 立即解决方案

### 方案1：启动Prisma Studio（推荐）

在服务器上执行：
```bash
# 1. 进入应用目录
cd /opt/unicatcher  # 或你的实际部署目录

# 2. 启动Prisma Studio并绑定到所有网络接口
npx prisma studio --port 5555 --hostname 0.0.0.0 &

# 3. 确认启动成功
netstat -tlnp | grep 5555
```

### 方案2：检查防火墙设置

```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 5555

# CentOS/RHEL
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload
```

### 方案3：云服务商安全组
如果使用阿里云/腾讯云，需要在控制台的安全组中开放5555端口。

## 一键修复脚本

在服务器上创建并运行：
```bash
#!/bin/bash
echo "🔧 启动Prisma Studio..."

# 查找应用目录
for dir in "/opt/unicatcher" "/home/ubuntu/unicatcher" "/root/unicatcher" "/var/www/unicatcher"; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo "找到应用目录: $dir"
        cd "$dir"
        
        # 检查是否已有Prisma Studio运行
        if pgrep -f "prisma studio" > /dev/null; then
            echo "Prisma Studio已在运行，正在重启..."
            pkill -f "prisma studio"
            sleep 2
        fi
        
        # 启动Prisma Studio
        echo "启动Prisma Studio在端口5555..."
        npx prisma studio --port 5555 --hostname 0.0.0.0 > /dev/null 2>&1 &
        
        sleep 3
        
        # 验证启动
        if netstat -tlnp | grep 5555; then
            echo "✅ Prisma Studio启动成功！"
            echo "访问地址: http://43.153.84.145:5555/"
        else
            echo "❌ Prisma Studio启动失败"
        fi
        
        exit 0
    fi
done

echo "❌ 未找到UniCatcher应用目录"
```

## 永久解决方案

### 配置系统服务
创建systemd服务文件：

```bash
# 创建服务文件
sudo nano /etc/systemd/system/prisma-studio.service
```

内容：
```ini
[Unit]
Description=Prisma Studio
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/unicatcher
ExecStart=/usr/bin/npx prisma studio --port 5555 --hostname 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable prisma-studio
sudo systemctl start prisma-studio
sudo systemctl status prisma-studio
```

## 验证修复

执行修复后，测试访问：
```bash
curl -I http://localhost:5555/
curl -I http://43.153.84.145:5555/
```

## 当前可用的数据库访问方式

1. **主应用界面**：http://43.153.84.145:3067/
   - 应该包含推文数据查看功能
   
2. **SSH连接数据库**：
   ```bash
   sqlite3 /path/to/prisma/db.sqlite
   .tables
   SELECT * FROM Tweet LIMIT 5;
   ```

## 需要协助？

请提供以下信息：
1. 服务器上应用的实际部署目录
2. 执行 `ps aux | grep prisma` 的结果  
3. 执行 `netstat -tlnp | grep 5555` 的结果