# UniCatcher Windows服务器环境综合检查脚本

param(
    [switch]$Fix = $false,
    [switch]$Detailed = $false
)

Write-Host "🔍 UniCatcher Windows服务器环境检查" -ForegroundColor Blue
Write-Host "运行模式: $(if($Fix) {'自动修复'} else {'仅检查'})" -ForegroundColor Yellow
Write-Host ""

$script:ErrorCount = 0
$script:WarningCount = 0
$script:Issues = @()

function Add-Issue($Type, $Message, $Solution = "") {
    $script:Issues += @{
        Type = $Type
        Message = $Message
        Solution = $Solution
    }
    
    if ($Type -eq "ERROR") {
        $script:ErrorCount++
        Write-Host "   ❌ $Message" -ForegroundColor Red
    } elseif ($Type -eq "WARNING") {
        $script:WarningCount++
        Write-Host "   ⚠️  $Message" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ $Message" -ForegroundColor Green
    }
    
    if ($Solution -and $Detailed) {
        Write-Host "      💡 解决方案: $Solution" -ForegroundColor Cyan
    }
}

# 1. 系统环境检查
Write-Host "🖥️  检查系统环境..." -ForegroundColor Magenta

# 检查PowerShell版本
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Add-Issue "SUCCESS" "PowerShell版本: $($psVersion.ToString())"
} else {
    Add-Issue "ERROR" "PowerShell版本过低: $($psVersion.ToString())" "升级到PowerShell 5.0+"
}

# 检查.NET Framework
try {
    $dotnetVersion = (Get-ItemProperty "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" -Name Release).Release
    if ($dotnetVersion -ge 461808) {
        Add-Issue "SUCCESS" ".NET Framework版本合适"
    } else {
        Add-Issue "WARNING" ".NET Framework版本可能过低" "升级到.NET Framework 4.7.2+"
    }
} catch {
    Add-Issue "WARNING" "无法检测.NET Framework版本"
}

# 检查Windows版本
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -ge 10 -or ($osVersion.Major -eq 6 -and $osVersion.Minor -ge 1)) {
    Add-Issue "SUCCESS" "Windows版本: $($osVersion.ToString())"
} else {
    Add-Issue "ERROR" "Windows版本过低" "升级到Windows Server 2012+或Windows 10+"
}

# 2. Node.js环境检查
Write-Host "`n📦 检查Node.js环境..." -ForegroundColor Magenta

try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -ge 18) {
        Add-Issue "SUCCESS" "Node.js版本: $nodeVersion"
    } else {
        Add-Issue "ERROR" "Node.js版本过低: $nodeVersion" "升级到Node.js 18+"
    }
} catch {
    Add-Issue "ERROR" "Node.js未安装或不在PATH中" "安装Node.js 18+"
}

try {
    $npmVersion = npm --version
    Add-Issue "SUCCESS" "npm版本: $npmVersion"
} catch {
    Add-Issue "ERROR" "npm未安装或不可用" "重新安装Node.js"
}

# 3. 权限检查
Write-Host "`n🔐 检查用户权限..." -ForegroundColor Magenta

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = ([System.Security.Principal.WindowsPrincipal]$currentUser).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Add-Issue "SUCCESS" "当前具有管理员权限"
} else {
    Add-Issue "WARNING" "当前无管理员权限" "以管理员身份运行PowerShell"
}

# 检查目录权限
$directories = @(".", ".\data", ".\prisma", ".\src", ".\scripts")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        try {
            $testFile = Join-Path $dir "test-write-$(Get-Random).tmp"
            "test" | Out-File $testFile -ErrorAction Stop
            Remove-Item $testFile -ErrorAction SilentlyContinue
            Add-Issue "SUCCESS" "目录写权限正常: $dir"
        } catch {
            Add-Issue "ERROR" "目录写权限不足: $dir" "修复目录权限或以管理员身份运行"
        }
    } else {
        Add-Issue "WARNING" "目录不存在: $dir" "创建必要的目录"
    }
}

# 4. 端口检查
Write-Host "`n🌐 检查网络端口..." -ForegroundColor Magenta

$ports = @(3067, 5555)  # 应用端口和Prisma Studio端口
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Add-Issue "WARNING" "端口 $port 已被占用" "停止占用端口的进程或更换端口"
        } else {
            Add-Issue "SUCCESS" "端口 $port 可用"
        }
    } catch {
        # 在某些Windows版本中Test-NetConnection可能不可用
        $listener = netstat -an | Select-String ":$port "
        if ($listener) {
            Add-Issue "WARNING" "端口 $port 已被占用" "停止占用端口的进程或更换端口"
        } else {
            Add-Issue "SUCCESS" "端口 $port 可用"
        }
    }
}

# 5. 文件系统检查
Write-Host "`n📁 检查文件系统..." -ForegroundColor Magenta

# 检查磁盘空间
$drive = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq (Get-Location).Drive.Name }
$freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
if ($freeSpaceGB -gt 5) {
    Add-Issue "SUCCESS" "磁盘空间充足: $freeSpaceGB GB"
} else {
    Add-Issue "ERROR" "磁盘空间不足: $freeSpaceGB GB" "清理磁盘空间，至少需要5GB"
}

# 检查路径长度限制
$currentPath = (Get-Location).Path
if ($currentPath.Length -gt 200) {
    Add-Issue "WARNING" "路径可能过长，可能导致npm安装问题" "将项目移动到较短的路径"
} else {
    Add-Issue "SUCCESS" "路径长度合适"
}

# 6. 项目文件检查
Write-Host "`n📄 检查项目文件..." -ForegroundColor Magenta

