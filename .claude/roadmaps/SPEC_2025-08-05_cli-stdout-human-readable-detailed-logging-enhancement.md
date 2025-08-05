---
id: cli-logging-enhancement-spec
objective: "CLI stdout human readable with detailed logging to files and stderr"
phase: SPEC
profile: tooling
project_kind: tooling
inferred_stacks: ["typescript", "nodejs", "cli", "logging"]
tags: ["logging", "cli", "user-experience", "debugging", "mcp"]
schema: v1
generated_at: "2025-08-05T06:20:58.000Z"
locale: en
---

# Plan – SPEC – CLI Logging Enhancement – 2025-08-05 

## 1. State Snapshot

### Current Architecture Status
- **Runtime**: Node.js 20+ with TypeScript compilation to ES modules and CommonJS
- **CLI Entry Points**: 
  - `bin/claude-flow.js` (NPM entry, basic console output)
  - `src/cli/main.ts` (Advanced entry with ComponentLoggerFactory)
  - `src/cli/simple-commands/*` (76 files with 2,891 raw console calls)

### Existing Logging Infrastructure ✅
- **ComponentLoggerFactory**: Sophisticated logging with correlation IDs
- **DebugLogger**: Cross-system correlation with claude-code integration  
- **MCP Protocol Compliance**: Structured stderr-only logging for MCP tools
- **Performance Tracking**: Built-in timing and memory pressure detection
- **Emergency Mode**: Graceful degradation under resource constraints

### Current Problems ❌
- **Inconsistent Application**: 2,891 `console.*` calls lack correlation tracking
- **Human Readability Gap**: JSON debug output in user-facing scenarios
- **Mixed Output Destinations**: Ad-hoc stdout/stderr usage
- **Session Management**: No organized file-based logging for debugging workflows

### Example Current vs Target Output
**Current**: `{'timestamp':'2025-08-04T10:42:16.478Z','level':'INFO','message':'claude-flowv2.0.0-alpha.79',...}`  
**Target**: `✅ Claude-Flow v2.0.0-alpha.79 initialized successfully [sess:abc123]`

## 2. Objectives & Acceptance Criteria

### Primary Objective
Transform CLI output to be **immediately human-readable** while maintaining **comprehensive debugging capabilities** through enhanced file and stderr logging.

### Acceptance Criteria

#### MUST Requirements
- **AC-001**: CLI commands output human-readable messages to stdout for normal operations
- **AC-002**: Detailed structured logs saved to `./claude/sessions/<command>/<date>_<session_name>.log`
- **AC-003**: Debug/verbose information available via stderr with `--verbose` flag
- **AC-004**: All CLI operations have correlation ID tracking for debugging workflows
- **AC-005**: Existing MCP protocol logging behavior completely preserved
- **AC-006**: Performance overhead remains under 5% of command execution time

#### SHOULD Requirements  
- **AC-007**: Session-based log organization with intuitive directory structure
- **AC-008**: Graceful degradation when file logging fails (console-only mode)
- **AC-009**: Progress indicators for operations longer than 3 seconds
- **AC-010**: Backward compatibility with existing ComponentLoggerFactory API

#### COULD Requirements
- **AC-011**: Environment variable configuration for log levels and formats
- **AC-012**: Log rotation and cleanup automation
- **AC-013**: Real-time correlation chain visualization

### Success Metrics
- ✅ **User Experience**: Stdout readable without technical knowledge
- ✅ **Debug Capability**: Complete operation traceability via correlation IDs
- ✅ **Performance**: <5% logging overhead, <100ms file I/O operations
- ✅ **Reliability**: System continues functioning when file logging fails

## 3. Task DAG

### Phase Dependencies & Execution Plan

