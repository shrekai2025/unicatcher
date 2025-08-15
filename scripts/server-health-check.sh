#!/bin/bash

# 服务器健康检查脚本 - 在远程服务器上执行
# 检查 UniCatcher 应用和 Prisma Studio 的运行状态

echo "🏥 UniCatcher 服务器健康检查"
echo "服务器时间: $(date)"
echo "=" | awk '{for(i=1;i<=60;i++) printf "%s", $0; print ""}'

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌]${NC} $1"
}

# 1. 系统基本信息
echo ""
echo "📊 1. 系统信息"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'
log_info "系统版本: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')"
log_info "内存使用: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
log_info "磁盘使用: $(df -h / | awk 'NR==2{printf "%s", $5}')"
log_info "负载平均: $(uptime | awk -F'load average:' '{print $2}')"

# 2. Node.js 环境检查
echo ""
echo "📦 2. Node.js 环境"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'
if command -v node >/dev/null 2>&1; then
    log_success "Node.js 版本: $(node --version)"
else
    log_error "Node.js 未安装"
fi

if command -v npm >/dev/null 2>&1; then
    log_success "npm 版本: $(npm --version)"
else
    log_error "npm 未安装"
fi

# 3. 进程检查
echo ""
echo "⚙️ 3. 应用进程状态"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# 检查 PM2 进程
if command -v pm2 >/dev/null 2>&1; then
    log_info "PM2 进程列表:"
    pm2 status 2>/dev/null || log_warning "PM2 无进程运行"
else
    log_warning "PM2 未安装或不在PATH中"
fi

# 检查 systemd 服务
if systemctl is-active unicatcher >/dev/null 2>&1; then
    log_success "systemd 服务 unicatcher 正在运行"
else
    log_warning "systemd 服务 unicatcher 未运行"
fi

# 检查相关进程
log_info "UniCatcher 相关进程:"
ps aux | grep -E "(unicatcher|prisma|next)" | grep -v grep || log_warning "未找到相关进程"

# 4. 端口检查
echo ""
echo "🔌 4. 端口占用情况"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

for port in 3067 5555; do
    if ss -tlnp | grep ":$port " >/dev/null 2>&1; then
        log_success "端口 $port 已被占用:"
        ss -tlnp | grep ":$port "
    else
        log_warning "端口 $port 未被占用"
    fi
done

# 5. 防火墙检查
echo ""
echo "🛡️ 5. 防火墙状态"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# 检查 ufw (Ubuntu/Debian)
if command -v ufw >/dev/null 2>&1; then
    if ufw status | grep -q "Status: active"; then
        log_info "ufw 防火墙已启用:"
        ufw status | grep -E "(3067|5555)"
    else
        log_info "ufw 防火墙未启用"
    fi
fi

# 检查 firewalld (CentOS/RHEL)
if command -v firewall-cmd >/dev/null 2>&1; then
    if systemctl is-active firewalld >/dev/null 2>&1; then
        log_info "firewalld 已启用:"
        firewall-cmd --list-ports | grep -E "(3067|5555)" || log_warning "端口未在firewalld中开放"
    else
        log_info "firewalld 未运行"
    fi
fi

# 检查 iptables
if command -v iptables >/dev/null 2>&1; then
    log_info "iptables 规则 (仅显示相关端口):"
    iptables -L -n | grep -E "(3067|5555)" || log_info "未找到相关iptables规则"
fi

# 6. 数据库文件检查
echo ""
echo "🗄️ 6. 数据库文件状态"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# 查找可能的数据库文件
db_files=$(find / -name "*.sqlite*" -o -name "db.sqlite" 2>/dev/null | head -10)
if [ -n "$db_files" ]; then
    log_info "找到的SQLite数据库文件:"
    echo "$db_files" | while read -r file; do
        if [ -f "$file" ]; then
            size=$(ls -lh "$file" | awk '{print $5}')
            log_success "$file (大小: $size)"
        fi
    done
else
    log_warning "未找到SQLite数据库文件"
fi

# 7. 应用目录检查
echo ""
echo "📁 7. 应用目录检查"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# 常见的部署目录
for dir in "/opt/unicatcher" "/home/ubuntu/unicatcher" "/root/unicatcher" "/var/www/unicatcher" "$(pwd)"; do
    if [ -d "$dir" ]; then
        log_success "找到应用目录: $dir"
        
        # 检查关键文件
        if [ -f "$dir/package.json" ]; then
            log_info "  ✅ package.json 存在"
        fi
        
        if [ -f "$dir/.env" ]; then
            log_info "  ✅ .env 配置文件存在"
        else
            log_warning "  ⚠️ .env 配置文件不存在"
        fi
        
        if [ -d "$dir/prisma" ]; then
            log_info "  ✅ prisma 目录存在"
            if [ -f "$dir/prisma/schema.prisma" ]; then
                log_info "  ✅ prisma/schema.prisma 存在"
            fi
        fi
        
        if [ -d "$dir/.next" ]; then
            log_info "  ✅ .next 构建目录存在"
        else
            log_warning "  ⚠️ .next 构建目录不存在，可能需要构建"
        fi
        
        break
    fi
done

# 8. 日志检查
echo ""
echo "📝 8. 最新日志信息"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# systemd 日志
if systemctl is-active unicatcher >/dev/null 2>&1; then
    log_info "最新 systemd 日志 (最后5条):"
    journalctl -u unicatcher -n 5 --no-pager 2>/dev/null || log_warning "无法读取 systemd 日志"
fi

# PM2 日志
if command -v pm2 >/dev/null 2>&1; then
    log_info "PM2 日志状态:"
    pm2 logs --lines 5 2>/dev/null | tail -20 || log_warning "无法读取 PM2 日志"
fi

# 9. 网络连接测试
echo ""
echo "🌐 9. 网络连接测试"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

# 测试本地端口连接
for port in 3067 5555; do
    if curl -s --connect-timeout 3 http://localhost:$port >/dev/null 2>&1; then
        log_success "本地端口 $port HTTP服务响应正常"
    else
        log_error "本地端口 $port HTTP服务无响应"
    fi
done

# 10. 建议操作
echo ""
echo "💡 10. 建议操作"
echo "-" | awk '{for(i=1;i<=40;i++) printf "%s", $0; print ""}'

echo ""
log_info "如果发现问题，可以尝试以下操作："
cat << 'EOF'

# 重启服务
sudo systemctl restart unicatcher
# 或
pm2 restart all

# 手动启动 Prisma Studio
cd /path/to/unicatcher
npx prisma studio --port 5555 --hostname 0.0.0.0 &

# 检查配置文件
cat .env | grep -E "(DATABASE_URL|PORT)"

# 重新构建应用 (如果需要)
npm run build

# 查看详细日志
journalctl -u unicatcher -f
# 或
pm2 logs --lines 50

EOF

echo ""
echo "🏁 健康检查完成！"
echo "请根据以上信息排查问题，如需协助请提供此报告。"