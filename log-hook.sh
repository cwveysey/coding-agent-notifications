#!/bin/bash
# Log which hook fired
HOOK_NAME="$1"
echo "$(date '+%F %T') - Hook fired: $HOOK_NAME" >> ~/.claude/all-hooks.log
