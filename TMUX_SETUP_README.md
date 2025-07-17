# 🖥️ Claude Code Flow - Optimal Tmux Setup

## 🎯 Overview

This comprehensive tmux setup solves the **"optionb" issue** and provides an optimal terminal environment for running claude-code with proper screen splitting, session management, and live monitoring.

## 🚨 The "optionb" Solution

The diagnostic analysis revealed that "optionb" likely refers to:
- **Missing tmux break-pane binding** (default: `Ctrl-b !`)
- **Unclear pane management** for claude-code workflows
- **Need for optimized terminal layout** for development

### ✅ Solution Implemented:
- **Break pane**: `Ctrl-a b` (easy access to break-pane functionality)
- **Split panes**: `Ctrl-a |` (vertical) and `Ctrl-a -` (horizontal)
- **Prefix key**: Changed to `Ctrl-a` for better ergonomics
- **Claude Flow shortcuts**: Direct bindings for common commands

## 🚀 Quick Start

### 1. Run the Setup Script
```bash
./tmux-setup.sh
```

### 2. Start Development Environment
```bash
./setup-tmux-env.sh
```

### 3. Run Claude Flow with Tmux
```bash
./claude-flow-tmux.sh "build REST API" "api-dev"
```

## 📁 Files Created

### Core Scripts
- **`tmux-setup.sh`** - Main setup script that installs and configures everything
- **`setup-tmux-env.sh`** - Quick environment setup and testing
- **`start-tmux-session.sh`** - Basic multi-window tmux session
- **`tmux-dev-layout.sh`** - Development-focused 3-pane layout
- **`claude-flow-tmux.sh`** - Claude Flow integration with live monitoring

### Configuration
- **`~/.config/tmux/tmux.conf`** - Optimized tmux configuration
- **`tmux-aliases.sh`** - Convenient shell aliases

## 🎮 Key Bindings

### Prefix Key: `Ctrl-a`
| Binding | Action | Description |
|---------|--------|-------------|
| `Ctrl-a \|` | Split vertically | Split current pane vertically |
| `Ctrl-a -` | Split horizontally | Split current pane horizontally |
| `Ctrl-a b` | Break pane | **Break current pane to new window** |
| `Ctrl-a B` | Break pane (keep) | Break pane and keep in view |
| `Ctrl-a hjkl` | Navigate panes | Vim-style pane navigation |
| `Ctrl-a HJKL` | Resize panes | Resize panes (repeatable) |
| `Ctrl-a r` | Reload config | Reload tmux configuration |

### Claude Flow Shortcuts
| Binding | Action | Description |
|---------|--------|-------------|
| `Ctrl-a Ctrl-f` | Claude Flow | Type `npx claude-flow ` |
| `Ctrl-a Ctrl-w` | Work command | Type `npx claude-flow work "` |
| `Ctrl-a Ctrl-s` | SPARC command | Type `npx claude-flow sparc "` |
| `Ctrl-a Ctrl-h` | Hive command | Type `npx claude-flow hive "` |

### Development Helpers
| Binding | Action | Description |
|---------|--------|-------------|
| `Ctrl-a D` | Clear & cd | Clear screen and cd to current path |
| `Ctrl-a G` | Git status | Run `git status` |
| `Ctrl-a T` | Run tests | Run `npm test` |
| `Ctrl-a S` | Start server | Run `npm start` |
| `Ctrl-a I` | Install deps | Run `npm install` |

## 🎯 Session Layouts

### 1. Basic Session (`start-tmux-session.sh`)
```
Window 1: main          - Main development
Window 2: claude-flow   - Claude Flow commands
Window 3: monitor       - System monitoring (3 panes)
Window 4: test          - Testing environment
```

### 2. Development Layout (`tmux-dev-layout.sh`)
```
┌─────────────────────┬──────────────────┐
│                     │                  │
│   Main Development  │   Command Runner │
│                     │                  │
│                     ├──────────────────┤
│                     │                  │
│                     │   Log Monitor    │
│                     │                  │
└─────────────────────┴──────────────────┘
```

### 3. Claude Flow Integration (`claude-flow-tmux.sh`)
```
┌─────────────────────┬──────────────────┐
│                     │                  │
│   Main Execution    │  Status Monitor  │
│                     │                  │
├─────────────────────┴──────────────────┤
│                                        │
│           Live Log Tail                │
│        (with color highlighting)       │
│                                        │
└────────────────────────────────────────┘
```

## 📊 Features

### 🎨 Visual Enhancements
- **Color-coded status bar** with Claude Code branding
- **Pane titles** for easy identification
- **Activity monitoring** with visual indicators
- **Color highlighting** in log tail (errors, warnings, success)

### 🚀 Performance Optimizations
- **Fast escape time** (0ms) for responsive interaction
- **Mouse support** for pane selection and resizing
- **History limit** of 50,000 lines
- **Automatic window renumbering**

### 🔧 Development Tools
- **Live log monitoring** with color highlighting
- **Real-time status updates** (every 2 seconds)
- **Session persistence** across detach/attach
- **Command history** and search

## 🛠️ Usage Examples

