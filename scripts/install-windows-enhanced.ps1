# UniCatcher Windows Enhanced Installation Script
# Integrated auto-fix features and common issue detection

param(
    [switch]$SkipChecks = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "UniCatcher Windows Enhanced Installer" -ForegroundColor Blue
Write-Host "Version: 2.0 (with auto-fix features)" -ForegroundColor Gray
Write-Host ""

# Global variables
$script:InstallLog = @()
$script:ErrorCount = 0
$script:WarningCount = 0

function Write-InstallLog($Level, $Message) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $script:InstallLog += $logEntry
    
    switch ($Level) {
        "INFO" { Write-Host "   [INFO]  $Message" -ForegroundColor Cyan }
        "SUCCESS" { Write-Host "   [OK]    $Message" -ForegroundColor Green }
        "WARNING" { 
            Write-Host "   [WARN]  $Message" -ForegroundColor Yellow
            $script:WarningCount++
        }
        "ERROR" { 
            Write-Host "   [ERROR] $Message" -ForegroundColor Red
            $script:ErrorCount++
        }
    }
    
    if ($Verbose) {
        Write-Host "      $logEntry" -ForegroundColor DarkGray
    }
}

# Step 1: Environment check and auto-fix
Write-Host "Step 1: Environment check and auto-fix..." -ForegroundColor Magenta

if (-not $SkipChecks) {
    Write-InstallLog "INFO" "Performing environment check..."
    
    # Check admin privileges
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $isAdmin = ([System.Security.Principal.WindowsPrincipal]$currentUser).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($isAdmin) {
        Write-InstallLog "SUCCESS" "Admin privileges detected"
    } else {
        Write-InstallLog "WARNING" "Recommend running with admin privileges to avoid permission issues"
    }
    
    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -ge 5) {
        Write-InstallLog "SUCCESS" "PowerShell version: $($psVersion.ToString())"
    } else {
        Write-InstallLog "ERROR" "PowerShell version too low, requires 5.0+"
        exit 1
    }
    
    # Auto permission fix
    Write-InstallLog "INFO" "Performing permission precheck and fix..."
    
    # Stop potentially conflicting processes
    Get-Process -Name "node","npm" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-InstallLog "INFO" "Stopping process: $($_.Name) (PID: $($_.Id))"
        $_ | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    # Create necessary directories
    $directories = @("data", "data\logs", "data\browser-data", "prisma")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            try {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-InstallLog "SUCCESS" "Created directory: $dir"
            } catch {
                Write-InstallLog "ERROR" "Cannot create directory: $dir"
            }
        }
    }
    
    # Set directory permissions
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            try {
                $acl = Get-Acl $dir
                $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser.Name, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
                $acl.SetAccessRule($accessRule)
                Set-Acl -Path $dir -AclObject $acl
                Write-InstallLog "SUCCESS" "Set permissions for: $dir"
            } catch {
                Write-InstallLog "WARNING" "Cannot set permissions for: $dir (will continue installation)"
            }
        }
    }
    
    Write-InstallLog "SUCCESS" "Environment check and fix completed"
} else {
    Write-InstallLog "INFO" "Skipping environment check (-SkipChecks)"
}

# Step 2: Node.js environment verification
Write-Host "`nStep 2: Node.js environment verification..." -ForegroundColor Magenta

