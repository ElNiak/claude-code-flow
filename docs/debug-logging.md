# Debug Logging System for Claude-Flow CLI

This document describes the comprehensive debug logging system implemented for the Claude-Flow CLI to trace function calls with their arguments.

## Overview

The debug logging system provides:
- **Function entry/exit logging** with timestamps
- **Parameter values and types** logging
- **Return value** logging (optional)
- **Error logging** with stack traces
- **Performance metrics** (execution time)
- **Configurable logging levels** and modules
- **Hierarchical call stack** visualization

## Architecture

The debug logging system consists of three main components:

### 1. DebugLogger (`src/utils/debug-logger.ts`)
- Core logging functionality
- Configurable via environment variables
- Tracks call stack and execution time
- Handles both sync and async functions

### 2. CLI Instrumentation (`src/utils/cli-instrumentation.ts`)
- Utilities for instrumenting classes and objects
- Decorators for automatic logging
- Function wrapping utilities

### 3. Automation Script (`scripts/add-debug-logging.ts`)
- Automatically adds debug logging to existing CLI files
- Parses JavaScript/TypeScript files
- Injects logging code while preserving functionality

## Configuration

Configure the debug logging system using environment variables:

### Basic Configuration

```bash
# Enable debug logging
export CLAUDE_FLOW_DEBUG=true

# Set debug level (TRACE, DEBUG, INFO)
export CLAUDE_FLOW_DEBUG_LEVEL=DEBUG

# Enable execution time measurement
export CLAUDE_FLOW_DEBUG_TIME=true

# Include return values in logs
export CLAUDE_FLOW_DEBUG_RETURN=true

# Include stack traces
export CLAUDE_FLOW_DEBUG_STACK=true
```

### Advanced Configuration

```bash
# Filter by modules (comma-separated, * for all)
export CLAUDE_FLOW_DEBUG_MODULES="cli/commands,cli/agents"

# Filter by functions (comma-separated, * for all)
export CLAUDE_FLOW_DEBUG_FUNCTIONS="*"

# Maximum argument length in logs
export CLAUDE_FLOW_DEBUG_MAX_ARG_LENGTH=1000
```

## Usage Examples

### 1. Manual Function Instrumentation

```typescript
import { debugLogger } from '../utils/debug-logger.js';

function myFunction(param1: string, param2: number) {
  const callId = debugLogger.logFunctionEntry('myModule', 'myFunction', [param1, param2]);
  try {
    const result = (() => {
      // Your function logic here
      return `processed: ${param1}`;
    })();
    debugLogger.logFunctionExit(callId, 'myModule', 'myFunction', result);
    return result;
  } catch (error) {
    debugLogger.logFunctionError(callId, 'myModule', 'myFunction', error as Error);
    throw error;
  }
}
```

### 2. Async Function Instrumentation

```typescript
async function myAsyncFunction(data: any) {
  const callId = debugLogger.logFunctionEntry('myModule', 'myAsyncFunction', [data]);
  try {
    const result = await (async () => {
      // Your async logic here
      return await processData(data);
    })();
    debugLogger.logFunctionExit(callId, 'myModule', 'myAsyncFunction', result);
    return result;
  } catch (error) {
    debugLogger.logFunctionError(callId, 'myModule', 'myAsyncFunction', error as Error);
    throw error;
  }
}
```

### 3. Using Decorators

```typescript
import { debugTrace } from '../utils/debug-logger.js';

class MyClass {
  @debugTrace('MyClass')
  public myMethod(param: string): string {
    return `processed: ${param}`;
  }
}
```

### 4. Function Wrapping

```typescript
import { traceFunction } from '../utils/debug-logger.js';

const originalFunction = (a: string, b: number) => `${a}-${b}`;
const tracedFunction = traceFunction('myModule', 'originalFunction', originalFunction);
```

## Log Output Format

The debug logging system produces hierarchical output showing function call flow:

```
[2024-01-15T10:30:45.123Z] DEBUG → cli/commands/status:showStatus({"json": false})
[2024-01-15T10:30:45.125Z] DEBUG   → cli/commands/status:getSystemStatus()
[2024-01-15T10:30:45.127Z] DEBUG   ← cli/commands/status:getSystemStatus → {"overall": "healthy", ...} (2ms)
[2024-01-15T10:30:45.128Z] DEBUG ← cli/commands/status:showStatus (5ms)
```

### Log Entry Components

- **Timestamp**: ISO 8601 format
- **Level**: DEBUG, INFO, WARN, ERROR
- **Direction**: → (entry), ← (exit), ✗ (error)
- **Module**: File path relative to CLI root
- **Function**: Function name
- **Arguments**: Function parameters (sanitized)
- **Return Value**: Function return value (if enabled)
- **Execution Time**: Function duration (if enabled)
- **Indentation**: Shows call hierarchy

