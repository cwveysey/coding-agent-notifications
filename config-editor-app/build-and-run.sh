#!/bin/bash
# Build and Run Script for Audio Notifier Config Editor

set -e

echo "🔧 Audio Notifier Config Editor - Build & Run"
echo "=============================================="
echo ""

# Check prerequisites
check_prereqs() {
    echo "📋 Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install: brew install node"
        exit 1
    fi
    echo "✅ Node.js found: $(node --version)"

    if ! command -v cargo &> /dev/null; then
        echo "❌ Rust not found. Please install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    echo "✅ Rust found: $(cargo --version)"

    echo ""
}

# Install dependencies
install_deps() {
    echo "📦 Installing dependencies..."

    if [ ! -d "node_modules" ]; then
        echo "Installing npm packages..."
        npm install
    else
        echo "✅ node_modules already exists"
    fi

    echo ""
}

# Run in dev mode or build
run_or_build() {
    echo "What would you like to do?"
    echo "1) Run in development mode (hot reload)"
    echo "2) Build for production"
    echo ""
    read -p "Enter choice (1 or 2): " choice

    case $choice in
        1)
            echo ""
            echo "🚀 Starting development server..."
            echo "Note: First run may take 5-10 minutes to compile Rust dependencies."
            echo ""
            npm run tauri:dev
            ;;
        2)
            echo ""
            echo "🏗️  Building for production..."
            echo "This may take several minutes..."
            echo ""
            npm run tauri:build

            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Build complete!"
                echo ""
                echo "Your app is located at:"
                echo "src-tauri/target/release/bundle/macos/"
                echo ""
                echo "To install, run:"
                echo "cp -r \"src-tauri/target/release/bundle/macos/Audio Notifier Config.app\" /Applications/"
            fi
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
}

# Main
main() {
    check_prereqs
    install_deps
    run_or_build
}

main
