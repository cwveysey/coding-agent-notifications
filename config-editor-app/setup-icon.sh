#!/bin/bash
# Setup icon from wave-sound.png with rounded corners and transparency

set -e

echo "🎨 Setting up app icon with rounded corners..."

# Check if ImageMagick is available
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    brew install imagemagick
fi

cd src-tauri/icons

# Copy source
cp ../../../wave-sound.png wave-sound-original.png

echo "📐 Creating icon with rounded corners and white background..."

# Create 1024x1024 icon with white background, scaled-down centered icon, and rounded corners
# Corner radius is ~22% of size for modern macOS-like appearance
convert -size 1024x1024 xc:white \
    \( wave-sound-original.png -resize 680x680 \) \
    -gravity center -composite \
    \( +clone -alpha extract \
       -draw 'fill black polygon 0,0 0,225 225,0 fill white circle 225,225 225,0' \
       \( +clone -flip \) -compose Multiply -composite \
       \( +clone -flop \) -compose Multiply -composite \
    \) -alpha off -compose CopyOpacity -composite \
    PNG32:icon.png

rm wave-sound-original.png

echo "📐 Generating icon sizes (RGBA format)..."

# Use ImageMagick to ensure RGBA format for all sizes
convert icon.png -resize 32x32 PNG32:32x32.png
convert icon.png -resize 128x128 PNG32:128x128.png
convert icon.png -resize 256x256 PNG32:128x128@2x.png

echo "🔨 Creating .icns file for macOS..."

# Generate .icns for macOS
mkdir -p icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
rm -rf icon.iconset

# Windows placeholder
cp icon.png icon.ico

cd ../..

echo "✅ Icon setup complete!"
echo ""
echo "Preview the icon:"
echo "  open src-tauri/icons/icon.png"
echo ""
echo "Ready to build: npm run tauri:dev"
