#!/bin/bash

echo "🔍 Quick Server Diagnosis - UniCatcher"
echo "======================================"

echo ""
echo "1. Running comprehensive diagnostics..."
node scripts/diagnose-server.mjs

echo ""
echo "2. Checking if build is needed..."
if [ ! -d ".next" ]; then
    echo "   Building application..."
    npm run build
else
    echo "   ✅ Build directory exists"
fi

echo ""
echo "3. Ensuring Prisma client is generated..."
npx prisma generate

echo ""
echo "4. Checking database status..."
npx prisma db push

echo ""
echo "5. Final system check..."
echo "   - Node.js version: $(node --version)"
echo "   - npm version: $(npm --version)"
echo "   - Current directory: $(pwd)"
echo "   - Free disk space: $(df -h . | tail -1 | awk '{print $4}')"

echo ""
echo "🎯 Quick fix commands if needed:"
echo "   - Reinstall deps: npm install"
echo "   - Rebuild app: npm run build"  
echo "   - Reset database: npm run safe-init-db"
echo "   - Start app: npm run start"

echo ""
echo "✅ Diagnosis complete!" 