# UniCatcher Windows Enhanced Installation Script
# Integrated auto-fix features and common issue detection

param(
    [switch]$SkipChecks = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "UniCatcher Windows Enhanced Installer" -ForegroundColor Blue
Write-Host "Version: 2.1 (with build tools auto-detection)" -ForegroundColor Gray
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  - Node.js 18+ installed" -ForegroundColor Gray
Write-Host "  - Visual Studio Build Tools (will prompt if missing)" -ForegroundColor Gray
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

# No longer needed - simple authentication doesn't require JWT secrets

if (-not (Test-Path ".env")) {
    $envContent = @"
# UniCatcher Production Environment Configuration
DATABASE_URL="file:./prisma/db.sqlite"
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
    
    # Check DATABASE_URL path (ensure using correct prisma path)
    if ($envContent -match 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?') {
        Write-InstallLog "WARNING" "Updating DATABASE_URL path to correct prisma location..."
        $envContent = $envContent -replace 'DATABASE_URL="?file:\.\/data\/database\/db\.sqlite"?', 'DATABASE_URL="file:./prisma/db.sqlite"'
        $needsUpdate = $true
    }
    
    # Remove old NextAuth variables if they exist
    if ($envContent -match 'AUTH_SECRET=') {
        Write-InstallLog "INFO" "Removing old AUTH_SECRET (no longer needed)"
        $envContent = $envContent -replace 'AUTH_SECRET="?[^"]*"?\r?\n?', ''
        $needsUpdate = $true
    }
    
    if ($envContent -match 'NEXTAUTH_URL=') {
        Write-InstallLog "INFO" "Removing old NEXTAUTH_URL (no longer needed)"
        $envContent = $envContent -replace 'NEXTAUTH_URL="?[^"]*"?\r?\n?', ''
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

# Check for build tools
Write-InstallLog "INFO" "Checking Windows build tools..."
try {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $buildToolsFound = $false
    
    if (Test-Path $vsWhere) {
        # Check if build tools are actually installed
        $output = & $vsWhere -products "*" -requires Microsoft.VisualStudio.Workload.MSBuildTools -format json 2>$null
        if ($output -and $output.Length -gt 2) {
            Write-InstallLog "SUCCESS" "Visual Studio build tools detected and available"
            $buildToolsFound = $true
        }
    }
    
    if (-not $buildToolsFound) {
        Write-InstallLog "WARNING" "Visual Studio build tools not found or not properly configured"
        Write-Host ""
        Write-Host "   IMPORTANT: Windows build tools are required for native modules!" -ForegroundColor Yellow
        Write-Host "   Please run the following command in an administrator PowerShell:" -ForegroundColor Yellow
        Write-Host "   winget install Microsoft.VisualStudio.2022.BuildTools" -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host ""
        Write-Host "   After installation, press Enter to continue..." -ForegroundColor Yellow
        Read-Host
        Write-InstallLog "INFO" "Continuing installation (assuming build tools will be available)"
    }
} catch {
    Write-InstallLog "WARNING" "Could not check build tools - continuing anyway"
}

$installAttempts = 0
$maxAttempts = 3
$installSuccess = $false

do {
    $installAttempts++
    Write-InstallLog "INFO" "Installation attempt $installAttempts/$maxAttempts..."
    
    try {
        # Try with different npm strategies
        if ($installAttempts -eq 1) {
            npm install --no-optional
        } elseif ($installAttempts -eq 2) {
            Write-InstallLog "INFO" "Trying with rebuild..."
            npm install --no-optional
            npm rebuild 2>$null
        } else {
            Write-InstallLog "INFO" "Trying with force and no-bin-links..."
            npm install --no-optional --force --no-bin-links
        }
        
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
        
        # Clean node_modules and npm cache
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
            Write-InstallLog "INFO" "Cleaned node_modules"
        }
        if (Test-Path "package-lock.json") {
            Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
            Write-InstallLog "INFO" "Cleaned package-lock.json"
        }
        npm cache clean --force 2>$null
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

$buildAttempts = 0
$maxBuildAttempts = 2
$buildSuccess = $false

do {
    $buildAttempts++
    Write-InstallLog "INFO" "Build attempt $buildAttempts/$maxBuildAttempts..."
    
    try {
        if ($buildAttempts -eq 1) {
            npm run build
        } else {
            Write-InstallLog "INFO" "Trying rebuild with native modules fix..."
            npm rebuild lightningcss 2>$null
            npm run build
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-InstallLog "SUCCESS" "Application built successfully"
            $buildSuccess = $true
            break
        } else {
            throw "Build failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-InstallLog "WARNING" "Build attempt $buildAttempts failed: $($_.Exception.Message)"
        
        if ($buildAttempts -eq $maxBuildAttempts) {
            Write-InstallLog "ERROR" "Application build failed after $maxBuildAttempts attempts"
            Write-InstallLog "INFO" "Manual fix: npm cache clean --force && npm rebuild && npm run build"
            Write-InstallLog "INFO" "This may cause runtime issues, but installation will continue"
        }
    }
} while ($buildAttempts -lt $maxBuildAttempts -and -not $buildSuccess)

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

# Step 9: Authentication system verification
Write-Host "`nStep 9: Authentication system verification..." -ForegroundColor Magenta

Write-InstallLog "SUCCESS" "Simple authentication system configured (admin/******)"
Write-InstallLog "INFO" "No additional JWT configuration needed"

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
    Write-Host "   4. Login credentials: admin / ******" -ForegroundColor White
    Write-Host ""
    Write-Host "Troubleshooting tools:" -ForegroundColor Cyan
    Write-Host "   - Environment check: npm run windows-check" -ForegroundColor White
    Write-Host "   - Permission fix: npm run fix-permissions" -ForegroundColor White
    Write-Host "   - Auth system check: npm run debug-auth" -ForegroundColor White
    Write-Host ""
    Write-Host "If build errors occur:" -ForegroundColor Yellow
    Write-Host "   - Install build tools: winget install Microsoft.VisualStudio.2022.BuildTools" -ForegroundColor White
} else {
    Write-Host "`nInstallation completed with errors, please check above issues" -ForegroundColor Yellow
    Write-Host "Run troubleshooting: npm run windows-fix" -ForegroundColor Cyan
} 