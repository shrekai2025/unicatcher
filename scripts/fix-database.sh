#!/bin/bash

# SQLite数据库修复脚本
echo "🔧 开始修复SQLite数据库..."

DB_PATH="prisma/db.sqlite"
BACKUP_PATH="prisma/db.sqlite.backup.$(date +%Y%m%d_%H%M%S)"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    echo "❌ 数据库文件不存在: $DB_PATH"
    exit 1
fi

echo "📁 数据库路径: $DB_PATH"

# 方案1: 尝试使用SQLite的.recover命令修复
echo "🔍 方案1: 尝试使用SQLite的.recover命令修复..."
if command -v sqlite3 &> /dev/null; then
    # 备份原数据库
    echo "💾 备份原数据库到: $BACKUP_PATH"
    cp "$DB_PATH" "$BACKUP_PATH"
    
    # 尝试修复
    echo "🛠️ 尝试使用.recover命令修复..."
    sqlite3 "$DB_PATH" ".recover" > "${DB_PATH}.recovered.sql" 2>/dev/null
    
    if [ $? -eq 0 ] && [ -s "${DB_PATH}.recovered.sql" ]; then
        echo "✅ 成功导出数据，准备重建数据库..."
        
        # 删除损坏的数据库
        rm "$DB_PATH"
        
        # 重新创建数据库结构
        echo "🏗️ 重建数据库结构..."
        npx prisma db push --force-reset
        
        # 导入恢复的数据
        echo "📥 导入恢复的数据..."
        sqlite3 "$DB_PATH" < "${DB_PATH}.recovered.sql"
        
        if [ $? -eq 0 ]; then
            echo "✅ 数据库修复成功！"
            echo "📁 备份文件保存在: $BACKUP_PATH"
            echo "📁 恢复SQL文件: ${DB_PATH}.recovered.sql"
            exit 0
        else
            echo "❌ 数据导入失败"
        fi
    else
        echo "❌ .recover命令失败或没有恢复到数据"
    fi
else
    echo "❌ sqlite3命令不可用"
fi

# 方案2: 重新创建数据库
echo ""
echo "🔄 方案2: 完全重新创建数据库..."
echo "⚠️  警告: 这将删除所有现有数据！"
read -p "是否继续？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 备份损坏的数据库
    echo "💾 备份损坏的数据库到: $BACKUP_PATH"
    cp "$DB_PATH" "$BACKUP_PATH"
    
    # 删除损坏的数据库
    echo "🗑️ 删除损坏的数据库..."
    rm -f "$DB_PATH"
    rm -f "${DB_PATH}-shm"
    rm -f "${DB_PATH}-wal"
    
    # 重新创建数据库
    echo "🏗️ 重新创建数据库..."
    npx prisma db push --force-reset
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库重建成功！"
        echo "📁 原数据库备份: $BACKUP_PATH"
    else
        echo "❌ 数据库重建失败"
        exit 1
    fi
else
    echo "❌ 操作已取消"
    exit 1
fi