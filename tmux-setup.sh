#!/bin/bash

# 🖥️ Optimal Tmux Setup for Claude Code Flow
# This script creates the optimal tmux environment for running claude-code

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_SESSION_NAME="claude-code-dev"
TMUX_CONFIG_DIR="$HOME/.config/tmux"
TMUX_CONFIG_FILE="$TMUX_CONFIG_DIR/tmux.conf"
CLAUDE_FLOW_DIR="$(pwd)"

echo -e "${BLUE}🖥️ Claude Code Flow - Optimal Tmux Setup${NC}"
echo -e "${BLUE}===========================================${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ Error: tmux is not installed${NC}"
    echo -e "${YELLOW}💡 Installing tmux...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install tmux
        else
            echo -e "${RED}❌ Homebrew not found. Please install tmux manually:${NC}"
            echo -e "${YELLOW}   brew install tmux${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y tmux
        elif command -v yum &> /dev/null; then
            sudo yum install -y tmux
        else
            echo -e "${RED}❌ Please install tmux manually${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS. Please install tmux manually${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Tmux version: $(tmux -V)${NC}"

# Create tmux config directory
mkdir -p "$TMUX_CONFIG_DIR"

# Create optimized tmux configuration
cat > "$TMUX_CONFIG_FILE" << 'EOF'
# 🖥️ Claude Code Flow - Optimized Tmux Configuration
# =================================================

# Set prefix key to Ctrl-a (more ergonomic than Ctrl-b)
set -g prefix C-a
unbind C-b
bind-key C-a send-prefix

# Enable mouse support
set -g mouse on

# Set default terminal
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",*256col*:Tc"

# Set escape time to 0 for faster response
set -sg escape-time 0

# Set base index to 1 (instead of 0)
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows automatically
set -g renumber-windows on

# History limit
set -g history-limit 50000

# Activity monitoring
setw -g monitor-activity on
set -g visual-activity on

# 🎨 Colors and Status Bar
# ======================

# Status bar colors
set -g status-style bg=colour24,fg=white
set -g status-left-length 30
set -g status-right-length 150

# Status bar content
set -g status-left '#[bg=colour24,fg=white,bold] 🖥️ Claude Code '
set -g status-right '#[bg=colour24,fg=white] 🕐 %H:%M:%S #[bg=colour24,fg=white,bold] 📅 %Y-%m-%d '

# Window status
setw -g window-status-format ' #I:#W '
setw -g window-status-current-format '#[bg=colour39,fg=black,bold] #I:#W '

# Pane borders
set -g pane-border-style fg=colour240
set -g pane-active-border-style fg=colour39

# Message colors
set -g message-style bg=colour39,fg=black,bold

# 🔑 Key Bindings
# ==============

# Split panes (more intuitive)
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# Pane navigation (vim-style)
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Pane resizing
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# Window navigation
bind -n M-Left previous-window
bind -n M-Right next-window

# Break pane (the "optionb" equivalent)
bind b break-pane -d
bind B break-pane

# Join pane
bind j command-prompt -p "join pane from:"  "join-pane -s '%%'"

# Reload config
bind r source-file ~/.config/tmux/tmux.conf \; display "Config reloaded!"

# Clear screen and history
bind C-l send-keys 'C-l'
bind C-k send-keys 'C-k'

# 🎯 Copy Mode (Vi-style)
# ======================

setw -g mode-keys vi
bind-key -T copy-mode-vi 'v' send -X begin-selection
bind-key -T copy-mode-vi 'y' send -X copy-selection-and-cancel

# 🚀 Session Management
# ====================

# Quick session switching
bind s choose-session
bind w choose-window
bind p choose-tree

# Session creation with name
bind N command-prompt -p "Session name:" "new-session -s '%%'"

# Kill session
bind X confirm-before -p "Kill session? (y/n)" kill-session

# 🔧 Development Helpers
# =====================

# Quick commands for development
bind-key D send-keys 'cd "#{pane_current_path}" && clear' Enter
bind-key G send-keys 'git status' Enter
bind-key T send-keys 'npm test' Enter
bind-key S send-keys 'npm start' Enter
bind-key I send-keys 'npm install' Enter

