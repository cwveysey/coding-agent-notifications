import Cocoa
import AppKit

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    let soundsFlagPath = NSString(string: "~/.claude/.sounds-enabled").expandingTildeInPath
    let configPath = NSString(string: "~/.claude/audio-notifier.yaml").expandingTildeInPath

    let systemSounds = [
        "Ping": "/System/Library/Sounds/Ping.aiff",
        "Glass": "/System/Library/Sounds/Glass.aiff",
        "Hero": "/System/Library/Sounds/Hero.aiff",
        "Submarine": "/System/Library/Sounds/Submarine.aiff",
        "Tink": "/System/Library/Sounds/Tink.aiff",
        "Pop": "/System/Library/Sounds/Pop.aiff",
        "Funk": "/System/Library/Sounds/Funk.aiff",
        "Purr": "/System/Library/Sounds/Purr.aiff",
        "Blow": "/System/Library/Sounds/Blow.aiff",
        "Bottle": "/System/Library/Sounds/Bottle.aiff",
        "Frog": "/System/Library/Sounds/Frog.aiff",
        "Basso": "/System/Library/Sounds/Basso.aiff"
    ]

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create status bar item
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        // Set up custom icon
        if let button = statusItem.button {
            button.image = createCustomIcon()
            button.image?.isTemplate = true // Makes it adapt to light/dark mode
        }

        createMenu()
        startWatchingFile()
    }

    func createCustomIcon() -> NSImage {
        // Create a custom icon combining Claude (C) + Bell
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size)

        image.lockFocus()

        // Use white color for the icon
        NSColor.white.setStroke()
        NSColor.white.setFill()

        if soundsEnabled() {
            // Draw a bell shape when enabled
            let bellPath = NSBezierPath()
            bellPath.move(to: NSPoint(x: 9, y: 15))
            bellPath.curve(to: NSPoint(x: 5, y: 8),
                          controlPoint1: NSPoint(x: 6, y: 14),
                          controlPoint2: NSPoint(x: 5, y: 11))
            bellPath.curve(to: NSPoint(x: 9, y: 3),
                          controlPoint1: NSPoint(x: 5, y: 5),
                          controlPoint2: NSPoint(x: 7, y: 3))
            bellPath.curve(to: NSPoint(x: 13, y: 8),
                          controlPoint1: NSPoint(x: 11, y: 3),
                          controlPoint2: NSPoint(x: 13, y: 5))
            bellPath.curve(to: NSPoint(x: 9, y: 15),
                          controlPoint1: NSPoint(x: 13, y: 11),
                          controlPoint2: NSPoint(x: 12, y: 14))
            bellPath.close()
            bellPath.lineWidth = 1.5
            bellPath.stroke()

            // Bell clapper
            let clapperPath = NSBezierPath()
            clapperPath.move(to: NSPoint(x: 9, y: 15))
            clapperPath.line(to: NSPoint(x: 9, y: 16))
            clapperPath.lineWidth = 1.5
            clapperPath.stroke()

            // Small "C" for Claude
            let font = NSFont.systemFont(ofSize: 8, weight: .bold)
            let attrs: [NSAttributedString.Key: Any] = [
                .font: font,
                .foregroundColor: NSColor.white
            ]
            let text = "C"
            let textSize = text.size(withAttributes: attrs)
            let textRect = NSRect(x: 13, y: 1, width: textSize.width, height: textSize.height)
            text.draw(in: textRect, withAttributes: attrs)
        } else {
            // Draw bell with slash when disabled
            let bellPath = NSBezierPath()
            bellPath.move(to: NSPoint(x: 9, y: 15))
            bellPath.curve(to: NSPoint(x: 5, y: 8),
                          controlPoint1: NSPoint(x: 6, y: 14),
                          controlPoint2: NSPoint(x: 5, y: 11))
            bellPath.curve(to: NSPoint(x: 9, y: 3),
                          controlPoint1: NSPoint(x: 5, y: 5),
                          controlPoint2: NSPoint(x: 7, y: 3))
            bellPath.curve(to: NSPoint(x: 13, y: 8),
                          controlPoint1: NSPoint(x: 11, y: 3),
                          controlPoint2: NSPoint(x: 13, y: 5))
            bellPath.curve(to: NSPoint(x: 9, y: 15),
                          controlPoint1: NSPoint(x: 13, y: 11),
                          controlPoint2: NSPoint(x: 12, y: 14))
            bellPath.close()
            bellPath.lineWidth = 1.5
            bellPath.stroke()

            // Slash
            let slashPath = NSBezierPath()
            slashPath.move(to: NSPoint(x: 3, y: 16))
            slashPath.line(to: NSPoint(x: 15, y: 2))
            slashPath.lineWidth = 2
            slashPath.stroke()
        }

        image.unlockFocus()
        return image
    }

    func createMenu() {
        let menu = NSMenu()

        // Header
        let headerItem = NSMenuItem(title: "Claude Code audio notifications", action: nil, keyEquivalent: "")
        headerItem.isEnabled = false
        menu.addItem(headerItem)

        menu.addItem(NSMenuItem.separator())

        // Master toggle with status
        let statusText = soundsEnabled() ? "Enabled" : "Disabled"
        let toggleItem = NSMenuItem(title: statusText, action: #selector(toggleSounds), keyEquivalent: "t")
        toggleItem.state = soundsEnabled() ? .on : .off
        toggleItem.toolTip = "Enable or disable audio notifications for Claude Code. When disabled, no sounds will play."
        menu.addItem(toggleItem)

        menu.addItem(NSMenuItem.separator())

        // Event Sounds submenu
        let eventSoundsMenu = NSMenu()

        // Permission sound
        let permissionMenu = createSoundSelectionMenu(eventType: "permission", currentSound: getCurrentEventSound("permission"))
        let permissionItem = NSMenuItem(title: "Permission sound", action: nil, keyEquivalent: "")
        permissionItem.submenu = permissionMenu
        permissionItem.toolTip = "Sound played when Claude needs your permission to run a command."
        eventSoundsMenu.addItem(permissionItem)

        // Stop sound
        let stopMenu = createSoundSelectionMenu(eventType: "stop", currentSound: getCurrentEventSound("stop"))
        let stopItem = NSMenuItem(title: "Response complete sound", action: nil, keyEquivalent: "")
        stopItem.submenu = stopMenu
        stopItem.toolTip = "Sound played when Claude finishes responding and is ready for your input."
        eventSoundsMenu.addItem(stopItem)

        let eventSoundsItem = NSMenuItem(title: "Event sounds", action: nil, keyEquivalent: "")
        eventSoundsItem.submenu = eventSoundsMenu
        eventSoundsItem.toolTip = "Configure which sounds play for different notification events."
        menu.addItem(eventSoundsItem)

        menu.addItem(NSMenuItem.separator())

        // Advanced config
        let configItem = NSMenuItem(title: "Open config file...", action: #selector(openConfig), keyEquivalent: "c")
        configItem.toolTip = "Open the audio-notifier.yaml configuration file to customize advanced settings."
        menu.addItem(configItem)

        // View logs
        let debugLogItem = NSMenuItem(title: "View debug log...", action: #selector(openDebugLog), keyEquivalent: "l")
        debugLogItem.toolTip = "View the debug log file to troubleshoot notification issues."
        menu.addItem(debugLogItem)

        menu.addItem(NSMenuItem.separator())

        // Quit
        let quitItem = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quitItem.toolTip = "Quit the Claude Code audio notifications menu bar app."
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    func createSoundSelectionMenu(eventType: String, currentSound: String?) -> NSMenu {
        let menu = NSMenu()

        for (name, path) in systemSounds.sorted(by: { $0.key < $1.key }) {
            let item = NSMenuItem(title: name, action: #selector(soundSelected(_:)), keyEquivalent: "")
            item.representedObject = ["event": eventType, "sound": path, "name": name]
            item.toolTip = "Click to select this sound and preview it."

            // Check if this is the current sound
            if let current = currentSound, current.contains(name) {
                item.state = .on
            }

            menu.addItem(item)
        }

        return menu
    }

    @objc func soundSelected(_ sender: NSMenuItem) {
        guard let info = sender.representedObject as? [String: String],
              let eventType = info["event"],
              let soundPath = info["sound"],
              let soundName = info["name"] else { return }

        updateEventSound(eventType: eventType, soundPath: soundPath)

        // Play the selected sound as preview
        NSSound(contentsOfFile: soundPath, byReference: true)?.play()

        // Refresh menu to show new selection
        createMenu()
    }

    func getCurrentEventSound(_ eventType: String) -> String? {
        guard let config = try? String(contentsOfFile: configPath) else { return nil }

        let lines = config.components(separatedBy: .newlines)
        var inEventSounds = false

        for line in lines {
            if line.contains("event_sounds:") {
                inEventSounds = true
                continue
            }

            if inEventSounds && line.trimmingCharacters(in: .whitespaces).isEmpty {
                inEventSounds = false
            }

            if inEventSounds && line.contains("\(eventType):") {
                let components = line.components(separatedBy: ":")
                if components.count >= 2 {
                    let soundPath = components[1].trimmingCharacters(in: .whitespaces)
                        .components(separatedBy: "#")[0]
                        .trimmingCharacters(in: .whitespaces)
                    return soundPath
                }
            }
        }

        return nil
    }

    func updateEventSound(eventType: String, soundPath: String) {
        guard var config = try? String(contentsOfFile: configPath) else { return }

        let lines = config.components(separatedBy: .newlines)
        var newLines: [String] = []
        var inEventSounds = false
        var updated = false

        for line in lines {
            if line.contains("event_sounds:") {
                inEventSounds = true
                newLines.append(line)
                continue
            }

            if inEventSounds && line.trimmingCharacters(in: .whitespaces).hasPrefix("min_interval:") {
                inEventSounds = false
            }

            if inEventSounds && line.contains("\(eventType):") {
                // Replace this line with new sound
                let indent = String(line.prefix(while: { $0.isWhitespace }))
                let comment = line.components(separatedBy: "#").dropFirst().joined(separator: "#")
                let newLine = "\(indent)\(eventType): \(soundPath)" + (comment.isEmpty ? "" : "      # \(comment)")
                newLines.append(newLine)
                updated = true
                continue
            }

            newLines.append(line)
        }

        if updated {
            try? newLines.joined(separator: "\n").write(toFile: configPath, atomically: true, encoding: .utf8)
        }
    }

    func soundsEnabled() -> Bool {
        return FileManager.default.fileExists(atPath: soundsFlagPath)
    }

    @objc func toggleSounds() {
        if soundsEnabled() {
            try? FileManager.default.removeItem(atPath: soundsFlagPath)
        } else {
            FileManager.default.createFile(atPath: soundsFlagPath, contents: nil)
        }

        // Update icon and menu
        if let button = statusItem.button {
            button.image = createCustomIcon()
        }
        createMenu()
    }

    @objc func openConfig() {
        let configURL = URL(fileURLWithPath: configPath)
        NSWorkspace.shared.open(configURL)
    }

    @objc func openDebugLog() {
        let logPath = NSString(string: "~/.claude/smart-notify-debug.log").expandingTildeInPath
        let logURL = URL(fileURLWithPath: logPath)
        NSWorkspace.shared.open(logURL)
    }

    @objc func quit() {
        NSApplication.shared.terminate(self)
    }

    func startWatchingFile() {
        // Check file status every 2 seconds to update the icon
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            if let button = self.statusItem.button {
                button.image = self.createCustomIcon()
            }
        }
    }
}

// Main entry point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory) // Don't show in Dock
app.run()
