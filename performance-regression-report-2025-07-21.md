# Performance Regression Detection Report

**Status:** ⚠️ WARNING
**Generated:** 2025-07-21T11:11:03.794Z

## 📊 Summary

| Metric | Count |
|--------|-------|
| **Regressions** | 1 |
| **Improvements** | 1 |
| **High Severity Issues** | 0 |

## 🔍 Baseline Comparison

| | Baseline | Current |
|---|----------|---------|
| **Timestamp** | 2025-07-21T11:08:09.663Z | 2025-07-21T11:10:51.538Z |
| **CLI Version** | 🔍 [DEEP DEBUG] parseFlags called with args: [--version]
🔍 [DEEP DEBUG] Original process.argv: [/opt/homebrew/Cellar/node/23.11.0/bin/node, /Users/elniak/Documents/Project/claude-code-flow/dist/cli/simple-cli.js, --version]
  Processing arg[0]: "--version"
    Flag detected: "version", next arg: "undefined"
    ✅ Set boolean flag "version" = true
🎯 [DEEP DEBUG] parseFlags result:
  flags: {
  "version": true
}
  args: []
Claude-Flow v2.0.0-alpha.50 | 🔍 [DEEP DEBUG] parseFlags called with args: [--version]
🔍 [DEEP DEBUG] Original process.argv: [/opt/homebrew/Cellar/node/23.11.0/bin/node, /Users/elniak/Documents/Project/claude-code-flow/dist/cli/simple-cli.js, --version]
  Processing arg[0]: "--version"
    Flag detected: "version", next arg: "undefined"
    ✅ Set boolean flag "version" = true
🎯 [DEEP DEBUG] parseFlags result:
  flags: {
  "version": true
}
  args: []
Claude-Flow v2.0.0-alpha.50 |

## ❌ Performance Regressions

| Metric | Baseline | Current | Change | Severity |
|--------|----------|---------|--------|----------|
| Startup Time | 125.30ms | 132.88ms | +6.1% | 🟡 low |

## ✅ Performance Improvements

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Command: agents-list | 136.05ms | 122.30ms | -10.1% |

## 💡 Recommendations

### 🔴 Startup Performance

Review recent changes affecting CLI initialization and import costs

### 💡 Performance Improvements

1 performance improvements detected. Document successful optimizations.

## 🔧 Next Steps

1. **Monitor Closely** - Watch for trend continuation
2. **Investigate Changes** - Review recent commits for potential causes
3. **Consider Optimization** - Proactive performance improvements
