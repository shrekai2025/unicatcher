#!/bin/bash

# UniCatcher Docker 管理脚本
# 提供常用的Docker操作命令

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示使用帮助
show_help() {
    echo -e "${CYAN}UniCatcher Docker 管理工具${NC}"
    echo "================================"
    echo ""
    echo -e "${YELLOW}使用方法:${NC} $0 <命令>"
    echo ""
    echo -e "${YELLOW}可用命令:${NC}"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看服务状态"
    echo "  logs          查看实时日志"
    echo "  logs-tail     查看最近100行日志"
    echo "  update        更新服务到最新版本"
    echo "  backup        立即创建备份"
    echo "  restore       从备份恢复"
    echo "  health        检查服务健康状态"
    echo "  cleanup       清理未使用的镜像和容器"
    echo "  shell         进入容器Shell"
    echo "  enable-update 启用自动更新"
    echo "  disable-update 禁用自动更新"
    echo "  enable-backup 启用自动备份"
    echo "  disable-backup 禁用自动备份"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 start              # 启动UniCatcher服务"
    echo "  $0 logs               # 查看实时日志"
    echo "  $0 update             # 更新到最新版本"
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose未安装，请先安装Docker Compose${NC}"
        exit 1
    fi
}

# 启动服务
start_service() {
    echo -e "${BLUE}🚀 启动UniCatcher服务...${NC}"
    docker-compose up -d unicatcher
    echo -e "${GREEN}✅ 服务启动完成${NC}"
    sleep 5
    check_health
}

