@echo off
rem Double-click to add Pomodoro shortcuts (Desktop + Startup).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
echo.
echo Done. Pomodoro will also open when you sign in to Windows.
pause
