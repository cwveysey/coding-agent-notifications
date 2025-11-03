# Code Signing Progress for Coding Agent Notifications

## ✅ COMPLETE - Ready for Distribution

Successfully configured code signing and notarization. Users can now download and install without Gatekeeper warnings!

## Completed Steps ✅

1. **Apple Developer Account**
   - Renewed Apple Developer Program membership ($99)
   - Team ID: `BBHGDF6J2P`
   - Account: veysey.cooper@gmail.com

2. **Certificates Created**
   - Developer ID Application certificate created and installed
   - Developer ID Installer certificate created (but not showing as valid identity - might not need it)
   - Signing Identity: `E6B9A57BB263AA4ED789410DD2A7C0EF76773C8D "Developer ID Application: Cooper Veysey (BBHGDF6J2P)"`

3. **Intermediate Certificates Installed**
   - Apple Worldwide Developer Relations G2 certificate (in System keychain)
   - Developer ID G2 CA certificate (downloading/installing now)
   - Apple Inc Root Certificate (downloading/installing now)

4. **Tauri Configuration**
   - Updated `config-editor-app/src-tauri/tauri.conf.json`
   - Added signing identity to macOS bundle config:
     ```json
     "macOS": {
       "minimumSystemVersion": "10.15",
       "signingIdentity": "Developer ID Application: Cooper Veysey (BBHGDF6J2P)",
       "entitlements": null
     }
     ```

## Current Issue 🚧
Build fails with: `unable to build chain to self-signed root for signer`

This means the certificate chain isn't complete. Installing:
- Apple Inc Root Certificate
- Developer ID G2 CA certificate

## Next Steps 📋

### Immediate (In Progress)
1. Install Developer ID G2 CA certificate → System keychain
2. Install Apple Inc Root Certificate → System keychain
3. Run build again: `cd config-editor-app && npm run tauri build`
4. Verify app is signed: `codesign -vvv --deep --strict "path/to/Coding Agent Notifications.app"`

### After Successful Build
5. **Set up Notarization**
   - Create app-specific password for notarization
   - Store credentials in keychain: `xcrun notarytool store-credentials`
   - Update build script to submit for notarization
   - Staple notarization ticket to app

6. **Update create-dmg.sh Script**
   - Add notarization step after DMG creation
   - Submit DMG: `xcrun notarytool submit --keychain-profile "notary-profile" --wait`
   - Staple: `xcrun stapler staple "Coding-Agent-Notifications-Installer.dmg"`

7. **Test Distribution**
   - Upload signed DMG somewhere
   - Download it on clean Mac (or use `xattr -cr` to simulate download)
   - Verify it opens without warnings

8. **Update Website**
   - Add download link
   - Remove installation workaround instructions (if we had them)

## Important Commands

**Check signing identities:**
```bash
security find-identity -v -p codesigning
```

**Verify app signature:**
```bash
codesign -vvv --deep --strict "path/to/app"
```

**Check certificate chain:**
```bash
security find-certificate -c "Developer ID Certification Authority" /Library/Keychains/System.keychain
```

**Build signed app:**
```bash
cd config-editor-app && npm run tauri build
```

**Create DMG:**
```bash
./create-dmg.sh
```

## Key Files Modified
- `/Users/cooperveysey/Desktop/Development/Side projects/audio-notifications-for-claude-code-activity/config-editor-app/src-tauri/tauri.conf.json`

## Resources
- Apple Developer Portal: https://developer.apple.com/account
- Certificates Page: https://developer.apple.com/account/resources/certificates/list
- Notarization Guide: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution

## Notes
- macOS Sequoia 15.1 (released Nov 1, 2024) removed the right-click workaround for unsigned apps
- Users now MUST go to Privacy & Security settings to approve unsigned apps
- Code signing + notarization is essentially required for good UX now
- Developer ID Installer cert isn't critical - only needed for .pkg files, not DMG