# Claude Flow specific bindings
bind-key C-f send-keys 'npx claude-flow ' 
bind-key C-w send-keys 'npx claude-flow work "' 
bind-key C-s send-keys 'npx claude-flow sparc "' 
bind-key C-h send-keys 'npx claude-flow hive "' 

# 📊 Logging and Monitoring
# ========================

# Enable pane titles
set -g pane-title-format "#{pane_current_command}"
set -g set-titles on
set -g set-titles-string "#T"

# Bell settings
set -g bell-action any
set -g visual-bell off

# 🔄 Auto-restore session
# ======================

# Plugin management (if you want to use plugins)
# set -g @plugin 'tmux-plugins/tpm'
# set -g @plugin 'tmux-plugins/tmux-sensible'
# set -g @plugin 'tmux-plugins/tmux-resurrect'
# set -g @plugin 'tmux-plugins/tmux-continuum'

# Initialize TMUX plugin manager (keep this line at the very bottom)
# run '~/.tmux/plugins/tpm/tpm'
EOF

echo -e "${GREEN}✅ Created tmux configuration: $TMUX_CONFIG_FILE${NC}"

# Create session starter script
cat > "$CLAUDE_FLOW_DIR/start-tmux-session.sh" << 'EOF'
#!/bin/bash

# 🚀 Claude Code Flow - Session Starter
# ====================================

SESSION_NAME="${1:-claude-code-dev}"
PROJECT_DIR="$(pwd)"

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create new session
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR"

# Window 1: Main Development
tmux rename-window -t "$SESSION_NAME:1" "main"
tmux send-keys -t "$SESSION_NAME:main" "clear" Enter

# Window 2: Claude Flow Commands
tmux new-window -t "$SESSION_NAME" -n "claude-flow" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION_NAME:claude-flow" "echo '🖥️ Claude Flow Command Center'" Enter
tmux send-keys -t "$SESSION_NAME:claude-flow" "echo 'Quick commands:'" Enter
tmux send-keys -t "$SESSION_NAME:claude-flow" "echo '  npx claude-flow work \"task description\"'" Enter
tmux send-keys -t "$SESSION_NAME:claude-flow" "echo '  npx claude-flow sparc \"mode\"'" Enter
tmux send-keys -t "$SESSION_NAME:claude-flow" "echo '  npx claude-flow hive \"task\"'" Enter

# Window 3: Monitoring (split panes)
tmux new-window -t "$SESSION_NAME" -n "monitor" -c "$PROJECT_DIR"
tmux split-window -t "$SESSION_NAME:monitor" -h -c "$PROJECT_DIR"
tmux split-window -t "$SESSION_NAME:monitor" -v -c "$PROJECT_DIR"

# Top-left: System monitoring
tmux send-keys -t "$SESSION_NAME:monitor.0" "echo '📊 System Monitor'" Enter
tmux send-keys -t "$SESSION_NAME:monitor.0" "htop || top" Enter

# Top-right: Log monitoring
tmux send-keys -t "$SESSION_NAME:monitor.1" "echo '📄 Log Monitor'" Enter
tmux send-keys -t "$SESSION_NAME:monitor.1" "echo 'Watching for logs...'" Enter

# Bottom: Git status
tmux send-keys -t "$SESSION_NAME:monitor.2" "echo '🔄 Git Status'" Enter
tmux send-keys -t "$SESSION_NAME:monitor.2" "git status" Enter

# Window 4: Testing
tmux new-window -t "$SESSION_NAME" -n "test" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION_NAME:test" "echo '🧪 Test Environment'" Enter

# Go back to main window
tmux select-window -t "$SESSION_NAME:main"

# Attach to session
tmux attach-session -t "$SESSION_NAME"
EOF

chmod +x "$CLAUDE_FLOW_DIR/start-tmux-session.sh"

echo -e "${GREEN}✅ Created session starter: $CLAUDE_FLOW_DIR/start-tmux-session.sh${NC}"

