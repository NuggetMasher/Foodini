# Import Docker images from tar files and run the application
# Usage: .\import-images.ps1

Write-Host "Importing Docker images from tar files..." -ForegroundColor Green
Write-Host ""

# Check if tar files exist
if (!(Test-Path -Path ".\foodini-backend.tar")) {
    Write-Host "✗ foodini-backend.tar not found!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path -Path ".\foodini-frontend.tar")) {
    Write-Host "✗ foodini-frontend.tar not found!" -ForegroundColor Red
    exit 1
}

# Check if docker-compose.prod.yml exists
if (!(Test-Path -Path ".\docker-compose.prod.yml")) {
    Write-Host "✗ docker-compose.prod.yml not found!" -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (!(Test-Path -Path ".\.env")) {
    Write-Host "✗ .env file not found! Please create it with GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host "   Create .env with content: GEMINI_API_KEY=your_key_here" -ForegroundColor Yellow
    exit 1
}

# Import backend image
Write-Host "Loading backend image..." -ForegroundColor Cyan
docker load -i foodini-backend.tar
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend image loaded successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to load backend image" -ForegroundColor Red
    exit 1
}

# Import frontend image
Write-Host "Loading frontend image..." -ForegroundColor Cyan
docker load -i foodini-frontend.tar
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend image loaded successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to load frontend image" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting application..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml down 2>$null
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the application at:" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check logs with: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
} else {
    Write-Host "✗ Failed to start application" -ForegroundColor Red
    exit 1
}
