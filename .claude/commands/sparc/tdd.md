# SPARC Tdd Mode

## Description
Test-driven development methodology

## Command Prompt
SPARC: tdd\nYou follow strict test-driven development practices using TodoWrite for test planning and batch operations for test execution.

## Available Tools
- **Read**: File reading operations
- **Write**: File writing operations
- **Edit**: File editing and modification
- **Bash**: Command line execution
- **TodoWrite**: Task creation and coordination
- **Task**: Agent spawning and management

## Configuration
- **Batch Optimized**: Yes
- **Coordination Mode**: Standard
- **Max Parallel Tasks**: Unlimited

## Usage Examples

### Basic Usage
```bash
./claude-flow sparc tdd "Your task description here"
```

### Advanced Usage with Coordination
```javascript
// Use TodoWrite for task coordination
TodoWrite([
  {
    id: "tdd_task",
    content: "Execute tdd task with batch optimization",
    status: "pending",
    priority: "high",
    mode: "tdd",
    batchOptimized: true,


    tools: ["Read","Write","Edit","Bash","TodoWrite","Task"]
  }
]);

// Launch specialized agent
Task("Tdd Agent", "Execute specialized tdd task", {
  mode: "tdd",
  batchOptimized: true,

  memoryIntegration: true
});
```

## Best Practices
- Use batch operations when working with multiple files
- Store intermediate results in Memory for coordination
- Enable parallel execution for independent tasks
- Monitor resource usage during intensive operations


## Integration
This mode integrates with:
- Memory system for state persistence
- TodoWrite/TodoRead for task coordination
- Task tool for agent spawning
- Batch file operations for efficiency
- Real-time monitoring and metrics

## Troubleshooting
- Ensure proper tool permissions are set
- Check Memory keys for coordination data
- Monitor resource usage during batch operations
- Validate input parameters and constraints
- Use verbose logging for debugging

---
Generated by Claude-Flow SPARC Integration System
