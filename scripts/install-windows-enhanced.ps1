# UniCatcher Windows 增强安装脚本
# 集成所有修复功能，自动检测和解决常见问题

param(
    [switch]$SkipChecks = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "🚀 UniCatcher Windows 增强安装程序" -ForegroundColor Blue
Write-Host "版本: 2.0 (集成自动修复功能)" -ForegroundColor Gray
Write-Host ""

# 全局变量
$script:InstallLog = @()
$script:ErrorCount = 0
$script:WarningCount = 0

function Write-InstallLog($Level, $Message) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $script:InstallLog += $logEntry
    
    switch ($Level) {
        "INFO" { Write-Host "   ℹ️  $Message" -ForegroundColor Cyan }
        "SUCCESS" { Write-Host "   ✅ $Message" -ForegroundColor Green }
        "WARNING" { 
            Write-Host "   ⚠️  $Message" -ForegroundColor Yellow
            $script:WarningCount++
        }
        "ERROR" { 
            Write-Host "   ❌ $Message" -ForegroundColor Red
            $script:ErrorCount++
        }
    }
    
    if ($Verbose) {
        Write-Host "      $logEntry" -ForegroundColor DarkGray
    }
}

# 第一步：环境检查和自动修复
Write-Host "🔍 第一步：环境检查和自动修复..." -ForegroundColor Magenta

if (-not $SkipChecks) {
    Write-InstallLog "INFO" "执行环境检查..."
    
    # 检查管理员权限
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $isAdmin = ([System.Security.Principal.WindowsPrincipal]$currentUser).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($isAdmin) {
        Write-InstallLog "SUCCESS" "检测到管理员权限"
    } else {
        Write-InstallLog "WARNING" "建议使用管理员权限运行以避免权限问题"
    }
    
    # 检查PowerShell版本
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -ge 5) {
        Write-InstallLog "SUCCESS" "PowerShell版本: $($psVersion.ToString())"
    } else {
        Write-InstallLog "ERROR" "PowerShell版本过低，需要5.0+"
        exit 1
    }
    
    # 自动权限修复
    Write-InstallLog "INFO" "执行权限预检查和修复..."
    
    # 停止可能冲突的进程
    Get-Process -Name "node","npm" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-InstallLog "INFO" "停止进程: $($_.Name) (PID: $($_.Id))"
        $_ | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    # 创建必要目录
    $directories = @("data", "data\logs", "data\browser-data", "prisma")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            try {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-InstallLog "SUCCESS" "创建目录: $dir"
            } catch {
                Write-InstallLog "ERROR" "无法创建目录: $dir"
            }
        }
    }
    
    # 设置目录权限
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            try {
                $acl = Get-Acl $dir
                $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser.Name, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
                $acl.SetAccessRule($accessRule)
                Set-Acl -Path $dir -AclObject $acl
                Write-InstallLog "SUCCESS" "设置权限: $dir"
            } catch {
                Write-InstallLog "WARNING" "无法设置权限: $dir (将继续安装)"
            }
        }
    }
    
    Write-InstallLog "SUCCESS" "环境检查和修复完成"
} else {
    Write-InstallLog "INFO" "跳过环境检查 (-SkipChecks)"
}

# 第二步：Node.js环境验证
Write-Host "`n📦 第二步：Node.js环境验证..." -ForegroundColor Magenta

try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -ge 18) {
        Write-InstallLog "SUCCESS" "Node.js版本: $nodeVersion"
    } else {
        Write-InstallLog "ERROR" "Node.js版本过低: $nodeVersion (需要18+)"
        Write-Host "`n请从 https://nodejs.org/ 下载安装Node.js 18+" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-InstallLog "ERROR" "Node.js未安装或不在PATH中"
    Write-Host "`n请从 https://nodejs.org/ 下载安装Node.js 18+" -ForegroundColor Yellow
    exit 1
}

try {
    $npmVersion = npm --version
    Write-InstallLog "SUCCESS" "npm版本: $npmVersion"
} catch {
    Write-InstallLog "ERROR" "npm未安装或不可用"
    exit 1
}

# 第三步：清理和准备
Write-Host "`n🧹 第三步：清理和准备..." -ForegroundColor Magenta

# 清理npm缓存
try {
    npm cache clean --force 2>$null
    Write-InstallLog "SUCCESS" "npm缓存已清理"
} catch {
    Write-InstallLog "WARNING" "npm缓存清理失败"
}

