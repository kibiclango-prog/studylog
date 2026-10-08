@echo off
rem Double-click to remove the Pomodoro shortcuts (Desktop + Startup).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" -Uninstall
echo.
echo Done.
pause
