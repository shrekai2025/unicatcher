@echo off
echo 启动Prisma Studio with 环境变量...

REM 设置环境变量
set DATABASE_URL=file:./prisma/db.sqlite
set AUTH_SECRET=unicatcher-secret-key-2024
set NEXTAUTH_URL=http://localhost:3067
set NODE_ENV=development

echo 环境变量已设置:
echo DATABASE_URL=%DATABASE_URL%

echo.
echo 启动Prisma Studio...
npx prisma studio

pause 