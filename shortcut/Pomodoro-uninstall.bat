@echo off
rem Removes the Pomodoro timer installed by Pomodoro-setup.bat.
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($p in @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Pomodoro.lnk'), (Join-Path ([Environment]::GetFolderPath('Startup')) 'Pomodoro.lnk'), (Join-Path $env:LOCALAPPDATA 'Pomodoro'))) { if (Test-Path $p) { Remove-Item -Recurse -Force $p } }; Write-Host 'Pomodoro removed.'"
echo.
pause