## Running the Debug Logging System

### 1. Test the System

```bash
# Run the test script
npx tsx scripts/test-debug-logging.ts
```

### 2. Run CLI with Debug Logging

```bash
# Enable debug logging and run a command
export CLAUDE_FLOW_DEBUG=true
export CLAUDE_FLOW_DEBUG_LEVEL=DEBUG
export CLAUDE_FLOW_DEBUG_TIME=true

# Run a CLI command
npx claude-flow status --json
```

### 3. Filter Debug Output

```bash
# Only log commands module
export CLAUDE_FLOW_DEBUG_MODULES="cli/commands"

# Only log specific functions
export CLAUDE_FLOW_DEBUG_FUNCTIONS="showStatus,getSystemStatus"

npx claude-flow status
```

## Implementation Status

### ✅ Completed Components

1. **Core Debug Logger** - Full implementation with all features
2. **CLI Instrumentation Utilities** - Decorators and function wrapping
3. **Automation Script** - Automatic code instrumentation
4. **Documentation** - Complete usage guide
5. **Test Script** - Comprehensive testing

### ✅ Instrumented Files

- `src/cli/simple-cli.js` - Main CLI entry point (partial)
- `src/cli/commands/status.ts` - Status command (complete)
- `src/cli/commands/agent.ts` - Agent command (complete)
- `src/cli/commands/start.ts` - Start command (complete)

### 🔄 In Progress

- Automated instrumentation of all CLI files
- Integration with existing logger system
- Performance optimization for production use

## Best Practices

### 1. Module Naming
- Use relative paths from `src/cli/`: `cli/commands/status`
- Be consistent with naming conventions
- Use descriptive module names

### 2. Function Naming
- Use actual function names, not abbreviated versions
- Include class names for methods: `MyClass.myMethod`
- Use descriptive action names: `executeCommand`, `validateInput`

### 3. Argument Handling
- Sanitize sensitive data before logging
- Use appropriate argument length limits
- Consider object serialization costs

### 4. Performance Considerations
- Debug logging adds minimal overhead when disabled
- Enable time measurement only when needed
- Use module filtering to reduce log volume

### 5. Error Handling
- Always wrap instrumented functions in try-catch
- Log errors with full context
- Don't suppress original errors

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_FLOW_DEBUG` | `false` | Enable debug logging |
| `CLAUDE_FLOW_DEBUG_LEVEL` | `DEBUG` | Logging level (TRACE, DEBUG, INFO) |
| `CLAUDE_FLOW_DEBUG_MODULES` | `*` | Module filter (comma-separated) |
| `CLAUDE_FLOW_DEBUG_FUNCTIONS` | `*` | Function filter (comma-separated) |
| `CLAUDE_FLOW_DEBUG_MAX_ARG_LENGTH` | `1000` | Maximum argument length |
| `CLAUDE_FLOW_DEBUG_STACK` | `false` | Include stack traces |
| `CLAUDE_FLOW_DEBUG_RETURN` | `false` | Include return values |
| `CLAUDE_FLOW_DEBUG_TIME` | `false` | Measure execution time |

## Troubleshooting

### Common Issues

1. **No debug output appearing**
   - Check that `CLAUDE_FLOW_DEBUG=true` is set
   - Verify module and function filters
   - Ensure functions are properly instrumented

2. **Performance issues**
   - Disable return value logging if not needed
   - Use module filtering to reduce log volume
   - Disable time measurement in production

3. **Memory usage**
   - Monitor call stack size with long-running operations
   - Use shorter argument length limits
   - Clear call stack periodically if needed

### Debug Commands

```bash
# Show current configuration
node -e "console.log(require('./src/utils/debug-logger.js').debugLogger.getConfig())"

# Test basic functionality
export CLAUDE_FLOW_DEBUG=true && npx tsx scripts/test-debug-logging.ts

# Run with full debugging
export CLAUDE_FLOW_DEBUG=true CLAUDE_FLOW_DEBUG_TIME=true CLAUDE_FLOW_DEBUG_RETURN=true && npx claude-flow status
```

## Future Enhancements

1. **Web UI Integration** - Real-time debug log viewing
2. **Log Persistence** - Save debug logs to files
3. **Performance Profiling** - Identify bottlenecks
4. **Distributed Tracing** - Track calls across agents
5. **Log Analysis** - Pattern recognition and insights

## Contributing

When adding new CLI functions:

1. Import the debug logger: `import { debugLogger } from '../utils/debug-logger.js'`
2. Add instrumentation to all functions
3. Use consistent module naming
4. Test with debug logging enabled
5. Update documentation if needed

For questions or issues, please refer to the main project documentation or create an issue in the GitHub repository.
