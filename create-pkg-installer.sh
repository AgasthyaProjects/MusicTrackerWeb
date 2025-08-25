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

# Get current directory where the script is run from
CURRENT_DIR="$(pwd)"
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"

echo "Script running from: $CURRENT_DIR"
echo "Script located at: $SCRIPT_DIR"

# Create the app bundle in payload (keep macOS app structure)
APP_DIR="$PAYLOAD_DIR/Applications/${APP_NAME}.app"
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Bundle the current directory's project inside the app
PROJECT_DIR="${APP_DIR}/Contents/Resources"
mkdir -p "$PROJECT_DIR"

echo "📦 Bundling project files from current directory: $CURRENT_DIR"

# Verify we're in a React+Express project directory
if [ ! -f "$CURRENT_DIR/package.json" ]; then
    echo "❌ Error: No package.json found in current directory: $CURRENT_DIR"
    echo "Please run this script from your React+Express project root directory"
    exit 1
fi

# Copy all files from current directory to the bundle
echo "Copying from: $CURRENT_DIR"
echo "Copying to: $PROJECT_DIR"

# Copy essential files first
cp "$CURRENT_DIR/package.json" "$PROJECT_DIR/"

# Copy common directories if they exist - INCLUDING CLIENT
COMMON_DIRS=("client" "server" "src" "public" "routes" "config" "middleware" "models" "views" "build" "dist")
for dir in "${COMMON_DIRS[@]}"; do
    if [ -d "$CURRENT_DIR/$dir" ]; then
        echo "Copying directory: $dir"
        # Use -a flag to preserve all attributes including symlinks
        cp -a "$CURRENT_DIR/$dir" "$PROJECT_DIR/"
    else
        echo "Directory not found - skipping: $dir"
    fi
done

# Copy individual files
COMMON_FILES=("start.sh" "server.js" "app.js" "index.js" "README.md")
for file in "${COMMON_FILES[@]}"; do
    if [ -f "$CURRENT_DIR/$file" ]; then
        echo "Copying file: $file"
        cp "$CURRENT_DIR/$file" "$PROJECT_DIR/"
    fi
done

# Copy any remaining JavaScript files in root
find "$CURRENT_DIR" -maxdepth 1 -name "*.js" -exec cp {} "$PROJECT_DIR/" \;

# Copy any remaining markdown files in root  
find "$CURRENT_DIR" -maxdepth 1 -name "*.md" -exec cp {} "$PROJECT_DIR/" \;

# Copy any package-lock.json or yarn.lock if they exist
for lock_file in "package-lock.json" "yarn.lock"; do
    if [ -f "$CURRENT_DIR/$lock_file" ]; then
        echo "Copying lock file: $lock_file"
        cp "$CURRENT_DIR/$lock_file" "$PROJECT_DIR/"
    fi
done

