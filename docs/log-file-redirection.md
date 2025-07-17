# Log File Redirection - Console Flickering Solution

## 🔍 Problem

The `work` command causes console flickering due to:
- Multiple concurrent progress indicators
- Real-time swarm coordination updates
- Agent status messages competing for terminal space
- MCP tool status updates
- Memory operations and hooks firing frequently

## ✅ Solution: Option 3 - Redirect to Log File

Complete log file redirection system that prevents console flickering while maintaining full output capture.

## 🚀 Usage Examples

### Basic Log File Redirection
```bash
# Redirect all output to file (prevents flickering)
npx claude-flow work "build REST API" --log-file ./build.log

# Monitor progress in separate terminal
tail -f ./build.log
```

### Output Mode Options

#### Quiet Mode
```bash
# Reduced console output + file backup
npx claude-flow work "complex task" --log-file ./work.log --quiet
```

#### Silent Mode
```bash
# Only errors in console, everything in file
npx claude-flow work "deployment" --log-file ./deploy.log --silent
```

#### Summary Only Mode
```bash
# Only final summary in console
npx claude-flow work "analysis" --log-file ./analysis.log --summary-only
```

#### No Progress Mode
```bash
# Disable real-time progress updates
npx claude-flow work "build app" --log-file ./app.log --no-progress
```

## 📊 Real-Time Monitoring

### View Live Progress
```bash
# Follow log file in real-time
tail -f ./build.log

# Watch with automatic refresh
watch -n 1 tail -20 ./build.log

# Monitor with color highlighting
tail -f ./build.log | grep --color=auto -E "(ERROR|WARN|SUCCESS|✅|❌|🚀)"
```

### Search Log Content
```bash
# Find specific events
grep "Agent spawned" ./build.log
grep "ERROR" ./build.log
grep "✅" ./build.log

# Extract timing information
grep "\[+.*ms\]" ./build.log
```

## 📁 Log File Structure

### Header Information
```
# Claude Flow Work Command Log
# Session started: 2024-01-15T10:30:00.000Z
# Log file: /path/to/build.log
# Process ID: 12345
# Working directory: /project/path
# Node version: v18.17.0
# Arguments: work "build REST API" --log-file ./build.log
```

### Log Entry Format
```
[2024-01-15T10:30:15.234Z] [+15234ms] [INFO] 🚀 Initializing swarm coordination...
[2024-01-15T10:30:16.123Z] [+16123ms] [LOGGER:INFO] Agent spawned: coordinator
[2024-01-15T10:30:17.456Z] [+17456ms] [LOG] Task progress: 25% complete
```

### Footer Summary
```
================================================================================
📊 SESSION SUMMARY
================================================================================
Duration: 45678ms (45.68s)
End time: 2024-01-15T10:31:00.000Z
Status: ✅ SUCCESS

{
  "success": true,
  "duration": 45678,
  "agents": 5,
  "tasks_completed": 12,
  "performance": {
    "efficiency": 0.94,
    "parallelization": 0.87
  }
}
================================================================================
```

## 🔧 Technical Implementation

### Output Redirection Levels

| Mode | Console Output | Log File | Use Case |
|------|----------------|----------|----------|
| **Default** | Full output + file backup | Complete log | Development |
| **--quiet** | Reduced output | Complete log | Less verbose |
| **--no-progress** | No progress bars | Complete log | Clean output |
| **--silent** | Errors only | Complete log | Production |
| **--summary-only** | Final summary only | Complete log | CI/CD |

### Process Management
- Automatic cleanup on process exit
- Signal handlers for graceful shutdown
- Uncaught exception logging
- Memory leak prevention

### Performance Benefits
- **Eliminates console flickering** - No competing terminal writes
- **Full output capture** - Nothing is lost to log file
- **Real-time monitoring** - External tools can follow progress
- **Historical record** - Complete session logs for debugging
- **Better CI/CD integration** - Clean console output for automated systems

## 🎯 Best Practices

### File Organization
```bash
# Organize logs by date
mkdir -p logs/$(date +%Y-%m-%d)
npx claude-flow work "task" --log-file logs/$(date +%Y-%m-%d)/work-$(date +%H%M%S).log

# Project-specific logs
npx claude-flow work "build frontend" --log-file ./logs/frontend-build.log
npx claude-flow work "deploy backend" --log-file ./logs/backend-deploy.log
```

### Monitoring Setup
```bash
# Split terminal monitoring
# Terminal 1: Run command
npx claude-flow work "complex task" --log-file ./progress.log --silent

# Terminal 2: Monitor progress
tail -f ./progress.log | grep --color=auto -E "(✅|❌|🚀|📊)"
```

### Log Analysis
```bash
# Extract key metrics
grep "Session Summary" -A 20 ./build.log
grep "Duration:" ./build.log
grep "efficiency" ./build.log

# Error analysis
grep "ERROR\|WARN" ./build.log > errors.log
```

## 🔍 Troubleshooting

### File Permissions
```bash
# Ensure log directory is writable
mkdir -p ./logs && chmod 755 ./logs

# Check file permissions
ls -la ./build.log
```

### Disk Space
```bash
# Monitor log file size
du -h ./build.log

# Compress old logs
gzip ./logs/*.log
```

### Performance
```bash
# Use faster terminal for monitoring
# Use 'less +F' instead of 'tail -f' for very large files
less +F ./build.log
```

## 📈 Advanced Usage

### Automated Log Rotation
```bash
# Auto-rotate logs by size
npx claude-flow work "task" --log-file ./logs/work-$(date +%s).log

# Parse and extract metrics
cat ./build.log | grep "efficiency" | tail -1
```

### Integration with CI/CD
```bash
# Jenkins/GitHub Actions
npx claude-flow work "$TASK" --log-file ./logs/ci-build.log --summary-only
echo "Exit code: $?"
```

This log file redirection system completely eliminates console flickering while providing comprehensive logging and monitoring capabilities.
