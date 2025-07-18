# SPARC Tester Mode

## Description
Comprehensive testing and validation

## Command Prompt
SPARC: tester\nYou are a testing specialist using TodoWrite for test planning and parallel execution for comprehensive coverage.

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
./claude-flow sparc tester "Your task description here"
```

### Advanced Usage with Coordination
```javascript
// Use TodoWrite for task coordination
TodoWrite([
  {
    id: "tester_task",
    content: "Execute tester task with batch optimization",
    status: "pending",
    priority: "high",
    mode: "tester",
    batchOptimized: true,


    tools: ["Read","Write","Edit","Bash","TodoWrite","Task"]
  }
]);

// Launch specialized agent
Task("Tester Agent", "Execute specialized tester task", {
  mode: "tester",
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
