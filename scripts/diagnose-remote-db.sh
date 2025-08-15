#!/bin/bash

# 远程数据库页面排查脚本
# 用于诊断 http://43.153.84.145:5555/ 无法访问的问题

echo "🔍 远程数据库页面排查工具"
echo "目标地址: http://43.153.84.145:5555/"
echo "=" | awk '{for(i=1;i<=60;i++) printf "%s", $0; print ""}'

SERVER_IP="43.153.84.145"
DB_PORT="5555"
APP_PORT="3067"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
log_info "开始系统性排查..."

# 1. 网络连通性检查
echo ""
echo "📡 1. 网络连通性检查"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

log_info "检查服务器是否可达..."
if ping -c 3 $SERVER_IP >/dev/null 2>&1; then
    log_success "服务器 $SERVER_IP 网络连通正常"
else
    log_error "服务器 $SERVER_IP 网络不通，请检查："
    echo "  - 服务器是否在线"
    echo "  - IP地址是否正确"
    echo "  - 网络防火墙设置"
fi

# 2. 端口检查
echo ""
echo "🔌 2. 端口开放状态检查"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

log_info "检查端口 $DB_PORT 是否开放..."
if command -v nc >/dev/null 2>&1; then
    if nc -z -w3 $SERVER_IP $DB_PORT 2>/dev/null; then
        log_success "端口 $DB_PORT 开放且可访问"
    else
        log_error "端口 $DB_PORT 无法连接，可能原因："
        echo "  - Prisma Studio 未启动"
        echo "  - 防火墙阻止了端口访问"
        echo "  - 端口绑定到localhost而非0.0.0.0"
    fi
else
    log_warning "未安装 netcat (nc)，无法测试端口连通性"
    echo "  可以安装: brew install netcat (macOS) 或 apt install netcat (Ubuntu)"
fi

log_info "检查主应用端口 $APP_PORT..."
if command -v nc >/dev/null 2>&1; then
    if nc -z -w3 $SERVER_IP $APP_PORT 2>/dev/null; then
        log_success "主应用端口 $APP_PORT 开放"
    else
        log_warning "主应用端口 $APP_PORT 无法连接"
    fi
fi

# 3. HTTP请求测试
echo ""
echo "🌐 3. HTTP服务测试"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

log_info "测试HTTP响应..."
if command -v curl >/dev/null 2>&1; then
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 http://$SERVER_IP:$DB_PORT/ 2>/dev/null)
    if [ "$response" = "200" ]; then
        log_success "HTTP请求成功，状态码: $response"
    elif [ "$response" = "000" ]; then
        log_error "无法连接到HTTP服务，可能原因："
        echo "  - 服务未启动"
        echo "  - 端口被占用但不是HTTP服务"
        echo "  - 防火墙阻止连接"
    else
        log_warning "HTTP响应异常，状态码: $response"
    fi
    
    # 检查主应用
    app_response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 http://$SERVER_IP:$APP_PORT/ 2>/dev/null)
    if [ "$app_response" = "200" ]; then
        log_success "主应用HTTP服务正常，状态码: $app_response"
        log_info "主应用访问地址: http://$SERVER_IP:$APP_PORT/"
    else
        log_warning "主应用HTTP服务异常，状态码: $app_response"
    fi
else
    log_warning "未安装 curl，无法测试HTTP服务"
fi

# 4. 提供解决方案
echo ""
echo "💡 4. 常见问题解决方案"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

echo ""
log_info "如果端口无法连接，请在服务器上执行："
cat << 'EOF'

# 检查服务状态
sudo systemctl status unicatcher
pm2 status

# 检查端口占用
sudo netstat -tlnp | grep :5555
sudo netstat -tlnp | grep :3067

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-ports

# 启动Prisma Studio (如果未运行)
npx prisma studio --port 5555 --hostname 0.0.0.0

EOF

echo ""
log_info "防火墙配置："
cat << 'EOF'

# Ubuntu/Debian (ufw)
sudo ufw allow 5555
sudo ufw allow 3067

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --permanent --add-port=3067/tcp
sudo firewall-cmd --reload

# 阿里云/腾讯云安全组
需要在控制台开放 5555 和 3067 端口

EOF

# 5. 提供远程执行命令
echo ""
echo "🔧 5. 远程诊断命令"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

echo ""
log_info "复制以下命令在服务器上执行："
cat << 'EOF'

# 1. 检查进程状态
ps aux | grep -E "(prisma|node|unicatcher)"

# 2. 检查端口占用
sudo ss -tlnp | grep -E "(5555|3067)"

# 3. 检查日志
journalctl -u unicatcher -n 50
pm2 logs unicatcher

# 4. 重启服务
sudo systemctl restart unicatcher
# 或
pm2 restart unicatcher

# 5. 手动启动Prisma Studio
cd /path/to/unicatcher
npx prisma studio --port 5555 --hostname 0.0.0.0 &

EOF

echo ""
echo "📋 排查完成！请根据以上结果进行相应处理。"
echo "如需进一步协助，请提供服务器上的命令执行结果。"