# 停止服务
stop_service() {
    echo -e "${YELLOW}⏹️  停止UniCatcher服务...${NC}"
    docker-compose stop unicatcher
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 重启服务
restart_service() {
    echo -e "${BLUE}🔄 重启UniCatcher服务...${NC}"
    docker-compose restart unicatcher
    echo -e "${GREEN}✅ 服务重启完成${NC}"
    sleep 5
    check_health
}

# 查看服务状态
show_status() {
    echo -e "${BLUE}📊 服务状态:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}📈 资源使用情况:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" unicatcher-app 2>/dev/null || echo "服务未运行"
}

# 查看实时日志
show_logs() {
    echo -e "${BLUE}📋 实时日志 (按Ctrl+C退出):${NC}"
    docker-compose logs -f unicatcher
}

# 查看最近日志
show_logs_tail() {
    echo -e "${BLUE}📋 最近100行日志:${NC}"
    docker-compose logs --tail=100 unicatcher
}

# 更新服务
update_service() {
    echo -e "${BLUE}🔄 更新UniCatcher到最新版本...${NC}"
    
    # 创建备份
    echo -e "${YELLOW}💾 创建备份...${NC}"
    create_backup
    
    # 停止服务
    echo -e "${YELLOW}⏹️  停止当前服务...${NC}"
    docker-compose stop unicatcher
    
    # 拉取最新镜像（如果使用预构建镜像）
    # docker-compose pull unicatcher
    
    # 重新构建镜像
    echo -e "${YELLOW}🔨 重新构建镜像...${NC}"
    docker-compose build --no-cache unicatcher
    
    # 启动服务
    echo -e "${YELLOW}🚀 启动更新后的服务...${NC}"
    docker-compose up -d unicatcher
    
    # 等待服务启动
    sleep 30
    
    # 检查健康状态
    if check_health_silent; then
        echo -e "${GREEN}✅ 更新完成！服务正常运行${NC}"
    else
        echo -e "${RED}❌ 更新失败，正在回滚...${NC}"
        # 这里可以添加回滚逻辑
        docker-compose restart unicatcher
    fi
}

# 创建备份
create_backup() {
    echo -e "${BLUE}💾 创建数据备份...${NC}"
    
    timestamp=$(date +%Y%m%d-%H%M%S)
    backup_name="unicatcher-manual-backup-${timestamp}.tar.gz"
    
    # 创建备份目录
    mkdir -p backups
    
    # 创建备份
    docker run --rm -v unicatcher-data:/data:ro -v $(pwd)/backups:/backup alpine tar -czf /backup/${backup_name} -C /data .
    
    echo -e "${GREEN}✅ 备份已创建: backups/${backup_name}${NC}"
}

# 从备份恢复
restore_backup() {
    echo -e "${BLUE}📁 可用备份文件:${NC}"
    ls -la backups/*.tar.gz 2>/dev/null || {
        echo -e "${RED}❌ 未找到备份文件${NC}"
        return 1
    }
    
    echo ""
    echo -e "${YELLOW}请输入要恢复的备份文件名 (如: unicatcher-backup-20231201-120000.tar.gz):${NC}"
    read -r backup_file
    
    if [ ! -f "backups/${backup_file}" ]; then
        echo -e "${RED}❌ 备份文件不存在: ${backup_file}${NC}"
        return 1
    fi
    
    echo -e "${RED}⚠️  恢复操作将覆盖当前数据！是否继续? (y/N)${NC}"
    read -r confirm
    
    if [[ "$confirm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🔄 停止服务...${NC}"
        docker-compose stop unicatcher
        
        echo -e "${BLUE}📥 恢复备份...${NC}"
        docker run --rm -v unicatcher-data:/data -v $(pwd)/backups:/backup alpine sh -c "rm -rf /data/* && tar -xzf /backup/${backup_file} -C /data"
        
        echo -e "${BLUE}🚀 重启服务...${NC}"
        docker-compose up -d unicatcher
        
        echo -e "${GREEN}✅ 备份恢复完成${NC}"
    else
        echo -e "${YELLOW}取消恢复操作${NC}"
    fi
}

# 检查健康状态
check_health() {
    echo -e "${BLUE}🩺 检查服务健康状态...${NC}"
    
    if check_health_silent; then
        echo -e "${GREEN}✅ 服务运行正常${NC}"
        
        # 显示详细健康信息
        echo -e "${BLUE}📊 详细健康信息:${NC}"
        curl -s http://localhost:3067/api/health | python3 -m json.tool 2>/dev/null || echo "无法获取详细信息"
    else
        echo -e "${RED}❌ 服务异常，请检查日志${NC}"
        return 1
    fi
}

# 静默健康检查
check_health_silent() {
    curl -f http://localhost:3067/api/health &> /dev/null
}

# 清理未使用的资源
cleanup_docker() {
    echo -e "${BLUE}🧹 清理Docker资源...${NC}"
    
    echo -e "${YELLOW}清理未使用的镜像...${NC}"
    docker image prune -f
    
    echo -e "${YELLOW}清理未使用的容器...${NC}"
    docker container prune -f
    
    echo -e "${YELLOW}清理未使用的网络...${NC}"
    docker network prune -f
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 进入容器Shell
enter_shell() {
    echo -e "${BLUE}🐚 进入UniCatcher容器Shell...${NC}"
    docker-compose exec unicatcher /bin/bash || docker-compose exec unicatcher /bin/sh
}

# 启用自动更新
enable_auto_update() {
    echo -e "${BLUE}🔄 启用自动更新服务...${NC}"
    docker-compose --profile autoupdate up -d watchtower
    echo -e "${GREEN}✅ 自动更新已启用（每天凌晨2点检查）${NC}"
}

# 禁用自动更新
disable_auto_update() {
    echo -e "${YELLOW}⏹️  禁用自动更新服务...${NC}"
    docker-compose stop watchtower
    docker-compose rm -f watchtower
    echo -e "${GREEN}✅ 自动更新已禁用${NC}"
}

# 启用自动备份
enable_auto_backup() {
    echo -e "${BLUE}💾 启用自动备份服务...${NC}"
    docker-compose --profile backup up -d backup
    echo -e "${GREEN}✅ 自动备份已启用（每24小时备份一次）${NC}"
}

# 禁用自动备份
disable_auto_backup() {
    echo -e "${YELLOW}⏹️  禁用自动备份服务...${NC}"
    docker-compose stop backup
    docker-compose rm -f backup
    echo -e "${GREEN}✅ 自动备份已禁用${NC}"
}

# 主函数
main() {
    check_docker
    
    case "${1:-help}" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        logs-tail)
            show_logs_tail
            ;;
        update)
            update_service
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup
            ;;
        health)
            check_health
            ;;
        cleanup)
            cleanup_docker
            ;;
        shell)
            enter_shell
            ;;
        enable-update)
            enable_auto_update
            ;;
        disable-update)
            disable_auto_update
            ;;
        enable-backup)
            enable_auto_backup
            ;;
        disable-backup)
            disable_auto_backup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@" 