#!/bin/bash

# 解决端口5555被占用的问题

echo "🔧 解决Prisma Studio端口冲突"
echo "=================================="

# 1. 查找占用端口5555的进程
echo ""
echo "📍 查找占用端口5555的进程..."
PORT_PROCESS=$(sudo netstat -tlnp | grep ":5555 " | awk '{print $7}' | cut -d'/' -f1)
if [ -n "$PORT_PROCESS" ]; then
    echo "✅ 找到占用端口5555的进程ID: $PORT_PROCESS"
    
    # 显示进程详情
    echo ""
    echo "📋 进程详情:"
    ps aux | grep $PORT_PROCESS | grep -v grep
    
    # 询问是否终止进程
    echo ""
    echo "🤔 是否要终止这个进程？(y/n)"
    read -r answer
    
    if [[ $answer == "y" || $answer == "Y" ]]; then
        echo "⚠️ 正在终止进程 $PORT_PROCESS..."
        kill $PORT_PROCESS
        sleep 2
        
        # 检查进程是否被终止
        if kill -0 $PORT_PROCESS 2>/dev/null; then
            echo "❌ 进程仍在运行，尝试强制终止..."
            kill -9 $PORT_PROCESS
            sleep 1
        fi
        
        if ! kill -0 $PORT_PROCESS 2>/dev/null; then
            echo "✅ 进程已成功终止"
        else
            echo "❌ 无法终止进程，请手动处理"
            exit 1
        fi
    else
        echo "ℹ️ 保持进程运行，将使用其他端口启动Prisma Studio"
    fi
else
    echo "⚠️ 未找到占用端口5555的进程（可能需要root权限查看）"
fi

echo ""
echo "🚀 重新启动Prisma Studio..."

# 2. 尝试启动Prisma Studio
if netstat -tlnp | grep ":5555 " >/dev/null 2>&1; then
    echo "⚠️ 端口5555仍被占用，使用端口5556"
    npx prisma studio --port 5556 --hostname 0.0.0.0 &
    STUDIO_PORT=5556
else
    echo "✅ 端口5555现已可用，启动Prisma Studio"
    npx prisma studio --port 5555 --hostname 0.0.0.0 &
    STUDIO_PORT=5555
fi

# 3. 等待启动并验证
echo "⏳ 等待Prisma Studio启动..."
sleep 5

if netstat -tlnp | grep ":$STUDIO_PORT " >/dev/null 2>&1; then
    echo ""
    echo "🎉 Prisma Studio启动成功！"
    echo "📍 访问地址: http://43.153.84.145:$STUDIO_PORT/"
    echo ""
    echo "💡 提示：请确保防火墙已开放端口 $STUDIO_PORT"
    if [ "$STUDIO_PORT" != "5555" ]; then
        echo "⚠️ 注意：使用的是端口 $STUDIO_PORT 而不是默认的5555"
    fi
else
    echo "❌ Prisma Studio启动失败，请检查错误信息"
fi