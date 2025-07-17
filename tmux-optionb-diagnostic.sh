#!/bin/bash

# 🔍 TMUX OPTIONB DIAGNOSTIC SCRIPT
# This script investigates what "optionb" refers to and why it's not working

echo "🔍 TMUX OPTIONB DIAGNOSTIC SCRIPT"
echo "=================================="
echo ""

# Check tmux version and installation
echo "📋 TMUX INSTALLATION INFO:"
echo "Version: $(tmux -V)"
echo "Location: $(which tmux)"
echo "Installed via: $(which tmux | grep -q homebrew && echo 'Homebrew' || echo 'System')"
echo ""

# Check for tmux configuration files
echo "📁 TMUX CONFIGURATION FILES:"
config_files=(
    "$HOME/.tmux.conf"
    "$HOME/.config/tmux/tmux.conf"
    "/etc/tmux.conf"
)

for config in "${config_files[@]}"; do
    if [[ -f "$config" ]]; then
        echo "✅ Found: $config"
        echo "   Size: $(stat -f%z "$config" 2>/dev/null || stat -c%s "$config" 2>/dev/null) bytes"
        echo "   Modified: $(stat -f%Sm "$config" 2>/dev/null || stat -c%y "$config" 2>/dev/null)"
    else
        echo "❌ Not found: $config"
    fi
done
echo ""

# Check for optionb in various contexts
echo "🔍 SEARCHING FOR 'optionb' REFERENCES:"

# Search in shell aliases
echo "Shell aliases containing 'optionb':"
alias | grep -i optionb || echo "  None found"

# Search in shell functions
echo "Shell functions containing 'optionb':"
declare -f | grep -i optionb || echo "  None found"

# Search in tmux commands
echo "Tmux commands containing 'optionb':"
tmux list-commands | grep -i optionb || echo "  None found"

# Search in tmux key bindings
echo "Tmux key bindings containing 'optionb':"
tmux list-keys | grep -i optionb || echo "  None found"
echo ""

# Check what 'b' key does in tmux
echo "🎯 TMUX PREFIX KEY BINDINGS:"
echo "Current prefix key: $(tmux show-options -g prefix | cut -d' ' -f2)"
echo "Key bindings for 'b' after prefix:"
tmux list-keys | grep -E "^[[:space:]]*b[[:space:]]" || echo "  No 'b' binding found"
echo ""

# Check tmux options
echo "🔧 TMUX OPTIONS CHECK:"
echo "All global options:"
tmux show-options -g | head -10
echo "  ... (showing first 10, use 'tmux show-options -g' for all)"
echo ""

# Check for break-pane command (might be what user wants)
echo "🪟 BREAK-PANE FUNCTIONALITY:"
echo "Break-pane command exists: $(tmux list-commands | grep break-pane && echo 'YES' || echo 'NO')"
echo "Default break-pane binding: $(tmux list-keys | grep break-pane || echo 'None found')"
echo ""

# Test tmux functionality
echo "🧪 TMUX FUNCTIONALITY TEST:"
echo "Testing basic tmux commands..."

# Test if tmux server is running
if tmux has-session 2>/dev/null; then
    echo "✅ Tmux server is running"
    echo "Active sessions: $(tmux list-sessions | wc -l)"
else
    echo "❌ No tmux server running"
fi

# Test tmux options system
if tmux show-options -g >/dev/null 2>&1; then
    echo "✅ Tmux options system working"
else
    echo "❌ Tmux options system failed"
fi

echo ""
echo "🎯 LIKELY EXPLANATIONS FOR 'optionb' ISSUE:"
echo "1. 'optionb' might refer to macOS Terminal's Option+B shortcut"
echo "2. User might expect a custom tmux binding that doesn't exist"
echo "3. Confusion with 'break-pane' command (default binding: prefix + !)"
echo "4. Missing tmux configuration file with custom bindings"
echo "5. Typo or misremembered command name"
echo ""

echo "💡 RECOMMENDATIONS:"
echo "1. Check if user meant 'break-pane' (tmux command to break pane into new window)"
echo "2. Create custom tmux binding: bind-key b break-pane"
echo "3. Set up proper tmux configuration with intuitive key bindings"
echo "4. Test with a simple tmux session with split panes"
echo ""

echo "🏁 DIAGNOSTIC COMPLETE - Ready to implement solution!"