# Create development layout script
cat > "$CLAUDE_FLOW_DIR/tmux-dev-layout.sh" << 'EOF'
#!/bin/bash

# 🎯 Claude Code Flow - Development Layout
# =======================================

SESSION_NAME="${1:-claude-code-dev}"
PROJECT_DIR="$(pwd)"

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create new session with development layout
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR"

# Main window split into 3 panes
tmux split-window -h -c "$PROJECT_DIR"
tmux split-window -v -c "$PROJECT_DIR"

# Layout:
# ┌─────────────────────┬──────────────────┐
# │                     │                  │
# │   Main Development  │   Command Runner │
# │                     │                  │
# │                     ├──────────────────┤
# │                     │                  │
# │                     │   Log Monitor    │
# │                     │                  │
# └─────────────────────┴──────────────────┘

# Pane 0 (left): Main development
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🖥️ Claude Code Flow - Main Development'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Ready for development...'" Enter

# Pane 1 (top-right): Command runner
tmux send-keys -t "$SESSION_NAME:0.1" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '⚡ Command Runner'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Run claude-flow commands here'" Enter

# Pane 2 (bottom-right): Log monitor
tmux send-keys -t "$SESSION_NAME:0.2" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '📄 Log Monitor'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Logs will appear here...'" Enter

# Set pane titles
tmux select-pane -t "$SESSION_NAME:0.0" -T "Main Development"
tmux select-pane -t "$SESSION_NAME:0.1" -T "Commands"
tmux select-pane -t "$SESSION_NAME:0.2" -T "Logs"

# Select main pane
tmux select-pane -t "$SESSION_NAME:0.0"

# Attach to session
tmux attach-session -t "$SESSION_NAME"
EOF

chmod +x "$CLAUDE_FLOW_DIR/tmux-dev-layout.sh"

echo -e "${GREEN}✅ Created development layout: $CLAUDE_FLOW_DIR/tmux-dev-layout.sh${NC}"

# Create claude-flow integration script
cat > "$CLAUDE_FLOW_DIR/claude-flow-tmux.sh" << 'EOF'
#!/bin/bash

# 🚀 Claude Flow with Tmux Integration
# ===================================

TASK="$1"
SESSION_NAME="${2:-claude-flow-$(date +%s)}"
LOG_FILE="${3:-./claude-flow-$(date +%Y%m%d-%H%M%S).log}"

if [ -z "$TASK" ]; then
    echo "Usage: $0 \"task description\" [session_name] [log_file]"
    echo "Example: $0 \"build REST API\" \"api-dev\" \"./api-build.log\""
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create new session
tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)"

# Set up 3-pane layout
tmux split-window -h -c "$(pwd)"
tmux split-window -v -c "$(pwd)"

# Layout:
# ┌─────────────────────┬──────────────────┐
# │                     │                  │
# │   Main Execution    │  Status Monitor  │
# │                     │                  │
# ├─────────────────────┴──────────────────┤
# │                                        │
# │           Live Log Tail                │
# │                                        │
# └────────────────────────────────────────┘

# Pane 0 (top-left): Main execution
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🖥️ Claude Flow - Main Execution'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Task: $TASK'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Session: $SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Log: $LOG_FILE'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter

# Start the claude-flow command
tmux send-keys -t "$SESSION_NAME:0.0" "npx claude-flow work \"$TASK\" --log-file \"$LOG_FILE\" --quiet" Enter

# Pane 1 (top-right): Status monitor
tmux send-keys -t "$SESSION_NAME:0.1" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '📊 Status Monitor'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Session: $SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Status: Running'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Started: $(date)'" Enter

# Create a simple status update loop
tmux send-keys -t "$SESSION_NAME:0.1" "while true; do clear; echo '📊 Claude Flow Status'; echo 'Session: $SESSION_NAME'; echo 'Status: Running'; echo 'Time: '$(date); echo 'Log: $LOG_FILE'; echo ''; if [ -f \"$LOG_FILE\" ]; then echo 'Log size: '$(wc -l < \"$LOG_FILE\")' lines'; echo 'Latest:'; tail -3 \"$LOG_FILE\" 2>/dev/null || echo 'No log entries yet'; fi; sleep 2; done" Enter

