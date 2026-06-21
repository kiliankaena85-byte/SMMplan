@echo off
title Laptop Resource and Performance Optimizer

:: Check for administrative permissions
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrative privileges.
) else (
    echo [INFO] Requesting administrative privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c """%~0"""' -Verb RunAs"
    exit /b
)

echo ========================================================
echo        LAPTOP RESOURCE AND PERFORMANCE OPTIMIZER
echo ========================================================
echo.

echo [1/5] Enabling High Performance Power Scheme...
:: Set active to High Performance GUID 23d07095-00c2-402b-b6eb-04af9a1b0f79
powercfg /setactive 23d07095-00c2-402b-b6eb-04af9a1b0f79 >nul 2>&1
echo Done. Active power plan is now set to High Performance.
echo.

echo [2/5] Cleaning and Optimizing NVMe SSD (TRIM)...
defrag C: /O /U
echo Done. TRIM commands sent to SSD.
echo.

echo [3/5] Disabling Windows Telemetry & Diagnostic services...
:: Disable Connected User Experiences and Telemetry
sc config DiagTrack start= disabled >nul 2>&1
net stop DiagTrack >nul 2>&1
:: Disable WAP Push Message Routing Service (associated with telemetry)
sc config dmwappushservice start= disabled >nul 2>&1
net stop dmwappushservice >nul 2>&1
:: Set Windows Error Reporting to manual (will start only on crash)
sc config WerSvc start= demand >nul 2>&1
net stop WerSvc >nul 2>&1
echo Done. Background telemetry and diagnostic services disabled.
echo.

echo [4/5] Adjusting Visual Effects & Registry delays...
:: Lower MenuShowDelay (makes context menus snap open immediately)
reg add "HKCU\Control Panel\Desktop" /v MenuShowDelay /t REG_SZ /d 20 /f >nul
:: Speed up desktop startup delay
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f >nul 2>&1
echo Done. UI snappiness registry settings applied.
echo.

echo [5/5] Optimizing Windows Startup Applications...
:: Remove iTunes leftover startup helper
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v iTunesHelper /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v iTunesHelper /f >nul 2>&1

:: Disable Figma Agent from autostart
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Figma Agent" /f >nul 2>&1

:: Disable Kontur Autodiag launcher from autostart
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Kontur.Autodiag" /f >nul 2>&1

:: Disable Docker Desktop from autostart
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Docker Desktop" /f >nul 2>&1

:: Disable uTorrent from autostart
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ut" /f >nul 2>&1

:: Disable Yandex Browser AutoLaunch
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "YandexBrowserAutoLaunch_A0D36E272F65AE1D76C31CCEB62180D4" /f >nul 2>&1

echo Done. Startup cleanup finished. (Docker, Figma Agent, Yandex AutoLaunch, uTorrent disabled on startup).
echo.

echo ========================================================
echo               OPTIMIZATION COMPLETED!
echo ========================================================
echo Please restart your computer for all changes to take effect.
echo.
pause