$requiredFiles = @(
    "package.json",
    "prisma\schema.prisma",
    "src\env.js",
    "src\lib\config.ts",
    "src\server\auth\config.ts"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Add-Issue "SUCCESS" "文件存在: $file"
    } else {
        Add-Issue "ERROR" "关键文件缺失: $file" "确保项目文件完整"
    }
}

# 检查.env文件
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $requiredVars = @("DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_URL")
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=") {
            Add-Issue "SUCCESS" "环境变量已设置: $var"
        } else {
            Add-Issue "ERROR" "环境变量缺失: $var" "在.env文件中设置$var"
        }
    }
} else {
    Add-Issue "ERROR" ".env文件不存在" "创建.env文件并设置必要的环境变量"
}

# 7. 依赖检查
Write-Host "`n📦 检查项目依赖..." -ForegroundColor Magenta

if (Test-Path "node_modules") {
    Add-Issue "SUCCESS" "node_modules目录存在"
    
    # 检查关键依赖
    $criticalDeps = @("next", "playwright", "@prisma/client")
    foreach ($dep in $criticalDeps) {
        if (Test-Path "node_modules\$dep") {
            Add-Issue "SUCCESS" "依赖已安装: $dep"
        } else {
            Add-Issue "ERROR" "关键依赖缺失: $dep" "运行npm install"
        }
    }
} else {
    Add-Issue "ERROR" "node_modules目录不存在" "运行npm install"
}

# 检查Prisma客户端
if (Test-Path "node_modules\.prisma\client") {
    Add-Issue "SUCCESS" "Prisma客户端已生成"
} else {
    Add-Issue "WARNING" "Prisma客户端未生成" "运行npx prisma generate"
}

# 8. Playwright检查
Write-Host "`n🎭 检查Playwright浏览器..." -ForegroundColor Magenta

# 检查Playwright浏览器路径
$playwrightPaths = @(
    "$env:USERPROFILE\AppData\Local\ms-playwright",
    ".\node_modules\playwright\.local-browsers"
)

$playwrightFound = $false
foreach ($path in $playwrightPaths) {
    if (Test-Path $path) {
        $chromiumDirs = Get-ChildItem -Path $path -Directory | Where-Object { $_.Name -like "chromium-*" }
        if ($chromiumDirs) {
            Add-Issue "SUCCESS" "Playwright Chromium已安装: $path"
            $playwrightFound = $true
            break
        }
    }
}

if (-not $playwrightFound) {
    Add-Issue "ERROR" "Playwright浏览器未安装" "运行npx playwright install chromium"
}

# 9. 自动修复（如果启用）
if ($Fix -and ($script:ErrorCount -gt 0 -or $script:WarningCount -gt 0)) {
    Write-Host "`n🔧 开始自动修复..." -ForegroundColor Magenta
    
    # 创建必要目录
    $dirs = @("data", "data\database", "data\logs", "data\browser-data")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            try {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-Host "   ✅ 创建目录: $dir" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ 无法创建目录: $dir" -ForegroundColor Red
            }
        }
    }
    
    # 修复.env文件
    if (-not (Test-Path ".env")) {
        $envContent = @"
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="windows-server-secret-key-$(Get-Date -Format 'yyyyMMddHHmmss')"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="production"
PORT=3067
ENABLE_RESOURCE_OPTIMIZATION=true
"@
        try {
            $envContent | Out-File -FilePath ".env" -Encoding UTF8
            Write-Host "   ✅ 创建.env文件" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ 无法创建.env文件" -ForegroundColor Red
        }
    }
}

# 10. 生成报告
Write-Host "`n📊 检查结果汇总:" -ForegroundColor Blue
Write-Host "   ✅ 成功: $((($script:Issues | Where-Object { $_.Type -eq 'SUCCESS' }).Count))" -ForegroundColor Green
Write-Host "   ⚠️  警告: $script:WarningCount" -ForegroundColor Yellow  
Write-Host "   ❌ 错误: $script:ErrorCount" -ForegroundColor Red

if ($script:ErrorCount -eq 0 -and $script:WarningCount -eq 0) {
    Write-Host "`n🎉 环境检查通过！可以开始部署项目。" -ForegroundColor Green
} elseif ($script:ErrorCount -eq 0) {
    Write-Host "`n⚠️  存在警告，但可以继续部署。建议修复警告项目。" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ 存在严重错误，请先修复错误项目再进行部署。" -ForegroundColor Red
}

# 建议操作
Write-Host "`n💡 建议操作:" -ForegroundColor Cyan
Write-Host "   1. 修复权限: .\scripts\fix-windows-permissions.ps1" -ForegroundColor White
Write-Host "   2. 修复JWT配置: npm run fix-jwt-session" -ForegroundColor White
Write-Host "   3. 安装依赖: npm install" -ForegroundColor White
Write-Host "   4. 初始化数据库: npm run safe-init-db" -ForegroundColor White
Write-Host "   5. 安装浏览器: npx playwright install chromium" -ForegroundColor White
Write-Host "   6. 启动应用: npm run dev" -ForegroundColor White

# 保存详细报告
$reportPath = ".\data\windows-server-check-report.json"
try {
    $report = @{
        Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Summary = @{
            Success = ($script:Issues | Where-Object { $_.Type -eq 'SUCCESS' }).Count
            Warnings = $script:WarningCount
            Errors = $script:ErrorCount
        }
        Issues = $script:Issues
        Environment = @{
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
            WindowsVersion = [System.Environment]::OSVersion.Version.ToString()
            IsAdmin = $isAdmin
            CurrentPath = (Get-Location).Path
        }
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "`n📄 详细报告已保存到: $reportPath" -ForegroundColor Gray
} catch {
    Write-Host "`n⚠️  无法保存报告到文件" -ForegroundColor Yellow
} 