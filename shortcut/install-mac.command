#!/bin/bash
# Double-click to add a Pomodoro launcher to the Desktop and open it at login.
# Run with --uninstall to remove both.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$DIR/pomodoro.html"
LAUNCHER="$HOME/Desktop/Pomodoro.command"
PLIST="$HOME/Library/LaunchAgents/local.pomodoro.plist"

if [ "$1" = "--uninstall" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST" "$LAUNCHER"
  echo "Removed."
  exit 0
fi

[ -f "$HTML" ] || { echo "pomodoro.html not found: $HTML"; exit 1; }
URL="file://$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$HTML")"

# Small app-style window in Chrome/Edge if installed, else the default browser
OPEN_CMD="open \"$HTML\""
for app in "Google Chrome" "Microsoft Edge"; do
  if [ -d "/Applications/$app.app" ]; then
    OPEN_CMD="open -na \"$app\" --args --app=\"$URL\" --window-size=380,600"
    break
  fi
done

cat > "$LAUNCHER" <<SH
#!/bin/bash
$OPEN_CMD
SH
chmod +x "$LAUNCHER"

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>local.pomodoro</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-c</string><string>$(printf %s "$OPEN_CMD" | sed 's/&/\&amp;/g; s/"/\&quot;/g')</string></array>
  <key>RunAtLoad</key><true/>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Done: Desktop/Pomodoro.command created, opens at login."
