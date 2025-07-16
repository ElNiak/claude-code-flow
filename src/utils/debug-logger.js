// debug-logger.js - Simple debug logging utility

class DebugLogger {
  constructor() {
    this.enabled = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  logFunctionEntry(module, functionName, _args) {
    if (this.enabled) {
      console.debug(`[DEBUG] ${module}.${functionName}() called with args:`, _args);
    }
    return Date.now(); // Return call ID for exit tracking
  }

  logFunctionExit(callId, module, functionName, result) {
    if (this.enabled) {
      const _duration = Date.now() - callId;
      console.debug(`[DEBUG] ${module}.${functionName}() completed in ${duration}ms`);
    }
  }

  logFunctionError(callId, module, functionName, _error) {
    if (this.enabled) {
      const _duration = Date.now() - callId;
      console.error(`[ERROR] ${module}.${functionName}() failed after ${duration}ms:`, error.message);
    }
  }
}

export const _debugLogger = new DebugLogger();