#!/bin/bash
# Convert SVG icons to PNG for Tauri

echo "🎨 Icon Converter for Audio Notifier Config"
echo "=========================================="
echo ""

# Check if conversion tools are available
if command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg-convert"
elif command -v convert &> /dev/null; then
    CONVERTER="imagemagick"
else
    echo "❌ No SVG converter found. Please install one:"
    echo "   brew install librsvg      (recommended)"
    echo "   brew install imagemagick  (alternative)"
    exit 1
fi

echo "Found converter: $CONVERTER"
echo ""

# Show available icons
echo "Available icon designs:"
echo "1. Bell-Burst Hybrid (icon-bell-burst.svg)"
echo "2. Starburst Speaker (icon-speaker-waves.svg)"
echo ""

# Ask user to choose
read -p "Which icon do you want to use? (1 or 2): " choice

case $choice in
    1)
        SOURCE="icon-bell-burst.svg"
        ;;
    2)
        SOURCE="icon-speaker-waves.svg"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔄 Converting $SOURCE to PNG..."
echo ""

# Convert to PNG
if [ "$CONVERTER" = "rsvg-convert" ]; then
    rsvg-convert -w 512 -h 512 "$SOURCE" > icon.png
else
    convert -background none "$SOURCE" -resize 512x512 icon.png
fi

if [ $? -eq 0 ]; then
    echo "✅ Created icon.png (512x512)"

    # Generate other sizes
    echo ""
    echo "📐 Generating additional sizes..."

    if [ "$CONVERTER" = "rsvg-convert" ]; then
        rsvg-convert -w 32 -h 32 "$SOURCE" > 32x32.png
        rsvg-convert -w 128 -h 128 "$SOURCE" > 128x128.png
        rsvg-convert -w 256 -h 256 "$SOURCE" > 128x128@2x.png
    else
        convert -background none "$SOURCE" -resize 32x32 32x32.png
        convert -background none "$SOURCE" -resize 128x128 128x128.png
        convert -background none "$SOURCE" -resize 256x256 128x128@2x.png
    fi

    echo "✅ Created 32x32.png"
    echo "✅ Created 128x128.png"
    echo "✅ Created 128x128@2x.png"
    echo ""
    echo "✅ All icons generated successfully!"
    echo ""
    echo "📦 Now you can build your app:"
    echo "   cd .."
    echo "   npm run tauri:build"
else
    echo "❌ Conversion failed"
    exit 1
fi