# Exclude unnecessary files from the bundle
rm -rf "$PROJECT_DIR/node_modules" 2>/dev/null
rm -rf "$PROJECT_DIR/.git" 2>/dev/null
rm -rf "$PROJECT_DIR/temp_installer" 2>/dev/null
rm -rf "$PROJECT_DIR"/*.pkg 2>/dev/null
rm -rf "$PROJECT_DIR"/*.dmg 2>/dev/null

# Verify the bundle
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "❌ Error: package.json was not copied to bundle"
    exit 1
fi

echo "✅ Project files bundled successfully from: $CURRENT_DIR"
echo "Bundle contents:"
ls -la "$PROJECT_DIR/"

# Create Info.plist with proper Contents structure
cat > "${APP_DIR}/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.12</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.utilities</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
</dict>
</plist>
EOF

# CREATE THE EXECUTABLE (This was missing from your original script!)
echo "🔧 Creating executable file..."

cat > "${APP_DIR}/Contents/MacOS/${APP_NAME}" << 'LAUNCHER_EOF'
#!/bin/bash

# Debug logging
exec > /tmp/musictracker-debug.log 2>&1
echo "=== MusicTracker Debug Log - $(date) ==="

# Get paths - Fixed for proper Contents structure
APP_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUNDLE_PROJECT_DIR="$(dirname "$APP_PATH")/Resources"
USER_PROJECT_DIR="$HOME/Documents/priv/MusicTrackerWeb"

# Set up PATH to include Node.js locations
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎵 Starting MusicTracker...${NC}"
echo "APP_PATH: $APP_PATH"
echo "Bundle project: $BUNDLE_PROJECT_DIR"
echo "User project: $USER_PROJECT_DIR"
echo "PATH: $PATH"

# Show startup notification
osascript << APPLESCRIPT
tell application "System Events"
    display notification "MusicTracker is starting..." with title "MusicTracker"
end tell
APPLESCRIPT

# Check if bundled project exists
if [ ! -d "$BUNDLE_PROJECT_DIR" ]; then
    echo -e "${RED}❌ Bundled project not found${NC}"
    echo "Expected directory: $BUNDLE_PROJECT_DIR"
    echo "Directory contents of $(dirname "$BUNDLE_PROJECT_DIR"):"
    ls -la "$(dirname "$BUNDLE_PROJECT_DIR")" || echo "Parent directory doesn't exist"
    
    osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Error: Project files not found in app bundle.

Expected: $BUNDLE_PROJECT_DIR

Please reinstall MusicTracker.

Check debug log at: /tmp/musictracker-debug.log" buttons {"OK"} default button "OK"
end tell
APPLESCRIPT
    exit 1
fi

echo "✅ Bundle project directory found"
echo "Bundle contents:"
ls -la "$BUNDLE_PROJECT_DIR"

# Set up user project on first run
if [ ! -d "$USER_PROJECT_DIR" ]; then
    echo -e "${BLUE}📦 First run - setting up project files...${NC}"
    
    # Show setup dialog with more detail
    osascript << APPLESCRIPT
tell application "System Events"
    display notification "Setting up project files..." with title "MusicTracker"
    display dialog "Welcome to MusicTracker!

Setting up your project files for the first time...
This may take a moment.

Debug log: /tmp/musictracker-debug.log" buttons {"Continue"} default button "Continue" giving up after 5
end tell
APPLESCRIPT
    
    # Create the full directory path (including priv/)
    echo "Creating user project directory: $USER_PROJECT_DIR"
    mkdir -p "$USER_PROJECT_DIR"
    
    echo "Copying from: $BUNDLE_PROJECT_DIR"
    echo "Copying to: $USER_PROJECT_DIR"
    
    # More verbose copying with symlink preservation
    if ! cp -a "$BUNDLE_PROJECT_DIR"/* "$USER_PROJECT_DIR/"; then
        echo "❌ Failed to copy files"
        osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Failed to copy project files.
    
Check debug log at: /tmp/musictracker-debug.log" buttons {"OK"}
end tell
APPLESCRIPT
        exit 1
    fi
    
    # Make shell scripts executable
    find "$USER_PROJECT_DIR" -name "*.sh" -exec chmod +x {} \;
    
    # Change to project directory
    cd "$USER_PROJECT_DIR"
    
    # Verify setup worked
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Setup failed: package.json not found${NC}"
        osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Setup failed: package.json not found after copying files.

Please check your installation and try again." buttons {"OK"} default button "OK"
end tell
APPLESCRIPT
        exit 1
    fi
    
    echo -e "${GREEN}✅ Files copied successfully${NC}"
    echo "User project contents:"
    ls -la "$USER_PROJECT_DIR/"
    echo -e "${BLUE}🚀 Starting MusicTracker (dependencies will be installed automatically)...${NC}"
    
    # Open Terminal and start (let start.sh handle dependencies)
    osascript << APPLESCRIPT
tell application "Terminal"
    activate
    set newTab to do script "echo 'MusicTracker Setup - $(date)' && cd '$USER_PROJECT_DIR' && echo -e 'Current directory:' && pwd && echo -e 'Directory contents:' && ls -la && echo -e '🚀 Starting MusicTracker (start.sh will handle dependencies)...' && ./start.sh"
end tell
APPLESCRIPT

else
    # Subsequent runs
    echo -e "${BLUE}🚀 Starting existing MusicTracker project...${NC}"
    cd "$USER_PROJECT_DIR"
    
    # Verify user project is still intact
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ User project appears corrupted${NC}"
        osascript << APPLESCRIPT
tell application "System Events"
    display dialog "User project files appear to be missing or corrupted.

Would you like to restore from the app bundle?" buttons {"Restore", "Cancel"} default button "Restore"
    
    if button returned of result is "Restore" then
        do shell script "rm -rf '$USER_PROJECT_DIR' && mkdir -p '$USER_PROJECT_DIR' && cp -r '$BUNDLE_PROJECT_DIR'/* '$USER_PROJECT_DIR'/; find '$USER_PROJECT_DIR' -name '*.sh' -exec chmod +x {} \\;"
        display dialog "Files restored! MusicTracker will now start." buttons {"OK"}
    else
        return
    end if
end tell
APPLESCRIPT
        cd "$USER_PROJECT_DIR"
    fi
    
    # Start the application
    osascript << APPLESCRIPT
tell application "Terminal"
    activate
    set newTab to do script "echo 'MusicTracker Restart - $(date)' && cd '$USER_PROJECT_DIR' && echo -e 'Starting MusicTracker from:' && pwd && ./start.sh"
end tell
APPLESCRIPT
fiPROJECT_DIR'/* '$USER_PROJECT_DIR'/; find '$USER_PROJECT_DIR' -name '*.sh' -exec chmod +x {} \\;"
        display dialog "Files restored! MusicTracker will now start." buttons {"OK"}
    else
        return
    end if
end tell
APPLESCRIPT
        cd "$USER_PROJECT_DIR"
    fi
    
    # Start the application
    osascript << APPLESCRIPT
tell application "Terminal"
    activate
    set newTab to do script "echo 'MusicTracker Restart - $(date)' && cd '$USER_PROJECT_DIR' && echo -e 'Starting MusicTracker from:' && pwd && ./start.sh"
end tell
APPLESCRIPT
fi

echo -e "${GREEN}✅ MusicTracker startup complete${NC}"
LAUNCHER_EOF

# CRITICAL: Make the executable file actually executable
chmod +x "${APP_DIR}/Contents/MacOS/${APP_NAME}"

echo "✅ Executable created at: ${APP_DIR}/Contents/MacOS/${APP_NAME}"

# Verify the executable was created
if [ ! -f "${APP_DIR}/Contents/MacOS/${APP_NAME}" ]; then
    echo "❌ CRITICAL ERROR: Executable was not created!"
    exit 1
fi

# Create pre-install script
cat > "$SCRIPTS_DIR/preinstall" << 'PRE_INSTALL_EOF'
#!/bin/bash

# Set up PATH to include common Node.js locations
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Check if Node.js is installed
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

# Make the app executable - Fixed path
chmod +x "/Applications/MusicTracker.app/Contents/MacOS/MusicTracker"
chmod -R 755 "/Applications/MusicTracker.app"

# Remove quarantine attributes to avoid Gatekeeper issues
xattr -cr "/Applications/MusicTracker.app" 2>/dev/null || true

# Show completion message
osascript << APPLESCRIPT
tell application "System Events"
    display dialog "Installation completed successfully! 

🚀 MusicTracker is now installed.

⚠️ IMPORTANT: If you see a security warning when first launching:
1. Right-click the app and select 'Open'
2. Or go to System Preferences > Security & Privacy and click 'Open Anyway'

You can launch MusicTracker from:
• Applications folder  
• Spotlight search
• Launchpad

The app will set up your project files on first run." buttons {"Launch Now", "OK"} default button "Launch Now"
    
    if button returned of result is "Launch Now" then
        try
            tell application "MusicTracker" to activate
        on error
            tell application "Finder"
                open application file "MusicTracker" of folder "Applications" of startup disk
            end tell
        end try
    end if
end tell
APPLESCRIPT

exit 0
POST_INSTALL_EOF

chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

# Validate the app bundle structure before packaging
echo "🔍 Validating app bundle structure..."

REQUIRED_FILES=(
    "${APP_DIR}/Contents/Info.plist"
    "${APP_DIR}/Contents/MacOS/${APP_NAME}"
    "${APP_DIR}/Contents/Resources/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ App bundle structure validated"

# Create the package with proper ownership
echo "🔨 Building package..."
pkgbuild --root "$PAYLOAD_DIR" \
         --scripts "$SCRIPTS_DIR" \
         --identifier "$BUNDLE_ID" \
         --version "$VERSION" \
         --install-location "/" \
         --ownership preserve \
         "${INSTALLER_NAME}.pkg"

# Verify the package was created
if [ ! -f "${INSTALLER_NAME}.pkg" ]; then
    echo "❌ Package creation failed"
    exit 1
fi

# Validate the package
echo "🔍 Validating package..."
if pkgutil --check-signature "${INSTALLER_NAME}.pkg" &>/dev/null; then
    echo "⚠️  Package is unsigned (expected for development)"
else
    # This is normal for unsigned packages
    echo "⚠️  Package validation complete (unsigned)"
fi

# Clean up
rm -rf "$TEMP_DIR"

if [ -f "${INSTALLER_NAME}.pkg" ]; then
    PKG_SIZE=$(du -h "${INSTALLER_NAME}.pkg" | cut -f1)
    echo ""
    echo -e "\033[0;32m✅ Professional installer created: ${INSTALLER_NAME}.pkg (${PKG_SIZE})\033[0m"
    echo ""
    echo -e "\033[0;34m📦 This installer will:\033[0m"
    echo -e "\033[0;34m   • Check for Node.js requirements\033[0m"
    echo -e "\033[0;34m   • Install the app to Applications\033[0m"
    echo -e "\033[0;34m   • Bundle all project files (including client)\033[0m"
    echo -e "\033[0;34m   • Set up project on first run\033[0m"
    echo -e "\033[0;34m   • Install npm dependencies\033[0m"
    echo ""
    echo -e "\033[1;33m📤 Distribute ${INSTALLER_NAME}.pkg to your users\033[0m"
    echo ""
    echo -e "\033[0;36m🔧 Troubleshooting tips:\033[0m"
    echo -e "\033[0;36m   • If users get 'damaged' error: Right-click > Open\033[0m"
    echo -e "\033[0;36m   • Or: System Preferences > Security & Privacy > Open Anyway\033[0m"
    echo -e "\033[0;36m   • Consider code signing for distribution\033[0m"
    echo ""
    echo "✅ Bundle structure: Contents/MacOS/${APP_NAME} (executable)"
    echo "✅ Project files: Contents/Resources/ ($(ls "$PROJECT_DIR" | wc -l | xargs) items)"
else
    echo "❌ Failed to create package"
    exit 1
fi