#!/bin/bash

# Enhanced script to create a macOS .pkg installer that bundles everything

APP_NAME="MusicTracker"
INSTALLER_NAME="${APP_NAME}-Installer"
VERSION="1.0"
BUNDLE_ID="com.yourcompany.${APP_NAME}"

echo "Creating comprehensive macOS Package Installer..."

# Create temporary directory structure
TEMP_DIR="temp_installer"
PAYLOAD_DIR="$TEMP_DIR/payload"
SCRIPTS_DIR="$TEMP_DIR/scripts"

rm -rf "$TEMP_DIR"
mkdir -p "$PAYLOAD_DIR/Applications"
mkdir -p "$SCRIPTS_DIR"

# Create the app bundle in payload
APP_DIR="$PAYLOAD_DIR/Applications/${APP_NAME}.app"
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Bundle the entire project inside the app
PROJECT_DIR="${APP_DIR}/Contents/Resources/project"
mkdir -p "$PROJECT_DIR"

echo "📦 Bundling project files..."

# Copy essential project files (customize this list for your project)
if [ -f "package.json" ]; then
    cp package.json "$PROJECT_DIR/"
else
    echo "Warning: package.json not found"
fi

# Copy common directories and files
for item in server src public start.sh *.js *.md; do
    if [ -e "$item" ]; then
        echo "Copying: $item"
        cp -r "$item" "$PROJECT_DIR/"
    fi
done

