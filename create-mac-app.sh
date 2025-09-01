#!/bin/bash

# Script to create a Mac .app bundle for your React + Express application
# Run this script in your project directory (where start.sh is located)

APP_NAME="Music Tracker"
PROJECT_DIR=$(pwd)
APP_DIR="$HOME/Desktop/$APP_NAME.app"

echo "Creating Mac application: $APP_NAME.app"
echo "Project dir: $PROJECT_DIR"
echo "App dir: $APP_DIR"

# Create the .app directory structure
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources/logs"

# Create the Info.plist file
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>start_app</string>
    <key>CFBundleIdentifier</key>
    <string>com.mycompany.reactapp</string>
    <key>CFBundleName</key>
    <string>Music Tracker</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>app_icon</string>
</dict>
</plist>
EOF

# Detect user's login shell (default to /bin/bash if unknown)
USER_SHELL="${SHELL:-/bin/bash}"
echo "Detected user shell: $USER_SHELL"

# Create the main executable script
cat > "$APP_DIR/Contents/MacOS/start_app" << EOF
#!/bin/bash
# This wrapper runs your project commands using the user's login shell so
# nvm/volta/zshrc/bash_profile are loaded the same way as in Terminal.

# Paths (expanded at creation time)
PROJECT_DIR="$PROJECT_DIR"
APP_DIR="$APP_DIR"
LOG_DIR="\$APP_DIR/Contents/Resources/logs"

# Where to open the browser (change if your dev server uses another port)
APP_URL="http://localhost:5173"

# Use the user's shell as a login shell (-l) and run the command string (-c).
# This ensures shell init files (nvm, PATH, etc.) are loaded.
USER_SHELL="$USER_SHELL"

# Build a single shell command to run both servers using nohup and redirect logs.
# We use nohup + & so the servers keep running even after this wrapper exits.
CMD="
cd \"\$PROJECT_DIR\" || exit 1

# Start Express (adjust path if your server start command differs)
echo '--- Starting Express server ---' >> \"\$LOG_DIR/server.log\"
nohup \$SHELL -lc 'cd \"\$PROJECT_DIR\" && node server/index.js' >> \"\$LOG_DIR/server.log\" 2>&1 &

# Give server a sec to bind to port (optional)
sleep 2

# Start React dev server (npm run dev)
echo '--- Starting React dev server ---' >> \"\$LOG_DIR/react.log\"
nohup \$SHELL -lc 'cd \"\$PROJECT_DIR\" && npm run dev' >> \"\$LOG_DIR/react.log\" 2>&1 &

# Wait briefly then open the browser
sleep 4
open \"\$APP_URL\"

# exit wrapper (background processes were started with nohup &)
exit 0
"

# Execute the cmd string through the user's login shell.
# Use -l in case shell uses zsh and you need ~/.zprofile / ~/.zshrc to run.
"\$USER_SHELL" -lc "\$CMD"
EOF

# Make the executable script actually executable
chmod +x "$APP_DIR/Contents/MacOS/start_app"

echo "📱 To add a custom icon:"
echo "1. Convert your image to .icns format (e.g., Icon Set -> iconutil or an online converter)"
echo "2. Place it at: $APP_DIR/Contents/Resources/app_icon.icns"
echo "3. (Optional) update Info.plist CFBundleIconFile if you named it something else"

echo "✅ Mac application created at: $APP_DIR"
echo ""
echo "To use your new app:"
echo "1. Double-click the $APP_NAME.app icon on your Desktop"
echo "2. Check logs at: $APP_DIR/Contents/Resources/logs/react.log and server.log if something fails"
echo ""
echo "If macOS blocks the app, open System Preferences → Security & Privacy → General and Allow it."
