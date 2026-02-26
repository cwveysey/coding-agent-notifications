# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.**

Instead, email cooper@optimizationlabs.io with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

I will respond within 72 hours and work with you on a fix before public disclosure.

## Security Considerations

This project installs scripts to `~/.claude/scripts/` and modifies `~/.config/claude/settings.json`. The scripts:

- Only read Claude Code hook data (stdin JSON)
- Play audio via `afplay` (macOS built-in)
- Show notifications via `terminal-notifier` (bundled)
- Write logs to `~/.claude/`
- Do not make network requests (except the config editor's optional analytics, which is opt-out)

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |
