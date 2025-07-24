#!/bin/bash

# UniCatcher Docker部署脚本
# 适用于Ubuntu环境下的一键部署

set -e

echo "🐳 UniCatcher Docker 部署脚本"
echo "============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Docker是否安装
check_docker() {
    echo -e "${BLUE}📋 检查Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装。正在安装Docker...${NC}"
        install_docker
    else
        echo -e "${GREEN}✅ Docker已安装${NC}"
        docker --version
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose未安装。正在安装...${NC}"
        install_docker_compose
    else
        echo -e "${GREEN}✅ Docker Compose已安装${NC}"
        docker-compose --version
    fi
}

# 安装Docker
install_docker() {
    echo -e "${YELLOW}🔧 安装Docker...${NC}"
    
    # 更新包索引
    sudo apt-get update
    
    # 安装必要的包
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 设置稳定版仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # 启动Docker服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 添加当前用户到docker组
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✅ Docker安装完成${NC}"
    echo -e "${YELLOW}⚠️  请注销并重新登录以应用用户组更改${NC}"
}

# 安装Docker Compose
install_docker_compose() {
    echo -e "${YELLOW}🔧 安装Docker Compose...${NC}"
    
    # 下载最新版本的Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo -e "${GREEN}✅ Docker Compose安装完成${NC}"
}

# 创建环境配置文件
create_env_file() {
    echo -e "${BLUE}📝 创建环境配置文件...${NC}"
    
    if [ ! -f .env ]; then
        cat > .env << EOL
# UniCatcher Docker 环境配置
NODE_ENV=production
PORT=3067
AUTH_SECRET=unicatcher-secret-key-2024
NEXTAUTH_URL=http://localhost:3067
DATABASE_URL=file:./prisma/db.sqlite
ENABLE_RESOURCE_OPTIMIZATION=true

# 自动更新通知配置（可选）
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# 备份配置
BACKUP_ENABLED=false
BACKUP_RETENTION_DAYS=7
EOL
        echo -e "${GREEN}✅ 环境配置文件已创建：.env${NC}"
    else
        echo -e "${YELLOW}⚠️  环境配置文件已存在：.env${NC}"
    fi
}

# 创建必要的目录
create_directories() {
    echo -e "${BLUE}📁 创建必要的目录...${NC}"
    
    mkdir -p backups
    mkdir -p nginx
    mkdir -p data/{database,logs,browser-data}
    
    echo -e "${GREEN}✅ 目录创建完成${NC}"
}

# 构建和启动服务
deploy_services() {
    echo -e "${BLUE}🚀 构建和启动UniCatcher服务...${NC}"
    
    # 构建镜像
    echo -e "${YELLOW}🔨 构建Docker镜像...${NC}"
    docker-compose build --no-cache
    
    # 启动核心服务
    echo -e "${YELLOW}🚀 启动核心服务...${NC}"
    docker-compose up -d unicatcher
    
    # 等待服务启动
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 30
    
    # 检查服务状态
    check_service_health
}

# 检查服务健康状态
check_service_health() {
    echo -e "${BLUE}🩺 检查服务健康状态...${NC}"
    
    # 等待最多2分钟
    for i in {1..24}; do
        if curl -f http://localhost:3067/api/health &> /dev/null; then
            echo -e "${GREEN}✅ UniCatcher服务运行正常！${NC}"
            break
        else
            echo -e "${YELLOW}⏳ 等待服务启动... (${i}/24)${NC}"
            sleep 5
        fi
        
        if [ $i -eq 24 ]; then
            echo -e "${RED}❌ 服务启动超时，请检查日志${NC}"
            docker-compose logs unicatcher
            exit 1
        fi
    done
}

# 启用自动更新
enable_auto_update() {
    echo -e "${BLUE}🔄 是否启用自动更新？ (y/N)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}🔄 启用自动更新服务...${NC}"
        docker-compose --profile autoupdate up -d watchtower
        echo -e "${GREEN}✅ 自动更新服务已启用（每天凌晨2点检查更新）${NC}"
    else
        echo -e "${YELLOW}⚠️  自动更新未启用，可后续通过以下命令启用：${NC}"
        echo "docker-compose --profile autoupdate up -d watchtower"
    fi
}

# 启用备份服务
enable_backup() {
    echo -e "${BLUE}💾 是否启用自动备份？ (y/N)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}💾 启用备份服务...${NC}"
        docker-compose --profile backup up -d backup
        echo -e "${GREEN}✅ 备份服务已启用（每24小时备份一次）${NC}"
    else
        echo -e "${YELLOW}⚠️  自动备份未启用，可后续通过以下命令启用：${NC}"
        echo "docker-compose --profile backup up -d backup"
    fi
}

# 显示部署信息
show_deployment_info() {
    echo -e "${GREEN}"
    echo "🎉 UniCatcher 部署完成！"
    echo "========================"
    echo -e "${NC}"
    echo -e "${BLUE}📍 访问地址：${NC} http://localhost:3067"
    echo -e "${BLUE}🩺 健康检查：${NC} http://localhost:3067/api/health"
    echo -e "${BLUE}📚 API文档：${NC} http://localhost:3067/api-docs"
    echo ""
    echo -e "${YELLOW}🔧 常用命令：${NC}"
    echo "  查看服务状态: docker-compose ps"
    echo "  查看日志:     docker-compose logs -f unicatcher"
    echo "  重启服务:     docker-compose restart unicatcher"
    echo "  停止服务:     docker-compose down"
    echo "  更新服务:     docker-compose pull && docker-compose up -d"
    echo ""
    echo -e "${YELLOW}📁 数据存储：${NC}"
    echo "  数据库:       Docker Volume (unicatcher-db)"
    echo "  用户数据:     Docker Volume (unicatcher-data)"
    echo "  浏览器数据:   Docker Volume (unicatcher-browser)"
    echo "  备份数据:     ./backups/"
}

# 主部署流程
main() {
    echo -e "${GREEN}开始部署UniCatcher...${NC}"
    
    # 检查是否为root用户
    if [ "$EUID" -eq 0 ]; then
        echo -e "${RED}❌ 请不要使用root用户运行此脚本${NC}"
        exit 1
    fi
    
    # 检查操作系统
    if [[ ! -f /etc/lsb-release ]] || ! grep -q "Ubuntu" /etc/lsb-release; then
        echo -e "${YELLOW}⚠️  此脚本针对Ubuntu进行了优化，其他Linux发行版可能需要调整${NC}"
    fi
    
    check_docker
    create_env_file
    create_directories
    deploy_services
    enable_auto_update
    enable_backup
    show_deployment_info
    
    echo -e "${GREEN}🎉 部署完成！访问 http://localhost:3067 开始使用UniCatcher${NC}"
}

# 如果脚本被直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 