# 清理可能的文件锁
if (Test-Path "node_modules\.prisma") {
    try {
        Remove-Item -Recurse -Force "node_modules\.prisma"
        Write-InstallLog "SUCCESS" "清理Prisma缓存"
    } catch {
        Write-InstallLog "WARNING" "无法清理Prisma缓存"
    }
}

# 设置npm配置
try {
    $npmCache = "$env:USERPROFILE\.npm-cache"
    $npmPrefix = "$env:USERPROFILE\.npm-global"
    
    npm config set cache $npmCache --global 2>$null
    npm config set prefix $npmPrefix --global 2>$null
    
    if (-not (Test-Path $npmCache)) { New-Item -ItemType Directory -Path $npmCache -Force | Out-Null }
    if (-not (Test-Path $npmPrefix)) { New-Item -ItemType Directory -Path $npmPrefix -Force | Out-Null }
    
    Write-InstallLog "SUCCESS" "npm配置已优化"
} catch {
    Write-InstallLog "WARNING" "npm配置优化失败"
}

# 第四步：环境变量配置
Write-Host "`n⚙️  第四步：环境变量配置..." -ForegroundColor Magenta

# 生成强AUTH_SECRET
function Generate-SecureSecret {
    $bytes = New-Object byte[] 32
    ([System.Security.Cryptography.RNGCryptoServiceProvider]::Create()).GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

if (-not (Test-Path ".env")) {
    $authSecret = Generate-SecureSecret
    $envContent = @"
# UniCatcher 生产环境配置
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="$authSecret"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="production"
PORT=3067
ENABLE_RESOURCE_OPTIMIZATION=true
SKIP_ENV_VALIDATION=false
"@
    try {
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-InstallLog "SUCCESS" "创建.env文件 (使用强密码)"
    } catch {
        Write-InstallLog "ERROR" "无法创建.env文件"
        exit 1
    }
} else {
    Write-InstallLog "INFO" "检查现有.env文件..."
    
    $envContent = Get-Content ".env" -Raw
    $needsUpdate = $false
    
    # 检查AUTH_SECRET
    if ($envContent -match 'AUTH_SECRET="?([^"]*)"?') {
        $currentSecret = $matches[1]
        if ($currentSecret -eq "unicatcher-secret-key-2024-change-in-production" -or $currentSecret.Length -lt 32) {
            Write-InstallLog "WARNING" "AUTH_SECRET太弱，正在更新..."
            $newSecret = Generate-SecureSecret
            $envContent = $envContent -replace 'AUTH_SECRET="?[^"]*"?', "AUTH_SECRET=`"$newSecret`""
            $needsUpdate = $true
        }
    }
    
    # 检查DATABASE_URL路径（确保使用正确的prisma路径）
    if ($envContent -match 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?') {
        Write-InstallLog "WARNING" "更新DATABASE_URL路径到正确的prisma位置..."
        $envContent = $envContent -replace 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?', 'DATABASE_URL="file:./prisma/db.sqlite"'
        $needsUpdate = $true
    }
    
    if ($needsUpdate) {
        try {
            $envContent | Out-File -FilePath ".env" -Encoding UTF8
            Write-InstallLog "SUCCESS" ".env文件已更新"
        } catch {
            Write-InstallLog "ERROR" "无法更新.env文件"
        }
    } else {
        Write-InstallLog "SUCCESS" ".env文件配置正确"
    }
}

# 第五步：依赖安装
Write-Host "`n📦 第五步：依赖安装..." -ForegroundColor Magenta

$installAttempts = 0
$maxAttempts = 3
$installSuccess = $false

do {
    $installAttempts++
    Write-InstallLog "INFO" "安装尝试 $installAttempts/$maxAttempts..."
    
    try {
        npm install --no-optional
        if ($LASTEXITCODE -eq 0) {
            Write-InstallLog "SUCCESS" "依赖安装成功"
            $installSuccess = $true
            break
        }
    } catch {
        Write-InstallLog "WARNING" "安装失败: $($_.Exception.Message)"
    }
    
    if ($installAttempts -lt $maxAttempts) {
        Write-InstallLog "INFO" "3秒后重试..."
        Start-Sleep -Seconds 3
        
        # 清理node_modules
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
            Write-InstallLog "INFO" "清理node_modules"
        }
    }
} while ($installAttempts -lt $maxAttempts -and -not $installSuccess)

if (-not $installSuccess) {
    Write-InstallLog "ERROR" "依赖安装失败，请手动执行修复"
    Write-Host "`n🔧 手动修复步骤:" -ForegroundColor Yellow
    Write-Host "   1. 以管理员身份运行PowerShell" -ForegroundColor White
    Write-Host "   2. 运行: npm run fix-permissions" -ForegroundColor White
    Write-Host "   3. 运行: npm install" -ForegroundColor White
    exit 1
}

# 第六步：数据库初始化
Write-Host "`n🗄️  第六步：数据库初始化..." -ForegroundColor Magenta

try {
    npm run safe-init-db
    if ($LASTEXITCODE -eq 0) {
        Write-InstallLog "SUCCESS" "数据库初始化成功"
    } else {
        throw "数据库初始化失败"
    }
} catch {
    Write-InstallLog "ERROR" "数据库初始化失败"
    Write-InstallLog "INFO" "尝试手动初始化..."
    
    try {
        npx prisma db push
        npx prisma generate
        Write-InstallLog "SUCCESS" "手动数据库初始化成功"
    } catch {
        Write-InstallLog "ERROR" "数据库初始化彻底失败"
        exit 1
    }
}

# 第七步：Playwright浏览器安装
Write-Host "`n🎭 第七步：Playwright浏览器安装..." -ForegroundColor Magenta

try {
    npx playwright install chromium
    if ($LASTEXITCODE -eq 0) {
        Write-InstallLog "SUCCESS" "Playwright浏览器安装成功"
    } else {
        throw "Playwright安装失败"
    }
} catch {
    Write-InstallLog "ERROR" "Playwright浏览器安装失败"
    Write-InstallLog "INFO" "建议手动安装: npx playwright install chromium"
}

# 第八步：JWT配置验证
Write-Host "`n🔐 第八步：JWT配置验证..." -ForegroundColor Magenta

try {
    Write-InstallLog "INFO" "验证JWT配置..."
    node scripts/fix-jwt-session.mjs
    Write-InstallLog "SUCCESS" "JWT配置验证完成"
} catch {
    Write-InstallLog "WARNING" "JWT配置验证失败，但不影响安装"
}

# 第九步：最终验证
Write-Host "`n✅ 第九步：最终验证..." -ForegroundColor Magenta

# 检查关键文件
$criticalFiles = @(
    ".env",
    "node_modules\next",
    "node_modules\playwright",
    "node_modules\.prisma\client"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-InstallLog "SUCCESS" "文件检查通过: $file"
    } else {
        Write-InstallLog "WARNING" "文件缺失: $file"
    }
}

# 保存安装日志
try {
    $logContent = $script:InstallLog -join "`n"
    $logPath = ".\data\logs\install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    if (-not (Test-Path ".\data\logs")) {
        New-Item -ItemType Directory -Path ".\data\logs" -Force | Out-Null
    }
    
    $logContent | Out-File -FilePath $logPath -Encoding UTF8
    Write-InstallLog "SUCCESS" "安装日志保存到: $logPath"
} catch {
    Write-InstallLog "WARNING" "无法保存安装日志"
}

# 安装完成总结
Write-Host "`n📊 安装完成总结:" -ForegroundColor Blue
Write-Host "   ✅ 成功: $((($script:InstallLog | Where-Object { $_ -like '*SUCCESS*' }).Count))" -ForegroundColor Green
Write-Host "   ⚠️  警告: $script:WarningCount" -ForegroundColor Yellow
Write-Host "   ❌ 错误: $script:ErrorCount" -ForegroundColor Red

if ($script:ErrorCount -eq 0) {
    Write-Host "`n🎉 UniCatcher安装成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 接下来的步骤:" -ForegroundColor Cyan
    Write-Host "   1. 启动开发服务器: npm run dev" -ForegroundColor White
    Write-Host "   2. 启动生产服务器: npm run start" -ForegroundColor White
    Write-Host "   3. 访问应用: http://localhost:3067" -ForegroundColor White
    Write-Host "   4. 登录账号: admin / a2885828" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 故障排除工具:" -ForegroundColor Cyan
    Write-Host "   - 环境检查: npm run windows-check" -ForegroundColor White
    Write-Host "   - 权限修复: npm run fix-permissions" -ForegroundColor White
    Write-Host "   - JWT修复: npm run fix-jwt-session" -ForegroundColor White
    Write-Host "   - 认证调试: npm run debug-auth" -ForegroundColor White
} else {
    Write-Host "`n⚠️  安装完成但存在错误，请检查上述问题" -ForegroundColor Yellow
    Write-Host "💡 运行故障排除: npm run windows-fix" -ForegroundColor Cyan
} 