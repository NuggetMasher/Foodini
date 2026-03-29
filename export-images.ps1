# Build and export Docker images as tar files
# Usage: .\export-images.ps1

Write-Host "Building Docker images..." -ForegroundColor Green

# Build images
docker-compose -f docker-compose.prod.yml build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Exporting images as tar files..." -ForegroundColor Green

# Create exports directory if it doesn't exist
if (!(Test-Path -Path ".\docker-exports")) {
    New-Item -ItemType Directory -Path ".\docker-exports" | Out-Null
}

# Export backend image
Write-Host "Exporting backend image..." -ForegroundColor Cyan
docker save foodini-backend:latest -o .\docker-exports\foodini-backend.tar
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend image exported successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to export backend image" -ForegroundColor Red
}

# Export frontend image
Write-Host "Exporting frontend image..." -ForegroundColor Cyan
docker save foodini-frontend:latest -o .\docker-exports\foodini-frontend.tar
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend image exported successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to export frontend image" -ForegroundColor Red
}

Write-Host ""
Write-Host "Export complete! Files in ./docker-exports/" -ForegroundColor Green
Write-Host ""
Write-Host "To use on another device:" -ForegroundColor Yellow
Write-Host "1. Copy docker-exports/ folder to the target device"
Write-Host "2. Copy docker-compose.prod.yml and .env to the target device"
Write-Host "3. On target device, run: docker load -i foodini-backend.tar"
Write-Host "4. On target device, run: docker load -i foodini-frontend.tar"
Write-Host "5. On target device, run: docker-compose -f docker-compose.prod.yml up -d"
