"""Builds Pomodoro-setup.bat: one self-contained file that installs the timer on Windows.

The .bat embeds pomodoro.html (base64), copies it to %LOCALAPPDATA%\\Pomodoro and
creates Desktop + Startup shortcuts. Re-run this after editing pomodoro.html:
    python3 shortcut/build_windows_setup.py
"""
import base64, pathlib, textwrap

here = pathlib.Path(__file__).resolve().parent
html = (here.parent / 'pomodoro.html').read_bytes()
payload = textwrap.wrap(base64.b64encode(html).decode(), 76)

bat = r'''@echo off
rem Pomodoro timer setup for Windows: double-click this file.
rem Installs to %LOCALAPPDATA%\Pomodoro and adds Desktop + Startup shortcuts.
set "SETUP_BAT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=Get-Content -LiteralPath $env:SETUP_BAT; $i=[array]::IndexOf($l,'#PS'); $j=[array]::IndexOf($l,'#PAYLOAD'); iex ($l[($i+1)..($j-1)] -join [char]10)"
echo.
pause
exit /b
#PS
$ErrorActionPreference = 'Stop'
try {
    $dir = Join-Path $env:LOCALAPPDATA 'Pomodoro'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $html = Join-Path $dir 'pomodoro.html'
    $b64 = ($l[($j+1)..($l.Length-1)] -join '')
    [IO.File]::WriteAllBytes($html, [Convert]::FromBase64String($b64))
    $url = ([System.Uri]$html).AbsoluteUri

    $browser = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

    $shell = New-Object -ComObject WScript.Shell
    $targets = @(
        (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Pomodoro.lnk'),
        (Join-Path ([Environment]::GetFolderPath('Startup')) 'Pomodoro.lnk')
    )
    foreach ($p in $targets) {
        $lnk = $shell.CreateShortcut($p)
        if ($browser) {
            $lnk.TargetPath = $browser
            $lnk.Arguments = "--app=`"$url`" --window-size=380,600"
            $lnk.IconLocation = "$browser,0"
        } else {
            $lnk.TargetPath = $html
        }
        $lnk.Description = 'Pomodoro timer'
        $lnk.Save()
    }
    Write-Host 'Done! Pomodoro shortcut is on your Desktop.'
    Write-Host 'It will also open automatically when you sign in to Windows.'
    Start-Process $targets[0]
} catch {
    Write-Host ('Setup failed: ' + $_.Exception.Message) -ForegroundColor Red
}
#PAYLOAD
''' + '\n'.join(payload) + '\n'

(here / 'Pomodoro-setup.bat').write_bytes(bat.replace('\n', '\r\n').encode('ascii'))
print('wrote', here / 'Pomodoro-setup.bat')
