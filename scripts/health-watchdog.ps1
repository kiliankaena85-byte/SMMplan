# SMMplan Self-Healing Health Watchdog
# Checks all services, Docker containers, Telegram bot, and Tailscale / External health

Write-Host "======================================================================"
Write-Host "            SMMplan SELF-HEALING SYSTEM WATCHDOG                      "
Write-Host "======================================================================"

Write-Host "1. Checking Docker Containers:"
$containers = @("smmplan_web", "smmplan_lite_worker", "smmplan_bot", "smmplan_lite_db", "smmplan_lite_redis")

foreach ($c in $containers) {
    $status = docker inspect -f '{{.State.Status}}' $c 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   [ERROR] Container '$c' -> NOT FOUND (ExitCode: $LASTEXITCODE)"
        continue
    }

    if ($status -eq "running") {
        Write-Host "   [OK] Container '$c' -> RUNNING"
    } else {
        Write-Host "   [WARN] Container '$c' status is '$status'. Attempting to start..."
        docker start $c | Out-Null
        
        # Delay and recheck status before proceeding
        Start-Sleep -Seconds 3
        $recheckStatus = docker inspect -f '{{.State.Status}}' $c 2>$null
        if ($recheckStatus -eq "running") {
            Write-Host "   [OK] Container '$c' restarted successfully -> RUNNING"
        } else {
            Write-Host "   [ERROR] Container '$c' failed to start. Current status: '$recheckStatus'"
        }
    }
}

Write-Host "`n2. Checking Telegram Bot Background Daemon:"
# Precise WMI matching: restrict strictly to official bot runner commands (dist/bot.js or src/bot/index.ts)
$botProcess = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and (
        $_.CommandLine.Contains("dist/bot.js") -or 
        $_.CommandLine.Contains("dist\bot.js") -or 
        $_.CommandLine.Contains("src/bot/index.ts") -or 
        $_.CommandLine.Contains("src\bot\index.ts")
    ) -and -not $_.CommandLine.Contains("vitest") -and -not $_.CommandLine.Contains("vscode")
}

if ($botProcess) {
    $pId = ($botProcess | Select-Object -First 1).ProcessId
    Write-Host "   [OK] Telegram Bot Daemon Process -> RUNNING (PID: $pId)"
} else {
    Write-Host "   [WARN] Telegram Bot daemon not detected. Starting background launcher..."
    if (Test-Path "scripts\start-bot-background.vbs") {
        Start-Process "wscript.exe" -ArgumentList "scripts\start-bot-background.vbs"
    } else {
        Write-Host "   [WARN] Launcher scripts\start-bot-background.vbs not found."
    }
}

Write-Host "`n3. Checking External Health Endpoint (http://127.0.0.1:3000/api/health):"
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/health" -Method Get -TimeoutSec 5
    if ($response.status -eq "healthy") {
        Write-Host "   [OK] Local Web Server -> 200 OK (HEALTHY)"
    } else {
        Write-Host "   [WARN] Local Response: " $response.status
    }
} catch {
    Write-Host "   [ERROR] Local endpoint unreachable: " $_.Exception.Message
}

Write-Host "`n======================================================================"
Write-Host "                       WATCHDOG CHECK COMPLETE                        "
Write-Host "======================================================================"
