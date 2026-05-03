param (
    [string]$ServerHost = "root@smmplan.pro",
    [string]$ServerPath = "/opt/smmplan_lite"
)

Write-Host "Starting Hybrid Deployment..." -ForegroundColor Cyan

Write-Host "1. Building Docker image locally..." -ForegroundColor Yellow
docker buildx build --platform linux/amd64 -t smmplan_lite_prod_app:latest .
if ($LASTEXITCODE -ne 0) { throw "Build failed!" }

Write-Host "2. Packaging image to tar..." -ForegroundColor Yellow
docker save smmplan_lite_prod_app:latest -o smmplan_app.tar
if ($LASTEXITCODE -ne 0) { throw "Save failed!" }

Write-Host "3. Sending configuration and image to $ServerHost..." -ForegroundColor Yellow
scp docker-compose.prod.yml "$($ServerHost):$($ServerPath)/docker-compose.prod.yml"
scp -r nginx "$($ServerHost):$($ServerPath)/"
scp smmplan_app.tar "$($ServerHost):/tmp/smmplan_app.tar"
if ($LASTEXITCODE -ne 0) { throw "SCP transfer failed!" }

Write-Host "4. Deploying on server..." -ForegroundColor Yellow
$remoteCommands = @"
    echo 'Loading image...'
    docker load -i /tmp/smmplan_app.tar
    rm /tmp/smmplan_app.tar

    echo 'Restarting containers...'
    cd $ServerPath
    docker compose -f docker-compose.prod.yml up -d

    echo 'Running migrations...'
    docker exec smmplan_lite_prod_app npx prisma migrate deploy
    
    echo 'Finalizing cleanup...'
    docker image prune -f --filter "until=24h"
    echo 'Remote deployment finished!'
"@

ssh $ServerHost $remoteCommands
if ($LASTEXITCODE -ne 0) { throw "Remote execution failed!" }

Write-Host "5. Cleanup local files..." -ForegroundColor Yellow
Remove-Item smmplan_app.tar -ErrorAction SilentlyContinue

Write-Host "Deployment Successful!" -ForegroundColor Green