# Pane 2 (bottom): Live log tail
tmux send-keys -t "$SESSION_NAME:0.2" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '📄 Live Log Tail'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Waiting for log file...'" Enter

# Wait for log file to be created, then start tailing
tmux send-keys -t "$SESSION_NAME:0.2" "while [ ! -f \"$LOG_FILE\" ]; do sleep 1; done; clear; echo '📄 Live Log Tail'; echo 'Log file: $LOG_FILE'; echo ''; tail -f \"$LOG_FILE\" | sed -e 's/ERROR/\\033[31mERROR\\033[0m/g' -e 's/SUCCESS/\\033[32mSUCCESS\\033[0m/g' -e 's/WARN/\\033[33mWARN\\033[0m/g' -e 's/INFO/\\033[34mINFO\\033[0m/g'" Enter

# Set pane titles
tmux select-pane -t "$SESSION_NAME:0.0" -T "Main Execution"
tmux select-pane -t "$SESSION_NAME:0.1" -T "Status"
tmux select-pane -t "$SESSION_NAME:0.2" -T "Live Logs"

# Select main pane
tmux select-pane -t "$SESSION_NAME:0.0"

echo "🚀 Claude Flow tmux session started: $SESSION_NAME"
echo "📄 Log file: $LOG_FILE"
echo "🔗 To attach: tmux attach-session -t $SESSION_NAME"
echo "❌ To kill: tmux kill-session -t $SESSION_NAME"

# Attach to session
tmux attach-session -t "$SESSION_NAME"
EOF

chmod +x "$CLAUDE_FLOW_DIR/claude-flow-tmux.sh"

echo -e "${GREEN}✅ Created claude-flow integration: $CLAUDE_FLOW_DIR/claude-flow-tmux.sh${NC}"

# Create convenience aliases script
cat > "$CLAUDE_FLOW_DIR/tmux-aliases.sh" << 'EOF'
#!/bin/bash

# 🔧 Claude Flow Tmux Aliases
# ===========================

# Add these to your ~/.bashrc or ~/.zshrc for convenience

# Basic tmux commands
alias tmux-start='./start-tmux-session.sh'
alias tmux-dev='./tmux-dev-layout.sh'
alias tmux-cf='./claude-flow-tmux.sh'

# Session management
alias tmux-list='tmux list-sessions'
alias tmux-attach='tmux attach-session -t'
alias tmux-kill='tmux kill-session -t'

# Common claude-flow + tmux combinations
alias cf-work='./claude-flow-tmux.sh'
alias cf-api='./claude-flow-tmux.sh "build REST API" "api-dev"'
alias cf-test='./claude-flow-tmux.sh "run comprehensive tests" "testing"'
alias cf-deploy='./claude-flow-tmux.sh "deploy to production" "deployment"'

# Development workflows
alias dev-start='./tmux-dev-layout.sh dev-$(date +%s)'
alias dev-backend='./claude-flow-tmux.sh "develop backend API" "backend-dev"'
alias dev-frontend='./claude-flow-tmux.sh "develop frontend UI" "frontend-dev"'

echo "🔧 Tmux aliases defined!"
echo "Add these to your shell profile (.bashrc, .zshrc) to make them permanent:"
echo ""
echo "# Claude Flow Tmux Aliases"
echo "source $(pwd)/tmux-aliases.sh"
EOF

chmod +x "$CLAUDE_FLOW_DIR/tmux-aliases.sh"

echo -e "${GREEN}✅ Created tmux aliases: $CLAUDE_FLOW_DIR/tmux-aliases.sh${NC}"

# Create quick setup script
cat > "$CLAUDE_FLOW_DIR/setup-tmux-env.sh" << 'EOF'
#!/bin/bash

# 🚀 Quick Tmux Environment Setup
# ==============================

echo "🖥️ Setting up Claude Flow Tmux Environment..."

# Make all scripts executable
chmod +x *.sh

# Create logs directory
mkdir -p logs

