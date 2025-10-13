#!/bin/bash
# Complete installation script for Audio Notifier Config Editor

echo "🎉 Audio Notifier Config Editor - Installation"
echo "=============================================="
echo ""

# Step 1: Source Cargo environment
echo "📦 Step 1: Loading Cargo environment..."
source "$HOME/.cargo/env"

if command -v cargo &> /dev/null; then
    echo "✅ Cargo loaded successfully: $(cargo --version)"
else
    echo "❌ Cargo not found. Please restart your terminal and try again."
    exit 1
fi
echo ""

# Step 2: Verify Node.js
echo "📦 Step 2: Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ Node.js not found. Installing..."
    brew install node
fi
echo ""

# Step 3: Install npm dependencies
echo "📦 Step 3: Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ npm dependencies installed successfully"
else
    echo "❌ Failed to install npm dependencies"
    exit 1
fi
echo ""

# Step 4: Check for icons
echo "🎨 Step 4: Checking for app icons..."
if [ ! -f "src-tauri/icons/icon.png" ]; then
    echo "⚠️  No app icon found at src-tauri/icons/icon.png"
    echo "   The app will build without icons, but won't look polished."
    echo ""
    echo "   To add icons:"
    echo "   1. Create a 512x512 PNG"
    echo "   2. Save it as src-tauri/icons/icon.png"
    echo "   3. Run: npm run tauri icon src-tauri/icons/icon.png"
    echo ""
else
    echo "✅ App icon found"
fi
echo ""

# Step 5: Offer to run in dev mode
echo "=============================================="
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Run in development mode:"
echo "   npm run tauri:dev"
echo ""
echo "2. Or build for production:"
echo "   npm run tauri:build"
echo ""
echo "Note: First run will take 5-10 minutes to compile Rust dependencies."
echo "      Subsequent runs will be much faster (< 30 seconds)."
echo ""

read -p "Would you like to run in development mode now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting development server..."
    echo "   This may take 5-10 minutes on first run..."
    echo ""
    npm run tauri:dev
fi