| **TaskID** | **Summary** | **OwnerAgent** | **Inputs** | **Outputs** | **Phase** | **Parallelizable?** | **Exit Criteria** |
|------------|-------------|----------------|------------|-------------|-----------|-------------------|------------------|
| **SPEC-01** | Requirements Analysis | Requirements_Analyst | Current codebase, user feedback | Detailed specification | SPEC | ❌ Sequential | Requirements documented and approved |
| **SPEC-02** | Architecture Design | System_Architect | Requirements, existing logger analysis | Enhanced architecture design | DESIGN | ❌ Sequential | Architecture patterns defined |
| **SPEC-03A** | CLI Output Manager Design | Design_Architect | Architecture, user experience requirements | CLIUserLogger specification | DESIGN | ✅ Parallel | Interface contracts defined |
| **SPEC-03B** | Session Management Design | Design_Architect | File system requirements, session patterns | Session management specification | DESIGN | ✅ Parallel | Session lifecycle defined |
| **IMPL-01** | Create CLIUserLogger Class | TDD_Developer | CLI output design, existing ComponentLoggerFactory | CLIUserLogger implementation | IMPL | ❌ Sequential | Human-readable output functional |
| **IMPL-02** | Implement Session Management | TDD_Developer | Session design, file system handling | SessionManager implementation | IMPL | ✅ Parallel | Session directories auto-created |
| **IMPL-03** | Console Call Migration - Priority Files | TDD_Developer | CLIUserLogger, top 20 most-used files | Migrated priority commands | IMPL | ✅ Parallel | Priority commands use structured logging |
| **IMPL-04** | Console Call Migration - Remaining Files | TDD_Developer | CLIUserLogger, remaining 56 files | Fully migrated codebase | IMPL | ✅ Parallel | All 2,891 console calls migrated |
| **IMPL-05** | Integration Testing | Test_Specialist | All implementations | Comprehensive test suite | IMPL | ❌ Sequential | All functionality tests pass |
| **REVIEW-01** | Performance Validation | Performance_Analyst | Complete implementation | Performance report | REVIEW | ✅ Parallel | <5% overhead confirmed |
| **REVIEW-02** | MCP Compatibility Verification | Integration_Tester | MCP components, new logging | Compatibility report | REVIEW | ✅ Parallel | MCP protocol unaffected |
| **REVIEW-03** | User Experience Validation | UX_Validator | CLI output samples, user scenarios | UX approval | REVIEW | ✅ Parallel | Output meets readability standards |

### Critical Path Analysis
**SPEC-01 → SPEC-02 → (SPEC-03A + SPEC-03B) → IMPL-01 → IMPL-03 → IMPL-04 → IMPL-05**

**Estimated Timeline**: 8-12 development days with parallel execution optimizations

## 4. Design & Constraints

### Architectural Approach: **Enhancement, Not Replacement**

#### Core Principle: Dual-Stream Logging
```typescript
// Enhanced ComponentLoggerFactory with CLI facade
class CLIUserLogger {
  constructor(private debugLogger: DebugLogger) {}
  
  // Human-readable stdout
  success(message: string, meta?: CorrelationMeta): void;
  progress(message: string, meta?: ProgressMeta): void;
  error(message: string, meta?: ErrorMeta): void;
  
  // Maintain debug capabilities
  debug(data: any): void { this.debugLogger.debug(data); }
}
```

#### Session Management Architecture
```
./claude/sessions/
├── init/2025-08-05_morning-setup.log      # Command-based organization
├── swarm/2025-08-05_agent-deployment.log  # Session correlation
└── hooks/2025-08-05_pre-task-validation.log
```

### Technical Constraints

#### Preserve Existing Capabilities
- **MCP Protocol**: No changes to existing stderr-only MCP logging
- **ComponentLoggerFactory**: API remains unchanged, extended functionality
- **Correlation IDs**: Maintain existing cross-system correlation patterns
- **Performance**: Emergency mode and circular buffer patterns preserved

#### Platform Requirements
- **Cross-platform**: Windows/macOS/Linux file path handling
- **Node.js 20+**: Leverage existing async I/O patterns
- **Memory Management**: Respect existing 95% pressure threshold

#### Integration Points
- **Existing CLI Commands**: Gradual migration approach
- **Build System**: TypeScript/ESM/CommonJS dual compilation
- **MCP Server**: Zero impact on protocol compliance

## 5. Test Strategy

### Test-Driven Development Approach

#### Unit Testing Priority
1. **CLIUserLogger Class**: Human-readable formatting, correlation tracking
2. **SessionManager**: Directory creation, file naming, error handling
3. **Migration Utilities**: Console call replacement patterns
4. **Integration Points**: ComponentLoggerFactory extension behavior

