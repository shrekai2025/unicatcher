# Prisma Studio 启动脚本
Write-Host "🔧 启动Prisma Studio with 环境变量..." -ForegroundColor Green

# 设置环境变量
$env:DATABASE_URL = "file:./prisma/db.sqlite"
$env:AUTH_SECRET = "unicatcher-secret-key-2024"
$env:NEXTAUTH_URL = "http://localhost:3067"
$env:NODE_ENV = "development"

Write-Host ""
Write-Host "✅ 环境变量已设置:" -ForegroundColor Green
Write-Host "   DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Yellow
Write-Host "   AUTH_SECRET: $env:AUTH_SECRET" -ForegroundColor Yellow
Write-Host "   NEXTAUTH_URL: $env:NEXTAUTH_URL" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 启动Prisma Studio..." -ForegroundColor Green
Write-Host "访问地址: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""

# 启动Prisma Studio
npx prisma studio 