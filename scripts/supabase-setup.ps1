# TaskApp - Supabase one-time setup
# Run in PowerShell from project root:  .\scripts\supabase-setup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== TaskApp - Supabase setup ===" -ForegroundColor Cyan
Write-Host ""

$Supabase = "npx supabase"

# Step 1: Login
Write-Host "Step 1: Log in to Supabase (browser will open)..." -ForegroundColor Cyan
Invoke-Expression "$Supabase login"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Login failed. If already logged in, we continue with link." -ForegroundColor Yellow
}

# Step 2: Get project ref
Write-Host ""
Write-Host "Step 2: Link your project." -ForegroundColor Cyan
Write-Host "  Get Project ref from: Dashboard URL -> .../project/YOUR_PROJECT_REF" -ForegroundColor Gray
Write-Host ""
$ProjectRef = Read-Host "Enter your Supabase Project ref"

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    Write-Host "No project ref. Exiting." -ForegroundColor Red
    exit 1
}

# Step 3: Link (will prompt for DB password)
Write-Host ""
Write-Host "Linking. Enter database password when prompted." -ForegroundColor Cyan
Write-Host "  Password: Project Settings -> Database" -ForegroundColor Gray
Invoke-Expression "$Supabase link --project-ref $ProjectRef"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Link failed. Check project ref and password." -ForegroundColor Red
    exit 1
}

# Step 4: Push migrations
Write-Host ""
Write-Host "Step 3: Pushing migrations..." -ForegroundColor Cyan
Invoke-Expression "$Supabase db push"
if ($LASTEXITCODE -ne 0) {
    Write-Host "db push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host "Next: Create bucket task-files in Storage; enable pg_cron; see supabase/README.md" -ForegroundColor Gray
Write-Host ""