#### Integration Testing Focus
- **End-to-End CLI Workflows**: Full command execution with logging verification
- **Cross-System Correlation**: claude-flow ↔ claude-code session linking
- **Performance Under Load**: High-frequency logging scenarios
- **Error Recovery**: File system failure graceful degradation

#### Test Environment Requirements
- **Existing Test Suite**: Jest with comprehensive coverage
- **Performance Benchmarks**: <5% overhead validation
- **MCP Protocol Testing**: Ensure stderr-only compliance maintained
- **Cross-Platform Testing**: Windows/macOS/Linux compatibility

### Acceptance Testing Criteria
```bash
# Human readability validation
✅ claude-flow init → "✅ Project initialized successfully"
✅ claude-flow swarm start → "🐝 Swarm activated with 5 agents"
✅ claude-flow --verbose → Detailed stderr output with [corr:abc123]

# Debug capability validation  
✅ ./claude/sessions/init/2025-08-05_setup.log contains full JSON logs
✅ Correlation IDs link stdout messages to detailed debug logs
✅ Performance overhead measured <5% in benchmarks
```

## 6. Tooling & Enforcement

### Development Tools Integration

#### Pre-commit Hooks Enhancement
```bash
# Existing hooks + new logging validation
- format: prettier --write
- lint: eslint with logging pattern detection
- typecheck: tsc --noEmit
- test: jest with logging test coverage
+ logging-check: Detect remaining console.* calls
+ correlation-check: Verify correlation ID propagation
```

#### VS Code Development Experience
```json
// .vscode/settings.json enhancements
{
  "eslint.rules": {
    "no-console": "error",  // Enforce structured logging
    "custom/require-correlation": "warn"  // Custom rule for correlation IDs
  },
  "problems.showFor": "allDocuments",  // Surface logging issues
  "search.exclude": {
    "./claude/sessions/**": true  // Exclude log files from search
  }
}
```

#### Build Integration
- **TypeScript**: Strict mode with logging interface compliance
- **ESLint**: Custom rules for console call detection
- **Jest**: Logging behavior test coverage requirements

### MCP & Agent Integration Hygiene

#### Agent Coordination Patterns
```typescript
// Standard agent logging pattern
class AgentImplementation {
  constructor(private cliLogger: CLIUserLogger) {}
  
  async executeTask() {
    this.cliLogger.progress("🔄 Processing task...");
    // Complex logic with debug logging
    this.cliLogger.success("✅ Task completed");
  }
}
```

#### MCP Server Compatibility
- **Zero Impact**: Preserve existing MCP protocol stderr logging
- **Extension**: Add CLI user experience layer without MCP changes
- **Testing**: Comprehensive MCP compatibility validation

## 7. Risks & Mitigations

### Risk Register & Response Strategies

| **Risk** | **Probability** | **Impact** | **Mitigation Strategy** |
|----------|-----------------|------------|-------------------------|
| **MCP Protocol Breaking Changes** | Low | Critical | Preserve existing DebugLogger behavior completely; comprehensive MCP regression testing |
| **Performance Degradation** | Medium | High | Implement async batching; leverage existing emergency mode; performance benchmarking in CI |
| **Console Migration Errors** | Medium | Medium | Gradual migration approach; comprehensive testing; rollback capability |
| **File System Permission Issues** | High | Low | Graceful degradation to console-only mode; fallback directory patterns |
| **Backward Compatibility Issues** | Low | High | API extension rather than modification; comprehensive regression testing |
| **Memory Pressure from Logging** | Medium | Medium | Leverage existing circular buffer; emergency mode activation |

### Detailed Mitigation Plans

#### Performance Risk Mitigation
```typescript
// Async batching implementation
class AsyncLogWriter {
  private batch: LogEntry[] = [];
  private flushInterval = 100; // ms
  
  async write(entry: LogEntry) {
    this.batch.push(entry);
    if (this.batch.length > 100) await this.flush();
  }
}
```

