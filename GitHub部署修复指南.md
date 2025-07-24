# UniCatcher GitHub 部署修复指南

## 🚨 **404错误解决方案**

您遇到的404错误是因为GitHub Raw文件URL路径问题。让我们一步步解决。

---

## 🔍 **问题诊断**

### **当前错误**
```bash
curl: (22) The requested URL returned error: 404
```

### **可能原因**
1. 文件路径不正确
2. 分支名称不对（可能是`main`或`master`）
3. 文件还未推送到GitHub
4. 仓库是私有的

---

## ✅ **解决步骤**

### **步骤1：确认GitHub仓库信息**
```bash
# 访问您的GitHub仓库页面确认：
# https://github.com/shrekai2025/unicatcher

# 检查以下信息：
# 1. 分支名称（main 或 master）
# 2. scripts/docker-deploy.sh 文件是否存在
# 3. 仓库是否为公开状态
```

### **步骤2：尝试正确的下载URL**
```bash
# 方法1：尝试main分支
curl -fsSL https://raw.githubusercontent.com/shrekai2025/unicatcher/main/scripts/docker-deploy.sh -o docker-deploy.sh

# 方法2：如果是master分支
curl -fsSL https://raw.githubusercontent.com/shrekai2025/unicatcher/master/scripts/docker-deploy.sh -o docker-deploy.sh

# 方法3：检查文件是否存在
curl -I https://raw.githubusercontent.com/shrekai2025/unicatcher/main/scripts/docker-deploy.sh
```

### **步骤3：手动克隆整个仓库（推荐）**
```bash
# 克隆整个仓库
git clone https://github.com/shrekai2025/unicatcher.git
cd unicatcher

# 检查文件是否存在
ls -la scripts/docker-deploy.sh

# 给脚本执行权限并运行
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

---

## 🚀 **推荐的部署方法**

### **方法A：完整克隆部署（最可靠）**
```bash
# 1. 克隆项目
git clone https://github.com/shrekai2025/unicatcher.git
cd unicatcher

# 2. 检查并运行部署脚本
if [ -f "scripts/docker-deploy.sh" ]; then
    chmod +x scripts/docker-deploy.sh
    ./scripts/docker-deploy.sh
else
    echo "docker-deploy.sh 文件不存在，使用手动部署"
fi
```

### **方法B：手动Docker部署**
```bash
# 如果脚本文件缺失，直接手动部署
git clone https://github.com/shrekai2025/unicatcher.git
cd unicatcher

# 安装Docker (如果未安装)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 重新登录或使用newgrp应用权限
newgrp docker

# 构建和启动服务
docker-compose build
docker-compose up -d

# 检查服务状态
docker-compose ps
curl http://localhost:3067/api/health
```

### **方法C：不使用Docker的直接部署**
```bash
# 1. 克隆项目
git clone https://github.com/shrekai2025/unicatcher.git
cd unicatcher

# 2. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装项目依赖
npm install

# 4. 安装Playwright
npx playwright install chromium
npx playwright install-deps chromium

# 5. 初始化环境
npm run setup-dev

# 6. 启动服务
npm run dev
```

---

## 📋 **登录状态处理**

### **复制登录状态文件**
```bash
# 如果您有本地的登录状态文件，复制到服务器
# 在本地机器上执行：
scp ./data/browser-state.json ubuntu@your-server-ip:~/unicatcher/data/

# 在服务器上验证
ls -la ~/unicatcher/data/browser-state.json
cd ~/unicatcher
npm run login-state
```

### **如果没有登录状态文件**
```bash
# 参考之前提供的无GUI登录方案：
# 1. VNC远程桌面
# 2. 虚拟显示器Xvfb  
# 3. 从本地复制登录状态
```

---

## 🛠 **故障排除**

### **如果GitHub仓库访问有问题**

#### **检查仓库状态**
```bash
# 检查仓库是否公开
curl -I https://api.github.com/repos/shrekai2025/unicatcher

# 检查特定文件
curl -I https://raw.githubusercontent.com/shrekai2025/unicatcher/main/package.json
```

#### **替代下载方法**
```bash
# 使用wget代替curl
wget https://raw.githubusercontent.com/shrekai2025/unicatcher/main/scripts/docker-deploy.sh

# 或使用GitHub CLI (如果安装了)
gh repo clone shrekai2025/unicatcher
```

### **如果Docker安装失败**

#### **Ubuntu Docker安装**
```bash
# 更新系统
sudo apt update

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加用户到docker组
sudo usermod -aG docker $USER
```

#### **安装Docker Compose**
```bash
# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

---

## 🎯 **立即执行的完整命令**

```bash
# 完整的一键部署命令（复制粘贴执行）
cd ~ && \
git clone https://github.com/shrekai2025/unicatcher.git && \
cd unicatcher && \
echo "🔍 检查项目文件..." && \
ls -la && \
echo "📋 检查package.json..." && \
cat package.json | head -20 && \
echo "🐳 开始Docker部署..." && \
if command -v docker &> /dev/null; then
    echo "✅ Docker已安装"
else
    echo "📦 安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "⚠️  请重新登录以应用Docker权限"
fi
```

---

## 🔄 **如果仍然有问题**

### **创建临时部署脚本**
```bash
# 创建临时的部署脚本
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 UniCatcher 手动部署脚本"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "📦 安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "重新登录后继续..."
    exit 1
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 构建和启动
echo "🔨 构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

echo "🩺 检查服务状态..."
docker-compose ps

echo "✅ 部署完成！"
echo "访问: http://$(curl -s ifconfig.me):3067"
EOF

chmod +x deploy.sh
./deploy.sh
```

现在请尝试以上任一方法，推荐直接使用完整克隆的方式！ 