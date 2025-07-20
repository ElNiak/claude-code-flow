# Precommit Phase 2 Transition Guide

**Status**: Ready for Phase 2 Activation
**Timeline**: Week 3-4 of Merger Implementation
**Risk Level**: Low (well-tested, gradual enforcement)

## Phase 2 Overview

Phase 2 introduces **structure enforcement** while maintaining development velocity. Unlike Phase 1's suggestions-only approach, Phase 2 will **block commits** that violate project organization standards.

### Key Changes in Phase 2

```bash
# Activation
export PRECOMMIT_PHASE=2

# What gets enforced:
- docs/ directory structure requirements
- analysis/ file organization rules
- Root-level clutter prevention
- Stricter file naming conventions
```

## Pre-Activation Checklist

### ✅ Prerequisites (Completed)
- [x] Phase 1 system operational
- [x] Baseline security scanning working
- [x] Team familiar with current warnings
- [x] File organization helpers active
- [x] Merger compatibility system tested

### 🔄 Before Phase 2 Activation

1. **Team Communication**
   ```bash
   # Notify team 1 week before activation
   # Share this guide and migration timeline
   # Ensure everyone understands new requirements
   ```

2. **Test Phase 2 Locally**
   ```bash
   export PRECOMMIT_PHASE=2
   pre-commit run --all-files
   # Check for any unexpected failures
   ```

3. **Clean Current Violations**
   ```bash
   # Run file organization helpers
   node scripts/file-organization-helper.js

   # Fix any structure violations
   node scripts/enforce-docs-structure.js
   node scripts/enforce-analysis-structure.js
   ```

## Phase 2 Enforcement Rules

### 📁 docs/ Structure Enforcement

**Rule**: All documentation must follow standardized structure

```
docs/
├── guides/          # User guides and tutorials
├── api/             # API documentation
├── architecture/    # System design docs
├── deployment/      # Deployment guides
└── troubleshooting/ # Problem resolution
```

**Enforcement**:
- Blocks commits that add docs outside structure
- Suggests correct location for new documentation
- Validates markdown frontmatter

### 📊 analysis/ Structure Enforcement

**Rule**: Analysis files must be properly categorized

```
analysis/
├── performance/     # Performance analysis
├── security/        # Security audits
├── code-quality/    # Quality metrics
└── reports/         # Generated reports
```

**Enforcement**:
- Validates JSON schema for analysis files
- Ensures proper metadata headers
- Blocks uncategorized analysis files

### 🚫 Root-Level Clutter Prevention

**Rule**: No new files in project root except approved types

```
# Allowed in root:
- package.json, README.md, LICENSE
- Configuration files (.gitignore, .pre-commit-config.yaml)
- Core scripts (package scripts only)

# Blocked in root:
- Random markdown files
- Temporary analysis files
- Development notes
- Test files
```

**Enforcement**:
- Blocks new root-level .md or .json files
- Suggests appropriate subdirectory
- Exceptions for approved file patterns

## Migration Strategy

### Week 3 (Soft Launch)
```bash
# Day 1-2: Internal team testing
export PRECOMMIT_PHASE=2
# Test with current codebase
# Fix any existing violations

# Day 3-4: Limited rollout
# Enable for new commits only
# Monitor for issues

# Day 5-7: Full activation
# All commits require Phase 2 compliance
# Support team for questions
```

### Week 4 (Stabilization)
```bash
# Monitor and adjust
# Collect feedback
# Fine-tune rules if needed
# Prepare for Phase 3
```

## Troubleshooting Phase 2

### Common Issues

1. **Documentation Structure Violations**
   ```bash
   # Error: "docs/my-notes.md violates structure"
   # Solution: Move to docs/guides/my-notes.md

   git mv docs/my-notes.md docs/guides/my-notes.md
   ```

2. **Analysis File Placement**
   ```bash
   # Error: "analysis/temp-report.json needs categorization"
   # Solution: Move to appropriate subdirectory

   git mv analysis/temp-report.json analysis/reports/temp-report.json
   ```

3. **Root Clutter Blocking**
   ```bash
   # Error: "Root-level TODO.md not allowed"
   # Solution: Move to docs/guides/

   git mv TODO.md docs/guides/development-todo.md
   ```

### Override Mechanisms

For legitimate exceptions:
```bash
# Temporary bypass (use sparingly)
git commit --no-verify -m "fix: emergency hotfix"

# Or adjust .pre-commit-config.yaml temporarily
# (Remember to revert after commit)
```

## Phase 2 Benefits

### ✅ Improved Organization
- Consistent documentation structure
- Predictable file locations
- Easier navigation for new team members
- Better tooling integration

### ✅ Reduced Maintenance
- Automated structure enforcement
- Less manual file organization
- Cleaner project root
- Better merge conflict resolution

### ✅ Enterprise Readiness
- Professional project structure
- Compliance-ready organization
- Scalable file management
- Tool-friendly layout

## Rollback Plan

If Phase 2 causes significant issues:

```bash
# Immediate rollback
export PRECOMMIT_PHASE=1

# Or disable specific hooks temporarily
# Edit .pre-commit-config.yaml:
# Comment out problematic Phase 2 hooks
```

## Phase 3 Preview

Coming in weeks 5-6:
- Test coverage enforcement (70% minimum)
- Performance regression checks
- Strict security audits
- Documentation completeness validation

## Support and Resources

- **Phase 2 Help**: Check this guide first
- **File Organization**: `node scripts/file-organization-helper.js`
- **Structure Validation**: `node scripts/validate-cleanup.js`
- **Team Questions**: Internal chat or GitHub issues

## Success Metrics

Track Phase 2 effectiveness:
- Commit failure rate (target: <5%)
- Time to resolve structure violations (target: <2 minutes)
- Team satisfaction (survey after week 1)
- File organization compliance (target: 95%+)

---

**Remember**: Phase 2 is about **enforcing good practices**, not blocking productivity. If rules seem too strict, we can adjust them based on real-world usage.