#### Compatibility Risk Mitigation
```typescript
// API extension pattern
interface ComponentLoggerFactory {
  getCLILogger(correlationId: string): DebugLogger;  // Existing
  getCLIUserLogger(correlationId: string): CLIUserLogger;  // New
}
```

## 8. Gate & Exit Criteria

### Phase Completion Gates

#### SPEC Phase Exit Criteria ✅
- [x] **Requirements Analysis**: Complete functional and non-functional requirements documented
- [x] **Architecture Design**: Dual-stream logging approach validated
- [x] **Risk Assessment**: All major risks identified with mitigation strategies
- [x] **Test Strategy**: Comprehensive testing approach defined
- [x] **Technical Validation**: Existing infrastructure analysis complete

#### DESIGN Phase Entry Criteria
- [ ] **Stakeholder Approval**: Requirements and architecture approved
- [ ] **Technical Feasibility**: Prototype validation of dual-stream approach
- [ ] **Resource Allocation**: Development team and timeline confirmed

#### IMPL Phase Entry Criteria  
- [ ] **Detailed Design**: Complete interface specifications and implementation plans
- [ ] **Test Cases**: Comprehensive test suite designed and approved
- [ ] **Development Environment**: Enhanced tooling and CI/CD pipeline ready

#### REVIEW Phase Entry Criteria
- [ ] **Feature Complete**: All functional requirements implemented
- [ ] **Test Coverage**: >95% code coverage with comprehensive integration tests
- [ ] **Performance Validation**: <5% overhead confirmed in benchmarks

### Production Readiness Criteria

#### Deployment Gates
```bash
✅ All existing tests pass (zero regression)
✅ New functionality tests achieve >95% coverage  
✅ Performance benchmarks confirm <5% overhead
✅ MCP protocol compatibility verified
✅ Cross-platform testing complete (Windows/macOS/Linux)
✅ Documentation updated with new CLI patterns
```

#### Rollback Readiness
- **Feature Flags**: Environment variable to disable new logging behavior
- **Emergency Mode**: Automatic fallback to existing console behavior under failure
- **Monitoring**: Real-time detection of logging system issues

## 9. Open Questions (Maximum 5)

### Critical Design Decisions Required

1. **Session Naming Strategy**: Should session names be auto-generated from command context, user-provided via `--session-name`, or hybrid approach with intelligent defaults?

2. **Log Retention Policy**: What are the requirements for log file rotation, cleanup, and retention? Should this be configurable or have opinionated defaults?

3. **Progress Indicator Granularity**: For long-running operations (swarm initialization, file processing), what level of progress detail is optimal for user experience without overwhelming output?

4. **Error Message Actionability**: Should error messages include direct links to relevant documentation or troubleshooting guides, and how should this integrate with existing error handling patterns?

5. **Configuration Override Precedence**: When environment variables, CLI flags, and config files conflict for logging behavior, what should be the precedence order and how should conflicts be resolved?

### Implementation Guidance Needed

- **Priority Command Identification**: Which of the 76 files with console calls should be migrated first based on user impact and usage frequency?
- **Correlation ID Display**: Should shortened correlation IDs always be visible in user output, or only in verbose mode?

---

## **Final Validation & Next Steps**

### **Planning Phase Completion ✅**

This SPEC roadmap provides a comprehensive foundation for implementing enhanced CLI logging while:
- **Leveraging Existing Strengths**: Building upon sophisticated ComponentLoggerFactory architecture
- **Minimizing Risk**: Incremental enhancement approach with preserved backward compatibility  
- **Maximizing Impact**: Addressing the core user experience gap with minimal disruption
- **Ensuring Quality**: Comprehensive testing and validation strategy

### **Recommended Implementation Approach**

1. **Start Small**: Begin with 5-10 most frequently used CLI commands
2. **Prove Value**: Demonstrate human-readable output improvement
3. **Scale Systematically**: Gradual migration of remaining console calls
4. **Monitor Impact**: Performance and compatibility validation throughout

The project's existing logging infrastructure is remarkably sophisticated. This enhancement focuses on making that power accessible to end users through improved CLI experience while maintaining the debugging capabilities that make claude-flow enterprise-ready.

**Ready for DESIGN phase initiation.**