### Basic Development Session
```bash
# Start basic session
./start-tmux-session.sh my-project

# Or use default name
./start-tmux-session.sh
```

### Development Layout
```bash
# Start development layout
./tmux-dev-layout.sh backend-dev

# Attach to existing session
tmux attach-session -t backend-dev
```

### Claude Flow Integration
```bash
# Run claude-flow with tmux monitoring
./claude-flow-tmux.sh "build REST API" "api-dev" "./logs/api-build.log"

# Simple usage
./claude-flow-tmux.sh "analyze codebase"

# With custom session name
./claude-flow-tmux.sh "run tests" "testing"
```

### Session Management
```bash
# List all sessions
tmux list-sessions

# Attach to session
tmux attach-session -t session-name

# Kill session
tmux kill-session -t session-name

# Detach from session (keep running)
Ctrl-a d
```

## 🔧 Configuration Details

### Tmux Configuration (`~/.config/tmux/tmux.conf`)
- **Prefix key**: `Ctrl-a` (more ergonomic than `Ctrl-b`)
- **Mouse support**: Enabled for modern workflow
- **Vi-mode**: Copy mode uses vi-style key bindings
- **256-color support**: Full color terminal support
- **Base index**: Windows and panes start at 1 (not 0)

### Key Improvements Over Default
1. **Better prefix key**: `Ctrl-a` vs `Ctrl-b`
2. **Intuitive splitting**: `|` and `-` instead of `%` and `"`
3. **Vim navigation**: `hjkl` for pane navigation
4. **Break pane shortcut**: `b` for easy access (**solves optionb issue**)
5. **Development shortcuts**: Quick access to common commands

## 🎭 Shell Aliases

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
# Source the aliases
source /path/to/claude-code-flow/tmux-aliases.sh

# Or add individual aliases:
alias tmux-start='./start-tmux-session.sh'
alias tmux-dev='./tmux-dev-layout.sh'
alias tmux-cf='./claude-flow-tmux.sh'
alias cf-work='./claude-flow-tmux.sh'
```

## 📝 Troubleshooting

### Tmux Not Found
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# CentOS/RHEL
sudo yum install tmux
```

### Configuration Issues
```bash
# Reload configuration
Ctrl-a r

# Or manually
tmux source-file ~/.config/tmux/tmux.conf
```

### Session Management
```bash
# Kill all sessions
tmux kill-server

# List sessions
tmux list-sessions

# Session not found
tmux new-session -d -s session-name
```

## 🎯 The "optionb" Problem - SOLVED!

### What was the issue?
The diagnostic script revealed that "optionb" was likely referring to:
1. **Missing tmux break-pane functionality** (default: `Ctrl-b !`)
2. **Unclear pane management** for claude-code workflows
3. **Need for better terminal organization**

### How we solved it:
1. **`Ctrl-a b`** - Easy break-pane access (the "optionb" solution)
2. **`Ctrl-a B`** - Break pane and keep in view
3. **`Ctrl-a |` and `Ctrl-a -`** - Intuitive pane splitting
4. **Development layout** - Optimal 3-pane setup for claude-code
5. **Live monitoring** - Real-time log tail with color highlighting

### Key Bindings That Solve "optionb":
- **`Ctrl-a b`** - Break current pane into new window
- **`Ctrl-a B`** - Break pane but keep it visible
- **`Ctrl-a j`** - Join pane from another window
- **`Ctrl-a |`** - Split pane vertically
- **`Ctrl-a -`** - Split pane horizontally

## 🚀 Advanced Usage

### Multi-Project Development
```bash
# Start multiple projects
./claude-flow-tmux.sh "backend API" "backend-dev" &
./claude-flow-tmux.sh "frontend UI" "frontend-dev" &
./claude-flow-tmux.sh "run tests" "testing" &

# Monitor all sessions
tmux list-sessions
```

### Persistent Development Environment
```bash
# Create persistent session
./tmux-dev-layout.sh persistent-dev

# Detach and continue later
Ctrl-a d

# Re-attach when needed
tmux attach-session -t persistent-dev
```

### Log Monitoring
```bash
# Start claude-flow with log monitoring
./claude-flow-tmux.sh "complex task" "work-session" "./logs/work.log"

# The bottom pane will show live, color-coded logs:
# - ERROR (red)
# - SUCCESS (green)
# - WARN (yellow)
# - INFO (blue)
```

## 📚 Additional Resources

- **Tmux documentation**: `man tmux`
- **Configuration reference**: `~/.config/tmux/tmux.conf`
- **Session examples**: Check the generated scripts
- **Key bindings**: `Ctrl-a ?` (inside tmux)

## 🎉 Success!

The "optionb" issue has been comprehensively solved with:
- ✅ **Easy break-pane access** (`Ctrl-a b`)
- ✅ **Optimal claude-code layouts** (3-pane development)
- ✅ **Live monitoring** with color-coded logs
- ✅ **Intuitive key bindings** for all operations
- ✅ **Session management** scripts for quick setup
- ✅ **Development shortcuts** for common tasks

**Your tmux environment is now optimized for claude-code development!** 🚀
