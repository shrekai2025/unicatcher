#!/bin/bash

# UniCatcher 服务器部署脚本
# 修复版本 - 解决Docker构建问题

set -e

echo "🚀 UniCatcher 服务器部署脚本 (修复版)"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查系统环境
check_environment() {
    echo -e "${BLUE}📋 检查系统环境...${NC}"
    
    # 检查操作系统
    if [[ ! -f /etc/lsb-release ]] || ! grep -q "Ubuntu" /etc/lsb-release; then
        echo -e "${YELLOW}⚠️  警告: 此脚本针对Ubuntu优化，其他系统可能需要调整${NC}"
    fi
    
    # 检查基本命令
    for cmd in curl git; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}❌ $cmd 未安装，正在安装...${NC}"
            sudo apt update && sudo apt install -y $cmd
        fi
    done
    
    echo -e "${GREEN}✅ 系统环境检查完成${NC}"
}

# 安装Docker
install_docker() {
    echo -e "${BLUE}🐳 检查Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}📦 安装Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        echo -e "${GREEN}✅ Docker安装完成${NC}"
    else
        echo -e "${GREEN}✅ Docker已安装${NC}"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}📦 安装Docker Compose...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}✅ Docker Compose安装完成${NC}"
    else
        echo -e "${GREEN}✅ Docker Compose已安装${NC}"
    fi
}

# 克隆或更新项目
setup_project() {
    echo -e "${BLUE}📁 设置项目...${NC}"
    
    if [ -d "unicatcher" ]; then
        echo -e "${YELLOW}📂 项目目录已存在，更新代码...${NC}"
        cd unicatcher
        git pull origin main
    else
        echo -e "${YELLOW}📥 克隆项目...${NC}"
        git clone https://github.com/shrekai2025/unicatcher.git
        cd unicatcher
    fi
    
    echo -e "${GREEN}✅ 项目设置完成${NC}"
}

# 创建环境配置
create_env_config() {
    echo -e "${BLUE}⚙️  创建环境配置...${NC}"
    
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# UniCatcher 环境变量配置
NODE_ENV=production
PORT=3067
AUTH_SECRET=unicatcher-secret-key-2024
NEXTAUTH_URL=http://localhost:3067
DATABASE_URL="file:./prisma/db.sqlite"
ENABLE_RESOURCE_OPTIMIZATION=true
EOF
        echo -e "${GREEN}✅ 环境配置文件已创建${NC}"
    else
        echo -e "${YELLOW}⚠️  环境配置文件已存在，跳过创建${NC}"
    fi
}

# 预构建检查
pre_build_check() {
    echo -e "${BLUE}🔍 预构建检查...${NC}"
    
    # 检查关键文件
    local files=("package.json" "prisma/schema.prisma" "Dockerfile" "docker-compose.yml")
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file 存在${NC}"
        else
            echo -e "${RED}❌ $file 缺失${NC}"
            exit 1
        fi
    done
    
    # 检查Dockerfile是否包含修复
    if grep -q "COPY prisma ./prisma" Dockerfile; then
        echo -e "${GREEN}✅ Dockerfile已包含修复${NC}"
    else
        echo -e "${RED}❌ Dockerfile未包含必要修复${NC}"
        exit 1
    fi
}

# 构建和启动服务
build_and_start() {
    echo -e "${BLUE}🔨 构建和启动服务...${NC}"
    
    # 清理旧容器和镜像
    echo -e "${YELLOW}🧹 清理旧资源...${NC}"
    docker-compose down 2>/dev/null || true
    docker system prune -f
    
    # 构建服务
    echo -e "${YELLOW}🏗️  构建Docker镜像...${NC}"
    docker-compose build --no-cache
    
    # 启动服务
    echo -e "${YELLOW}🚀 启动服务...${NC}"
    docker-compose up -d
    
    echo -e "${GREEN}✅ 服务启动完成${NC}"
}

# 健康检查
health_check() {
    echo -e "${BLUE}🩺 健康检查...${NC}"
    
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 30
    
    # 检查容器状态
    echo -e "${BLUE}📊 容器状态:${NC}"
    docker-compose ps
    
    # 检查健康端点
    for i in {1..12}; do
        if curl -f http://localhost:3067/api/health &>/dev/null; then
            echo -e "${GREEN}✅ 服务健康检查通过！${NC}"
            
            echo -e "${BLUE}📊 健康检查详情:${NC}"
            curl -s http://localhost:3067/api/health | python3 -m json.tool 2>/dev/null || echo "服务正常运行"
            
            return 0
        else
            echo -e "${YELLOW}⏳ 等待服务就绪... (${i}/12)${NC}"
            sleep 10
        fi
    done
    
    echo -e "${RED}❌ 健康检查失败${NC}"
    echo -e "${YELLOW}📋 容器日志:${NC}"
    docker-compose logs unicatcher
    return 1
}

# 显示部署结果
show_result() {
    echo -e "${GREEN}"
    echo "🎉 UniCatcher 部署完成！"
    echo "========================"
    echo -e "${NC}"
    
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo -e "${BLUE}📍 访问地址：${NC}"
    echo "   本地: http://localhost:3067"
    echo "   外部: http://${server_ip}:3067"
    
    echo -e "${BLUE}🩺 健康检查：${NC} http://${server_ip}:3067/api/health"
    echo -e "${BLUE}📚 API文档：${NC} http://${server_ip}:3067/api-docs"
    
    echo ""
    echo -e "${YELLOW}📋 常用管理命令：${NC}"
    echo "  查看状态: docker-compose ps"
    echo "  查看日志: docker-compose logs -f unicatcher"
    echo "  重启服务: docker-compose restart unicatcher"
    echo "  停止服务: docker-compose down"
    
    echo ""
    echo -e "${YELLOW}🔐 下一步：设置Twitter登录${NC}"
    echo "  1. 从本地复制登录状态: scp ./data/browser-state.json user@server:~/unicatcher/data/"
    echo "  2. 或使用VNC进行登录: 参考无GUI登录指南"
}

# 主函数
main() {
    echo -e "${GREEN}开始部署UniCatcher (修复版)...${NC}"
    
    check_environment
    install_docker
    setup_project
    create_env_config
    pre_build_check
    build_and_start
    
    if health_check; then
        show_result
        echo -e "${GREEN}🎉 部署成功！${NC}"
    else
        echo -e "${RED}💥 部署失败，请检查错误信息${NC}"
        exit 1
    fi
}

# 运行主函数
main "$@" 