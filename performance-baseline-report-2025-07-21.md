# Claude-Flow CLI Performance Baseline Report

**Generated:** 2025-07-21T11:08:09.663Z
**Environment:** v23.11.0 on darwin
**CLI Version:** 🔍 [DEEP DEBUG] parseFlags called with args: [--version]
🔍 [DEEP DEBUG] Original process.argv: [/opt/homebrew/Cellar/node/23.11.0/bin/node, /Users/elniak/Documents/Project/claude-code-flow/dist/cli/simple-cli.js, --version]
  Processing arg[0]: "--version"
    Flag detected: "version", next arg: "undefined"
    ✅ Set boolean flag "version" = true
🎯 [DEEP DEBUG] parseFlags result:
  flags: {
  "version": true
}
  args: []
Claude-Flow v2.0.0-alpha.50

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Startup Time (avg)** | 125.30ms | ✅ Good |
| **Startup Time (p95)** | 130.62ms | Statistical reliability |
| **Critical Issues** | 0 | Requires attention |

## ⚡ Startup Performance Analysis

| Statistic | Value |
|-----------|-------|
| Mean | 125.30ms |
| Median | 124.07ms |
| Min | 121.00ms |
| Max | 136.65ms |
| Std Dev | 3.90ms |
| 95th Percentile | 130.62ms |
| 99th Percentile | 135.44ms |
| Sample Count | 15 |

## 📈 Command Performance Baseline

| Command | Mean (ms) | Median (ms) | Critical | Status |
|---------|-----------|-------------|----------|--------|
| help | 125.21 | 124.29 | 🔴 | ✅ |
| config-get | 127.06 | 124.59 | 🔴 | ✅ |
| status | 124.38 | 123.94 | 🟡 | ✅ |
| memory | 128.16 | 126.71 | 🟡 | ✅ |
| agents-list | 136.05 | 132.97 | 🟡 | ✅ |

## 💾 Memory Usage Baseline

| Metric | Value |
|--------|-------|
| Heap Used | 3.27 MB |
| Heap Total | 4.80 MB |
| RSS | 28.77 MB |
| External | 1.18 MB |

## 📁 File Size Analysis

| File | Size | Status |
|------|------|--------|
| dist/cli/simple-cli.js | NaN KB | ❌ |
| dist/cli/command-registry.js | NaN KB | ❌ |
| dist/cli/simple-orchestrator.js | NaN KB | ❌ |
| package.json | NaN KB | ❌ |
| package-lock.json | NaN KB | ❌ |

## 🎯 Performance Recommendations

### Optimization Opportunities

💡 **Performance baseline established**
- **Recommendation:** Implement dynamic imports, command caching, and build optimizations
- **Target:** Continuous improvement

## 🔄 Regression Detection Thresholds

For future performance testing, these thresholds will trigger alerts:

- **Startup Time:** > 200ms
- **Command Time:** > 300ms
- **Memory Usage:** > 100MB

## 📝 Next Steps

1. **Monitor Performance:** Regular benchmarking to detect regressions
2. **Optimize Imports:** Lazy load heavy dependencies
3. **Build Optimization:** Implement tree shaking and minification
4. **Command Optimization:** Profile and optimize slow commands
5. **Memory Management:** Monitor memory usage patterns

---
*This baseline report will be used for performance regression detection and optimization tracking.*
