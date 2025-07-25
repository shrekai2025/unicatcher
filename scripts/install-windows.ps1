# UniCatcher Windows安装脚本

Write-Host "Starting UniCatcher installation..." -ForegroundColor Blue

# 检查Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# 检查npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: npm not found" -ForegroundColor Red
    exit 1
}

# 安装依赖
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# 清理可能存在的文件锁
if (Test-Path "node_modules\.prisma") {
    Write-Host "Cleaning existing Prisma cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
}

# 尝试安装依赖
$installAttempts = 0
$maxAttempts = 3

do {
    $installAttempts++
    Write-Host "Installation attempt $installAttempts/$maxAttempts..." -ForegroundColor Yellow
    
    npm install --no-optional
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Dependencies installed successfully" -ForegroundColor Green
        break
    } else {
        if ($installAttempts -lt $maxAttempts) {
            Write-Host "Installation failed, retrying in 3 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
            
            # 清理node_modules
            if (Test-Path "node_modules") {
                Write-Host "Cleaning node_modules..." -ForegroundColor Yellow
                Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "Error: Failed to install dependencies after $maxAttempts attempts" -ForegroundColor Red
            Write-Host "Please try the following manual steps:" -ForegroundColor Yellow
            Write-Host "1. Close all VS Code/editor windows" -ForegroundColor White
            Write-Host "2. Run: Remove-Item -Recurse -Force node_modules" -ForegroundColor White
            Write-Host "3. Run: npm cache clean --force" -ForegroundColor White
            Write-Host "4. Run: npm install" -ForegroundColor White
            exit 1
        }
    }
} while ($installAttempts -lt $maxAttempts)

# 创建.env文件
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    $envContent = @"
DATABASE_URL="file:./prisma/db.sqlite"
AUTH_SECRET="unicatcher-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3067"
NODE_ENV="development"
PORT=3067
ENABLE_RESOURCE_OPTIMIZATION=true
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host ".env file created successfully" -ForegroundColor Green
} else {
    Write-Host ".env file already exists, skipping..." -ForegroundColor Yellow
}

# 初始化数据库
Write-Host "Initializing database..." -ForegroundColor Yellow
npm run safe-init-db
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to initialize database" -ForegroundColor Red
    exit 1
}
Write-Host "Database initialized successfully" -ForegroundColor Green

# 安装Playwright浏览器
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install Playwright browsers" -ForegroundColor Red
    exit 1
}
Write-Host "Playwright browsers installed successfully" -ForegroundColor Green

Write-Host "" 
Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host "To start development server: npm run dev" -ForegroundColor Cyan
Write-Host "To start production server: npm run start" -ForegroundColor Cyan
Write-Host "Access URL: http://localhost:3067" -ForegroundColor Cyan 