# App Icons

This directory should contain the application icons in various formats.

## Required Icons

For macOS builds, you need:
- `icon.icns` - macOS icon bundle
- `icon.png` - 512x512 PNG source image
- `32x32.png` - 32x32 PNG
- `128x128.png` - 128x128 PNG
- `128x128@2x.png` - 256x256 PNG (retina)

## Quick Setup

### Option 1: Auto-generate from PNG

1. Create a 512x512 PNG icon (or use any square PNG)
2. Save it as `icon.png` in this directory
3. Run the Tauri icon command:
   ```bash
   npm run tauri icon icon.png
   ```

This will auto-generate all required sizes and formats.

### Option 2: Manual Creation

Use an icon editor to create the `.icns` file and all PNG sizes manually.

### Option 3: Use Placeholder (Development Only)

For development, you can use any PNG as a placeholder. The build will work without proper icons, but the app won't look polished.

## Design Suggestions

Consider using:
- A bell icon (🔔) to match the notification theme
- A combined bell + "C" for Claude
- Purple/blue gradient to match Claude Code branding
- Simple, clear design that works at small sizes (16x16)

## Icon Resources

- [SF Symbols](https://developer.apple.com/sf-symbols/) - Free macOS icons
- [Iconify](https://iconify.design/) - Open source icon sets
- [Figma](https://figma.com) - Design custom icons