try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -ge 18) {
        Write-InstallLog "SUCCESS" "Node.js version: $nodeVersion"
    } else {
        Write-InstallLog "ERROR" "Node.js version too low: $nodeVersion (requires 18+)"
        Write-Host "`nPlease download and install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-InstallLog "ERROR" "Node.js not installed or not in PATH"
    Write-Host "`nPlease download and install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

try {
    $npmVersion = npm --version
    Write-InstallLog "SUCCESS" "npm version: $npmVersion"
} catch {
    Write-InstallLog "ERROR" "npm not installed or unavailable"
    exit 1
}

# Step 3: Cleanup and preparation
Write-Host "`nStep 3: Cleanup and preparation..." -ForegroundColor Magenta

# Clean npm cache
try {
    npm cache clean --force 2>$null
    Write-InstallLog "SUCCESS" "npm cache cleaned"
} catch {
    Write-InstallLog "WARNING" "npm cache clean failed"
}

# Clean possible file locks
if (Test-Path "node_modules\.prisma") {
    try {
        Remove-Item -Recurse -Force "node_modules\.prisma"
        Write-InstallLog "SUCCESS" "Prisma cache cleaned"
    } catch {
        Write-InstallLog "WARNING" "Cannot clean Prisma cache"
    }
}

# Set npm configuration
try {
    $npmCache = "$env:USERPROFILE\.npm-cache"
    $npmPrefix = "$env:USERPROFILE\.npm-global"
    
    npm config set cache $npmCache --global 2>$null
    npm config set prefix $npmPrefix --global 2>$null
    
    if (-not (Test-Path $npmCache)) { New-Item -ItemType Directory -Path $npmCache -Force | Out-Null }
    if (-not (Test-Path $npmPrefix)) { New-Item -ItemType Directory -Path $npmPrefix -Force | Out-Null }
    
    Write-InstallLog "SUCCESS" "npm configuration optimized"
} catch {
    Write-InstallLog "WARNING" "npm configuration optimization failed"
}

# Step 4: Environment variable configuration
Write-Host "`nStep 4: Environment variable configuration..." -ForegroundColor Magenta

# Generate strong AUTH_SECRET
function Generate-SecureSecret {
    $bytes = New-Object byte[] 32
    ([System.Security.Cryptography.RNGCryptoServiceProvider]::Create()).GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

if (-not (Test-Path ".env")) {
    $authSecret = Generate-SecureSecret
    $envContent = @"
# UniCatcher Production Environment Configuration
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
        Write-InstallLog "SUCCESS" "Created .env file (with strong password)"
    } catch {
        Write-InstallLog "ERROR" "Cannot create .env file"
        exit 1
    }
} else {
    Write-InstallLog "INFO" "Checking existing .env file..."
    
    $envContent = Get-Content ".env" -Raw
    $needsUpdate = $false
    
    # Check AUTH_SECRET
    if ($envContent -match 'AUTH_SECRET="?([^"]*)"?') {
        $currentSecret = $matches[1]
        if ($currentSecret -eq "unicatcher-secret-key-2024-change-in-production" -or $currentSecret.Length -lt 32) {
            Write-InstallLog "WARNING" "AUTH_SECRET too weak, updating..."
            $newSecret = Generate-SecureSecret
            $envContent = $envContent -replace 'AUTH_SECRET="?[^"]*"?', "AUTH_SECRET=`"$newSecret`""
            $needsUpdate = $true
        }
    }
    
    # Check DATABASE_URL path (ensure using correct prisma path)
    if ($envContent -match 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?') {
        Write-InstallLog "WARNING" "Updating DATABASE_URL path to correct prisma location..."
        $envContent = $envContent -replace 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?', 'DATABASE_URL="file:./prisma/db.sqlite"'
        $needsUpdate = $true
    }
    
    if ($needsUpdate) {
        try {
            $envContent | Out-File -FilePath ".env" -Encoding UTF8
            Write-InstallLog "SUCCESS" ".env file updated"
        } catch {
            Write-InstallLog "ERROR" "Cannot update .env file"
        }
    } else {
        Write-InstallLog "SUCCESS" ".env file configuration correct"
    }
}

# Step 5: Dependency installation
Write-Host "`nStep 5: Dependency installation..." -ForegroundColor Magenta

$installAttempts = 0
$maxAttempts = 3
$installSuccess = $false

do {
    $installAttempts++
    Write-InstallLog "INFO" "Installation attempt $installAttempts/$maxAttempts..."
    
    try {
        npm install --no-optional
        if ($LASTEXITCODE -eq 0) {
            Write-InstallLog "SUCCESS" "Dependencies installed successfully"
            $installSuccess = $true
            break
        }
    } catch {
        Write-InstallLog "WARNING" "Installation failed: $($_.Exception.Message)"
    }
    
    if ($installAttempts -lt $maxAttempts) {
        Write-InstallLog "INFO" "Retrying in 3 seconds..."
        Start-Sleep -Seconds 3
        
        # Clean node_modules
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
            Write-InstallLog "INFO" "Cleaned node_modules"
        }
    }
} while ($installAttempts -lt $maxAttempts -and -not $installSuccess)

if (-not $installSuccess) {
    Write-InstallLog "ERROR" "Dependency installation failed, please run manual fix"
    Write-Host "`nManual fix steps:" -ForegroundColor Yellow
    Write-Host "   1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "   2. Run: npm run fix-permissions" -ForegroundColor White
    Write-Host "   3. Run: npm install" -ForegroundColor White
    exit 1
}

# Step 6: Build application
Write-Host "`nStep 6: Build application..." -ForegroundColor Magenta

try {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-InstallLog "SUCCESS" "Application built successfully"
    } else {
        throw "Build failed"
    }
} catch {
    Write-InstallLog "ERROR" "Application build failed"
    Write-InstallLog "INFO" "This may cause runtime issues. Consider running: npm run build"
}

# Step 7: Database initialization
Write-Host "`nStep 7: Database initialization..." -ForegroundColor Magenta

try {
    npm run safe-init-db
    if ($LASTEXITCODE -eq 0) {
        Write-InstallLog "SUCCESS" "Database initialized successfully"
    } else {
        throw "Database initialization failed"
    }
} catch {
    Write-InstallLog "ERROR" "Database initialization failed"
    Write-InstallLog "INFO" "Attempting manual initialization..."
    
    try {
        npx prisma db push
        npx prisma generate
        Write-InstallLog "SUCCESS" "Manual database initialization successful"
    } catch {
        Write-InstallLog "ERROR" "Database initialization completely failed"
        exit 1
    }
}

# Step 8: Playwright browser installation
Write-Host "`nStep 8: Playwright browser installation..." -ForegroundColor Magenta

try {
    npx playwright install chromium
    if ($LASTEXITCODE -eq 0) {
        Write-InstallLog "SUCCESS" "Playwright browser installed successfully"
    } else {
        throw "Playwright installation failed"
    }
} catch {
    Write-InstallLog "ERROR" "Playwright browser installation failed"
    Write-InstallLog "INFO" "Recommend manual installation: npx playwright install chromium"
}

# Step 9: JWT configuration verification
Write-Host "`nStep 9: JWT configuration verification..." -ForegroundColor Magenta

try {
    Write-InstallLog "INFO" "Verifying JWT configuration..."
    node scripts/fix-jwt-session.mjs
    Write-InstallLog "SUCCESS" "JWT configuration verification completed"
} catch {
    Write-InstallLog "WARNING" "JWT configuration verification failed, but doesn't affect installation"
}

# Step 10: Final verification
Write-Host "`nStep 10: Final verification..." -ForegroundColor Magenta

# Check critical files
$criticalFiles = @(
    ".env",
    "node_modules\next",
    "node_modules\playwright",
    "node_modules\.prisma\client"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-InstallLog "SUCCESS" "File check passed: $file"
    } else {
        Write-InstallLog "WARNING" "File missing: $file"
    }
}

# Save installation log
try {
    $logContent = $script:InstallLog -join "`n"
    $logPath = ".\data\logs\install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    if (-not (Test-Path ".\data\logs")) {
        New-Item -ItemType Directory -Path ".\data\logs" -Force | Out-Null
    }
    
    $logContent | Out-File -FilePath $logPath -Encoding UTF8
    Write-InstallLog "SUCCESS" "Installation log saved to: $logPath"
} catch {
    Write-InstallLog "WARNING" "Cannot save installation log"
}