# Exclude unnecessary files from the bundle
rm -rf "$PROJECT_DIR/node_modules" 2>/dev/null
rm -rf "$PROJECT_DIR/.git" 2>/dev/null
rm -rf "$PROJECT_DIR/temp_installer" 2>/dev/null
rm -rf "$PROJECT_DIR"/*.pkg 2>/dev/null
rm -rf "$PROJECT_DIR"/*.dmg 2>/dev/null

# Verify essential files were copied
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "❌ Error: package.json was not copied to bundle"
    exit 1
fi

echo "✅ Project files bundled successfully"
ls -la "$PROJECT_DIR/"

# Create Info.plist
cat > "${APP_DIR}/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <false/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeRole</key>
            <string>Viewer</string>
        </dict>
    </array>
</dict>
</plist>
EOF

# Create enhanced launcher script that uses bundled project
cat > "${APP_DIR}/Contents/MacOS/launcher" << 'LAUNCHER_EOF'
#!/bin/bash

# Get paths
APP_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUNDLE_PROJECT_DIR="$(dirname "$(dirname "$APP_PATH")")/Resources/project"

# Set up PATH to include common Node.js locations
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Debug: Check what's actually in the bundle
echo "Debug: APP_PATH = $APP_PATH"
echo "Debug: BUNDLE_PROJECT_DIR = $BUNDLE_PROJECT_DIR"
echo "Debug: Contents of Resources:"
ls -la "$(dirname "$(dirname "$APP_PATH")")/Resources/" 2>/dev/null || echo "Resources directory not found"

# Check if bundled project exists
if [ ! -d "$BUNDLE_PROJECT_DIR" ]; then
    osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Error: Bundled project not found at: $BUNDLE_PROJECT_DIR

Debug info:
APP_PATH: $APP_PATH
Expected location: $BUNDLE_PROJECT_DIR

Please check the installer creation." buttons {"OK"} default button "OK"
end tell
APPLESCRIPT
    exit 1
fi

# Copy project to user's preferred location on first run
USER_PROJECT_DIR="$HOME/Documents/MyReactExpressApp-Project"

if [ ! -d "$USER_PROJECT_DIR" ]; then
    # First run - ask user where to install project
    RESPONSE=$(osascript << 'APPLESCRIPT'
tell application "System Events"
    display dialog "First time setup: Where would you like to install the project files?" buttons {"Documents Folder", "Choose Location"} default button "Documents Folder"
    return button returned of result
end tell
APPLESCRIPT
)
    
    if [ "$RESPONSE" = "Choose Location" ]; then
        CHOSEN_DIR=$(osascript << 'APPLESCRIPT'
tell application "System Events"
    set chosenFolder to choose folder with prompt "Select folder for project installation:" default location (path to documents folder)
    return POSIX path of chosenFolder
end tell
APPLESCRIPT
)
        USER_PROJECT_DIR="${CHOSEN_DIR%/}/MyReactExpressApp-Project"
    fi
    
    # Show setup message
    osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Setting up project files at:
$USER_PROJECT_DIR" buttons {"OK"} default button "OK" giving up after 3
end tell
APPLESCRIPT
    
    # Copy project files
    echo "Copying from: $BUNDLE_PROJECT_DIR"
    echo "Copying to: $USER_PROJECT_DIR"
    
    cp -r "$BUNDLE_PROJECT_DIR" "$USER_PROJECT_DIR"
    
    if [ $? -eq 0 ]; then
        # Make scripts executable
        chmod +x "$USER_PROJECT_DIR"/*.sh 2>/dev/null
        
        cd "$USER_PROJECT_DIR"
        
        osascript << APPLESCRIPT
tell application "Terminal"
    activate
    set newTab to do script "cd '$USER_PROJECT_DIR' && echo -e '${BLUE}Installing dependencies for first run...${NC}' && npm install && echo -e '${GREEN}Setup complete! Starting application...${NC}' && ./start.sh"
end tell
APPLESCRIPT
    else
        osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Error copying project files. Please check permissions and try again." buttons {"OK"} default button "OK"
end tell
APPLESCRIPT
        exit 1
    fi
else
    # Subsequent runs - just launch
    cd "$USER_PROJECT_DIR"
    
    osascript << APPLESCRIPT
tell application "Terminal"
    activate
    set newTab to do script "cd '$USER_PROJECT_DIR' && ./start.sh"
end tell
APPLESCRIPT
fi
LAUNCHER_EOF

chmod +x "${APP_DIR}/Contents/MacOS/launcher"

# Create pre-install script
cat > "$SCRIPTS_DIR/preinstall" << 'PRE_INSTALL_EOF'
#!/bin/bash

# Set up PATH to include common Node.js locations
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Check if Node.js is installed in common locations
NODE_PATHS=(
    "/usr/local/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/bin/node"
    "$(which node 2>/dev/null)"
)

NODE_FOUND=""
for node_path in "${NODE_PATHS[@]}"; do
    if [ -x "$node_path" ]; then
        NODE_FOUND="$node_path"
        break
    fi
done

if [ -z "$NODE_FOUND" ]; then
    osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Node.js is required but not found. Please install Node.js from nodejs.org and run this installer again." buttons {"Open nodejs.org", "Cancel"} default button "Open nodejs.org"
    if button returned of result is "Open nodejs.org" then
        open location "https://nodejs.org"
    end if
end tell
APPLESCRIPT
    exit 1
fi

# Check Node.js version
NODE_VERSION=$($NODE_FOUND -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Node.js version 14 or higher is required. Current version: $($NODE_FOUND -v). Please update Node.js." buttons {"Open nodejs.org", "Continue Anyway"} default button "Continue Anyway"
    if button returned of result is "Open nodejs.org" then
        open location "https://nodejs.org"
        exit 1
    end if
end tell
APPLESCRIPT
fi

echo "Node.js check passed: $($NODE_FOUND -v)"
exit 0
PRE_INSTALL_EOF

# Create post-install script
cat > "$SCRIPTS_DIR/postinstall" << 'POST_INSTALL_EOF'
#!/bin/bash

# Make the app executable
chmod +x "/Applications/MyReactExpressApp.app/Contents/MacOS/launcher"

# Show completion message
osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Installation completed successfully! 

You can now launch MyReactExpressApp from:
• Applications folder
• Spotlight search
• Launchpad

The app will set up your project files on first run." buttons {"Launch Now", "OK"} default button "Launch Now"
    
    if button returned of result is "Launch Now" then
        tell application "MyReactExpressApp" to activate
    end if
end tell
APPLESCRIPT

exit 0
POST_INSTALL_EOF

chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

# Create the package
echo "🔨 Building package..."
pkgbuild --root "$PAYLOAD_DIR" \
         --scripts "$SCRIPTS_DIR" \
         --identifier "$BUNDLE_ID" \
         --version "$VERSION" \
         --install-location "/" \
         "${INSTALLER_NAME}.pkg"

# Clean up
rm -rf "$TEMP_DIR"

if [ -f "${INSTALLER_NAME}.pkg" ]; then
    echo ""
    echo -e "${GREEN}✅ Professional installer created: ${INSTALLER_NAME}.pkg${NC}"
    echo ""
    echo -e "${BLUE}📦 This installer will:${NC}"
    echo -e "${BLUE}   • Check for Node.js requirements${NC}"
    echo -e "${BLUE}   • Install the app to Applications${NC}"
    echo -e "${BLUE}   • Bundle all project files${NC}"
    echo -e "${BLUE}   • Set up project on first run${NC}"
    echo -e "${BLUE}   • Install npm dependencies${NC}"
    echo ""
    echo -e "${YELLOW}📤 Distribute ${INSTALLER_NAME}.pkg to your users${NC}"
else
    echo "❌ Failed to create package"
    exit 1
fi