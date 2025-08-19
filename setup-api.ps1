# setup-api.ps1 - PowerShell script to set up Next.js API structure

Write-Host "🏄‍♂️ Setting up Surf Report API structure..." -ForegroundColor Cyan

# Create API directory structure
$directories = @(
    "app\api",
    "app\api\beaches",
    "app\api\beaches\[county]",
    "app\api\counties", 
    "app\api\forecast",
    "app\api\forecast\[beachId]",
    "app\api\forecast\[beachId]\current",
    "app\api\forecast\[beachId]\week",
    "app\api\forecast\[beachId]\today",
    "app\api\conditions",
    "app\api\conditions\[county]",
    "app\api\conditions\[county]\daily",
    "app\api\search",
    "app\api\search\beaches",
    "app\api\surf",
    "app\api\surf\best",
    "app\api\health"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "📁 Exists: $dir" -ForegroundColor Yellow
    }
}

# Create lib directory if it doesn't exist
if (!(Test-Path "lib")) {
    New-Item -ItemType Directory -Path "lib" -Force | Out-Null
    Write-Host "✅ Created: lib" -ForegroundColor Green
}

# Check if .env.local exists
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  Creating .env.local file..." -ForegroundColor Yellow
    @"
# Supabase Configuration
SUPABASE_URL=https://wborkytqlmkcgwzhsoiz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Next.js Configuration
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local - PLEASE UPDATE WITH YOUR ACTUAL KEYS!" -ForegroundColor Red
} else {
    Write-Host "📄 .env.local already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install Supabase: npm install @supabase/supabase-js" -ForegroundColor White
Write-Host "2. Update .env.local with your actual Supabase keys" -ForegroundColor White
Write-Host "3. Copy the API route files from the artifacts" -ForegroundColor White
Write-Host "4. Copy the lib/supabase.ts file" -ForegroundColor White
Write-Host "5. Test with: npm run dev" -ForegroundColor White
Write-Host "6. Visit: http://localhost:3000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "🏗️ API Structure ready!" -ForegroundColor Green