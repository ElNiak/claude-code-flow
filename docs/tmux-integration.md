# Tmux Integration - Live Log Monitoring

## 🖥️ Enhanced Option 3: Automatic Tmux Session with Live Monitoring

The tmux integration automatically creates a multi-pane tmux session that provides:
- **Console flickering elimination** (via log file redirection)
- **Live log monitoring** with color highlighting
- **Real-time status updates** and metrics
- **Interactive session management**

## 🚀 Usage Examples

### Basic Tmux Session
```bash
# Creates tmux session with live log monitoring
npx claude-flow work "build REST API" --tmux --log-file ./build.log
```

### Auto-Generated Log File
```bash
# Tmux session with auto-generated log file
npx claude-flow work "complex task" --tmux --tmux-session "my-work"
```

### Combined Options
```bash
# Tmux + quiet mode + custom session name
npx claude-flow work "deployment" --tmux --log-file ./deploy.log --quiet --tmux-session "deploy-prod"
```

## 🎛️ Tmux Layout

The system automatically creates a **3-pane layout**:

```
┌─────────────────────┬──────────────────┐
│                     │                  │
│    Main Execution   │  Status Monitor  │
│                     │                  │
│   (work command     │  • Session info  │
│    output here)     │  • Progress      │
│                     │  • Metrics       │
├─────────────────────┴──────────────────┤
│                                        │
│           Live Log Tail                │
│        (with color highlighting)       │
│                                        │
└────────────────────────────────────────┘
```

### Pane Details:

#### **Top-Left: Main Execution**
- Shows the work command execution output
- Where you interact with the command
- **Title**: "Main Execution"

#### **Top-Right: Status Monitor**  
- Real-time session information
- Progress tracking
- System metrics
- Auto-updates every 2 seconds
- **Title**: "Status"

#### **Bottom: Live Log Tail**
- Live tail of the log file
- Color highlighting for different log levels
- Automatic scroll with new entries
- **Title**: "Live Logs"

## 🎮 Tmux Controls

### Session Management
```bash
# Attach to existing session
tmux attach-session -t "claude-flow-work-123456"

# List all sessions
tmux list-sessions

# Kill session when done
tmux kill-session -t "claude-flow-work-123456"
```

### Navigation Controls
| Key Combination | Action |
|-----------------|---------|
| `Ctrl+b + arrow keys` | Switch between panes |
| `Ctrl+b + Ctrl+arrow keys` | Resize panes |
| `Ctrl+b + [` | Enter copy mode (scroll/search) |
| `Ctrl+b + d` | Detach from session |
| `Ctrl+b + c` | Create new window |
| `Ctrl+b + n` | Next window |
| `Ctrl+b + p` | Previous window |

### Copy Mode (Scrolling/Searching)
```bash
# Enter copy mode
Ctrl+b + [

# In copy mode:
Page Up/Down    # Scroll through logs
Ctrl+s          # Search forward
Ctrl+r          # Search backward
q               # Exit copy mode
```

## 🎯 Color Highlighting

The live log tail automatically highlights important content:

- 🔴 **ERROR** - Red highlighting for errors
- 🟡 **WARN** - Yellow highlighting for warnings  
- 🟢 **SUCCESS** - Green highlighting for success
- 🔵 **INFO** - Blue highlighting for info
- ✅ **Completed tasks** - Green checkmarks
- ❌ **Failed tasks** - Red X marks
- 🚀 **Progress indicators** - Blue rockets
- 📊 **Metrics** - Chart emojis

## 📊 Status Monitor

The status pane shows real-time information:

```
📊 Claude Flow Status
Session: claude-flow-work-123456
Status: Running
Agents: 5
Tasks: 12
Progress: 67%
Updated: 14:23:45
```

## 🛠️ Advanced Usage

### Custom Session Names
```bash
# Use meaningful session names
npx claude-flow work "backend-api" --tmux --tmux-session "api-dev"
npx claude-flow work "frontend-build" --tmux --tmux-session "ui-build"
npx claude-flow work "prod-deploy" --tmux --tmux-session "production"
```

### Multiple Sessions
```bash
# Run multiple work commands in parallel sessions
npx claude-flow work "backend" --tmux --tmux-session "backend" &
npx claude-flow work "frontend" --tmux --tmux-session "frontend" &
npx claude-flow work "tests" --tmux --tmux-session "testing" &

# List all active sessions
tmux list-sessions
```

### Session Persistence
```bash
# Detach from session (keeps running)
Ctrl+b + d

# Re-attach later
tmux attach-session -t "claude-flow-work-123456"

# The work command continues running in background
```

## 🔧 Installation Requirements

### Tmux Installation
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# CentOS/RHEL
sudo yum install tmux

# Check installation
tmux -V
```

### Verification
```bash
# Test tmux availability
which tmux

# If not found, the system will fallback gracefully to regular log file mode
```

## 💡 Best Practices

### Session Organization
```bash
# Use descriptive session names
--tmux-session "project-feature-branch"
--tmux-session "env-deployment-type"  
--tmux-session "component-action"

# Examples:
--tmux-session "ecommerce-api-dev"
--tmux-session "staging-deploy"
--tmux-session "auth-testing"
```

### Log File Management
```bash
# Organize logs by session
mkdir -p ./logs/tmux-sessions
--log-file ./logs/tmux-sessions/api-dev.log

# Include timestamps in log names
--log-file ./logs/work-$(date +%Y%m%d-%H%M%S).log
```

### Workflow Integration
```bash
# Development workflow
npx claude-flow work "setup dev env" --tmux --tmux-session "setup"
# ... detach and continue other work ...
# ... re-attach when needed ...
tmux attach-session -t "setup"
```

## 🚨 Troubleshooting

### Tmux Not Available
```bash
# If tmux is not installed, you'll see:
⚠️ Failed to setup tmux session: tmux is not installed
💡 Continuing without tmux session...

# Install tmux or use regular log file mode:
npx claude-flow work "task" --log-file ./work.log
```

### Session Already Exists
```bash
# The system automatically handles this by adding a counter:
claude-flow-work-1
claude-flow-work-2
claude-flow-work-3
```

### Permission Issues
```bash
# Ensure you have permission to create tmux sessions
# Usually this means your user can access /tmp and /var
ls -la /tmp
```

## 🎪 Demo Session

Try this example to see tmux integration in action:

```bash
# Start a demo session
npx claude-flow work "analyze this project structure" --tmux --tmux-session "demo"

# You'll see:
# 1. Tmux session created with 3 panes
# 2. Live log tail in bottom pane  
# 3. Status updates in top-right
# 4. Main execution in top-left

# Detach and re-attach:
Ctrl+b + d              # Detach
tmux attach -t "demo"    # Re-attach

# When done:
tmux kill-session -t "demo"
```

## 🔗 Integration with Other Tools

### IDE Integration
```bash
# VS Code integrated terminal
# Open terminal in VS Code, run tmux command
# VS Code will show the tmux session in the integrated terminal

# Terminal multiplexers work great with IDEs
```

### CI/CD Integration
```bash
# While tmux is designed for interactive use,
# you can still use log file mode in CI/CD:
npx claude-flow work "ci-task" --log-file ./ci-build.log --summary-only
```

This tmux integration provides the ultimate development experience for monitoring complex Claude Flow work commands with real-time visibility into all aspects of execution!