# Installation completion summary
Write-Host "`nInstallation Summary:" -ForegroundColor Blue
Write-Host "   Success: $((($script:InstallLog | Where-Object { $_ -like '*SUCCESS*' }).Count))" -ForegroundColor Green
Write-Host "   Warning: $script:WarningCount" -ForegroundColor Yellow
Write-Host "   Error: $script:ErrorCount" -ForegroundColor Red

if ($script:ErrorCount -eq 0) {
    Write-Host "`nUniCatcher installation successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Start development server: npm run dev" -ForegroundColor White
    Write-Host "   2. Start production server: npm run start" -ForegroundColor White
    Write-Host "   3. Access application: http://localhost:3067" -ForegroundColor White
    Write-Host "   4. Login credentials: admin / a2885828" -ForegroundColor White
    Write-Host ""
    Write-Host "Troubleshooting tools:" -ForegroundColor Cyan
    Write-Host "   - Environment check: npm run windows-check" -ForegroundColor White
    Write-Host "   - Permission fix: npm run fix-permissions" -ForegroundColor White
    Write-Host "   - JWT fix: npm run fix-jwt-session" -ForegroundColor White
    Write-Host "   - Auth debug: npm run debug-auth" -ForegroundColor White
} else {
    Write-Host "`nInstallation completed with errors, please check above issues" -ForegroundColor Yellow
    Write-Host "Run troubleshooting: npm run windows-fix" -ForegroundColor Cyan
} 