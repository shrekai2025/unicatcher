# UniCatcher Windows权限修复脚本

Write-Host "🔧 开始修复Windows权限问题..." -ForegroundColor Blue

# 检查当前用户权限
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = ([System.Security.Principal.WindowsPrincipal]$currentUser).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host "当前用户: $($currentUser.Name)" -ForegroundColor Yellow
Write-Host "管理员权限: $isAdmin" -ForegroundColor Yellow

if (-not $isAdmin) {
    Write-Host "⚠️  警告: 建议使用管理员权限运行此脚本" -ForegroundColor Red
    Write-Host "   右键点击PowerShell -> '以管理员身份运行'" -ForegroundColor Yellow
}

# 1. 停止所有可能的Node.js进程
Write-Host "🛑 停止可能的Node.js进程..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. 清理文件锁定
Write-Host "🔓 清理文件锁定..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    try {
        Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction Stop
        Write-Host "   ✅ 清理Prisma缓存成功" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  无法清理Prisma缓存: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 3. 设置目录权限
Write-Host "📁 设置目录权限..." -ForegroundColor Yellow

$directories = @(
    ".\data",
    ".\data\database",
    ".\data\logs", 
    ".\data\browser-data",
    ".\prisma",
    ".\node_modules",
    ".\scripts",
    ".\src"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        try {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "   ✅ 创建目录: $dir" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ 无法创建目录: $dir - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    try {
        # 给当前用户完全控制权限
        $acl = Get-Acl $dir
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser.Name, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $dir -AclObject $acl
        Write-Host "   ✅ 设置权限: $dir" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  无法设置权限: $dir - $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. 检查环境变量
Write-Host "⚙️  检查环境变量..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "   📄 创建.env文件..." -ForegroundColor Yellow
    $envContent = @"
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="unicatcher-windows-secret-key-$(Get-Date -Format 'yyyyMMdd')"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="production"
PORT=3067
ENABLE_RESOURCE_OPTIMIZATION=true
SKIP_ENV_VALIDATION=false
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force
    Write-Host "   ✅ .env文件已创建" -ForegroundColor Green
} else {
    Write-Host "   ✅ .env文件存在" -ForegroundColor Green
}

# 5. 清理npm缓存
Write-Host "🧹 清理npm缓存..." -ForegroundColor Yellow
try {
    npm cache clean --force 2>$null
    Write-Host "   ✅ npm缓存已清理" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  npm缓存清理失败" -ForegroundColor Yellow
}

# 6. 设置npm配置（避免权限问题）
Write-Host "📦 配置npm设置..." -ForegroundColor Yellow
try {
    $npmCache = "$env:USERPROFILE\.npm-cache"
    $npmPrefix = "$env:USERPROFILE\.npm-global"
    
    npm config set cache $npmCache --global 2>$null
    npm config set prefix $npmPrefix --global 2>$null
    
    # 创建npm目录
    if (-not (Test-Path $npmCache)) { New-Item -ItemType Directory -Path $npmCache -Force | Out-Null }
    if (-not (Test-Path $npmPrefix)) { New-Item -ItemType Directory -Path $npmPrefix -Force | Out-Null }
    
    Write-Host "   ✅ npm配置已优化" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  npm配置失败" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Windows权限修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 接下来请执行：" -ForegroundColor Cyan
Write-Host "   1. npm install" -ForegroundColor White
Write-Host "   2. npm run safe-init-db" -ForegroundColor White
Write-Host "   3. npx playwright install chromium" -ForegroundColor White
Write-Host "   4. npm run dev" -ForegroundColor White 