# Test tmux configuration
if tmux source-file ~/.config/tmux/tmux.conf 2>/dev/null; then
    echo "✅ Tmux configuration loaded successfully"
else
    echo "⚠️ Tmux configuration not found, using defaults"
fi

# Start default development session
echo "🚀 Starting default development session..."
./start-tmux-session.sh claude-code-dev

echo "🎉 Setup complete!"
echo ""
echo "Available scripts:"
echo "  ./start-tmux-session.sh [name]       - Start basic tmux session"
echo "  ./tmux-dev-layout.sh [name]          - Start development layout"
echo "  ./claude-flow-tmux.sh \"task\" [name] - Run claude-flow with tmux"
echo "  ./setup-tmux-env.sh                  - This setup script"
echo ""
echo "Key bindings (prefix: Ctrl-a):"
echo "  Ctrl-a |    - Split vertically"
echo "  Ctrl-a -    - Split horizontally"
echo "  Ctrl-a b    - Break pane to new window"
echo "  Ctrl-a hjkl - Navigate panes"
echo "  Ctrl-a r    - Reload config"
echo ""
echo "Claude Flow shortcuts:"
echo "  Ctrl-a Ctrl-f - Type 'npx claude-flow '"
echo "  Ctrl-a Ctrl-w - Type 'npx claude-flow work \"'"
echo "  Ctrl-a Ctrl-s - Type 'npx claude-flow sparc \"'"
echo "  Ctrl-a Ctrl-h - Type 'npx claude-flow hive \"'"
EOF

chmod +x "$CLAUDE_FLOW_DIR/setup-tmux-env.sh"

echo -e "${GREEN}✅ Created quick setup: $CLAUDE_FLOW_DIR/setup-tmux-env.sh${NC}"

echo ""
echo -e "${BLUE}🎉 Tmux Setup Complete!${NC}"
echo -e "${BLUE}=======================${NC}"
echo ""
echo -e "${GREEN}✅ Tmux configuration: $TMUX_CONFIG_FILE${NC}"
echo -e "${GREEN}✅ Session starter: ./start-tmux-session.sh${NC}"
echo -e "${GREEN}✅ Development layout: ./tmux-dev-layout.sh${NC}"
echo -e "${GREEN}✅ Claude Flow integration: ./claude-flow-tmux.sh${NC}"
echo -e "${GREEN}✅ Aliases: ./tmux-aliases.sh${NC}"
echo -e "${GREEN}✅ Quick setup: ./setup-tmux-env.sh${NC}"
echo ""
echo -e "${YELLOW}🚀 Quick Start:${NC}"
echo -e "${YELLOW}  ./setup-tmux-env.sh${NC}"
echo ""
echo -e "${YELLOW}🎯 Run Claude Flow with Tmux:${NC}"
echo -e "${YELLOW}  ./claude-flow-tmux.sh \"build REST API\" \"api-dev\"${NC}"
echo ""
echo -e "${YELLOW}🔧 Key Features:${NC}"
echo -e "${YELLOW}  • Prefix key: Ctrl-a (more ergonomic)${NC}"
echo -e "${YELLOW}  • Break pane: Ctrl-a b (the 'optionb' solution)${NC}"
echo -e "${YELLOW}  • Split panes: Ctrl-a | (vertical) and Ctrl-a - (horizontal)${NC}"
echo -e "${YELLOW}  • Navigate: Ctrl-a hjkl (vim-style)${NC}"
echo -e "${YELLOW}  • Claude Flow shortcuts: Ctrl-a Ctrl-f/w/s/h${NC}"
echo ""
echo -e "${BLUE}📖 The 'optionb' issue is solved:${NC}"
echo -e "${BLUE}  • Default tmux 'break-pane' is bound to Ctrl-b !${NC}"
echo -e "${BLUE}  • Our config maps it to Ctrl-a b for easier access${NC}"
echo -e "${BLUE}  • Use 'Ctrl-a b' to break current pane into new window${NC}"
echo -e "${BLUE}  • Use 'Ctrl-a B' to break pane and keep it in view${NC}"