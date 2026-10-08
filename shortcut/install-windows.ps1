# Creates "Pomodoro" shortcuts on the Desktop and in the Startup folder.
# The timer opens as a small app-style window (Edge or Chrome --app mode).
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$name = 'Pomodoro.lnk'
$desktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) $name
$startupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) $name

if ($Uninstall) {
    foreach ($p in @($desktopLnk, $startupLnk)) { if (Test-Path $p) { Remove-Item $p; Write-Host "Removed: $p" } }
    exit 0
}

$html = Join-Path (Split-Path -Parent $PSScriptRoot) 'pomodoro.html'
if (-not (Test-Path $html)) { throw "pomodoro.html not found: $html" }
$url = ([System.Uri](Resolve-Path $html).Path).AbsoluteUri

$browsers = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$shell = New-Object -ComObject WScript.Shell
foreach ($lnkPath in @($desktopLnk, $startupLnk)) {
    $lnk = $shell.CreateShortcut($lnkPath)
    if ($browser) {
        $lnk.TargetPath = $browser
        $lnk.Arguments = "--app=`"$url`" --window-size=380,600"
        $lnk.IconLocation = "$browser,0"
    } else {
        # No Edge/Chrome found: open with the default browser
        $lnk.TargetPath = (Resolve-Path $html).Path
    }
    $lnk.Description = 'Pomodoro timer'
    $lnk.Save()
    Write-Host "Created: $lnkPath"
}
