@echo off
title System Optimization and C: Drive Cleanup

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
echo        SYSTEM OPTIMIZATION AND C: DRIVE CLEANUP
echo ========================================================
echo.

echo [1/8] Disabling Windows Hibernation (Saves ~6.1 GB)...
powercfg /h off
echo Done.
echo.

echo [2/8] Cleaning system temporary folders (Temp)...
:: User Temp
del /q /f /s "%TEMP%\*" >nul 2>&1
rd /s /q "%TEMP%" >nul 2>&1
mkdir "%TEMP%"
:: Windows Temp
del /q /f /s "C:\Windows\Temp\*" >nul 2>&1
rd /s /q "C:\Windows\Temp" >nul 2>&1
mkdir "C:\Windows\Temp"
echo Done.
echo.

echo [3/8] Cleaning NPM cache...
if exist "%LocalAppData%\npm-cache" (
    rd /s /q "%LocalAppData%\npm-cache"
)
echo Done.
echo.

echo [4/8] Cleaning Windows Update Download Cache...
net stop wuauserv >nul 2>&1
del /q /f /s "C:\Windows\SoftwareDistribution\Download\*" >nul 2>&1
rd /s /q "C:\Windows\SoftwareDistribution\Download" >nul 2>&1
mkdir "C:\Windows\SoftwareDistribution\Download"
net start wuauserv >nul 2>&1
echo Done.
echo.

echo [5/8] Flushing DNS Cache...
ipconfig /flushdns >nul
echo Done.
echo.

echo [6/8] Cleaning Web Browser Caches (Chrome & Yandex)...
:: Google Chrome
if exist "%LocalAppData%\Google\Chrome\User Data\Default\Cache" (
    rd /s /q "%LocalAppData%\Google\Chrome\User Data\Default\Cache"
)
:: Yandex Browser
if exist "%LocalAppData%\Yandex\YandexBrowser\User Data\Default\Cache" (
    rd /s /q "%LocalAppData%\Yandex\YandexBrowser\User Data\Default\Cache"
)
echo Done.
echo.

echo [7/8] Cleaning Playwright Test Browsers (Saves ~2 GB)...
if exist "%LocalAppData%\ms-playwright" (
    rd /s /q "%LocalAppData%\ms-playwright"
)
echo Done.
echo.

echo [8/8] Cleaning Telegram Desktop media cache...
if exist "%AppData%\Telegram Desktop\tdata\user_data\cache" (
    rd /s /q "%AppData%\Telegram Desktop\tdata\user_data\cache"
)
if exist "%AppData%\Telegram Desktop\tdata\user_data\media_cache" (
    rd /s /q "%AppData%\Telegram Desktop\tdata\user_data\media_cache"
)
echo Done.
echo.

echo ========================================================
echo                  CLEANUP COMPLETED!
echo ========================================================
echo.
echo Current C: Drive space status:
powershell -Command "Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='C:'\" | Select-Object @{Name='Free (GB)';Expression={[math]::Round($_.FreeSpace / 1GB, 2)}}, @{Name='Total (GB)';Expression={[math]::Round($_.Size / 1GB, 2)}} | Format-Table"
echo.
pause
