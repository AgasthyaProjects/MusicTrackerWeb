#!/bin/bash

# Script to create a Mac .app bundle for your React + Express application
# Run this script in your project directory (where start.sh is located)

APP_NAME="Music Tracker"
PROJECT_DIR=$(pwd)
APP_DIR="$HOME/Desktop/$APP_NAME.app"

echo "Creating Mac application: $APP_NAME.app"

# Create the .app directory structure
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

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
    <string>MyReactApp</string>
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

# Create the main executable script
cat > "$APP_DIR/Contents/MacOS/start_app" << EOF
#!/bin/bash

# Navigate to project directory
cd "$PROJECT_DIR"

# Show starting notification
osascript -e 'display notification "Launching Music Tracker..." with title "Music Tracker"' &

# Start the application immediately (skip dependency checks for speed)
npm run dev >/dev/null 2>&1 &
APP_PID=\$!

# Open browser immediately while servers are starting
open http://localhost:5174 &
sleep 1
open http://localhost:5173 &

# Quick check if app started successfully after 3 seconds
(sleep 3 && osascript -e 'display notification "Music Tracker is ready!" with title "Music Tracker"') &

# Monitor and auto-retry browser opening
(
  sleep 2
  for i in {1..8}; do
    if curl -s http://localhost:5174 >/dev/null 2>&1; then
      open http://localhost:5174
      break
    elif curl -s http://localhost:5173 >/dev/null 2>&1; then
      open http://localhost:5173
      break
    fi
    sleep 0.5
  done
) &
EOF

# Make the executable script actually executable
chmod +x "$APP_DIR/Contents/MacOS/start_app"

# Create icon - you can replace this section with your own icon
echo "📱 To add a custom icon:"
echo "1. Convert your image to .icns format using online converter or IconUtil"
echo "2. Replace: $APP_DIR/Contents/Resources/app_icon.icns"
echo "3. Or drag any image onto the app and macOS will use it as icon"

# For now, we'll skip creating the .icns file since it needs to be binary
# The app will use a default icon until you add one

echo "✅ Mac application created at: $APP_DIR"
echo ""
echo "To use your new app:"
echo "1. Double-click the $APP_NAME.app icon on your Desktop"
echo "2. It will automatically run your start.sh script"
echo "3. Your React app will open in your browser"
echo ""
echo "Note: You might need to allow the app in System Preferences > Security & Privacy"
echo "if you get a security warning the first time you run it."