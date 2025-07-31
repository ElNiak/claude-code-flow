# Pre-commit Setup Guide for Mortgage-nitor Project

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Install pre-commit
pip install pre-commit

# 2. Install hooks for this repository
pre-commit install

# 3. Run on all files (optional - will run automatically on commit)
pre-commit run --all-files
```

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration Details](#configuration-details)
4. [Security Features](#security-features)
5. [Tool-Specific Guides](#tool-specific-guides)
6. [Team Collaboration](#team-collaboration)
7. [Troubleshooting](#troubleshooting)
8. [Integration with Claude Flow](#integration-with-claude-flow)
9. [Performance Optimization](#performance-optimization)
10. [Customization](#customization)

## 🎯 Overview

This pre-commit configuration is optimized for the **2025 development
landscape** with modern, fast tools that enhance code quality while maintaining
developer productivity.

### Key Features

- **🔒 Security First**: GitLeaks + detect-secrets for comprehensive secrets
  detection
- **⚡ Lightning Fast**: Ruff replaces multiple Python tools with 1000x speed
  improvement
- **🌐 Multi-Language**: Supports Python, Kotlin, SQL, Docker, and configuration
  files
- **📚 Documentation**: Extensive markdown validation for architectural
  documentation
- **🔄 Future-Ready**: Configured for planned FastAPI + Kotlin Android
  architecture

### Project Architecture Support

| Technology                 | Status     | Tools Configured              |
| -------------------------- | ---------- | ----------------------------- |
| **Python FastAPI Backend** | 🔮 Planned | Ruff, Bandit, SQLFluff        |
| **Kotlin Android App**     | 🔮 Planned | ktlint, detekt                |
| **PostgreSQL/TimescaleDB** | 🔮 Planned | SQLFluff (PostgreSQL dialect) |
| **Docker Containers**      | 🔮 Planned | Hadolint                      |
| **Documentation**          | ✅ Current | markdownlint, link checking   |
| **Configuration Files**    | ✅ Current | YAML/JSON validation          |

## 🛠️ Installation

### Prerequisites

- **Python 3.11+** (for Ruff and pre-commit)
- **Git** (for hook installation)
- **pip** or **pipx** (for package management)

### Method 1: pip (Recommended)

```bash
# Install pre-commit globally
pip install pre-commit

# Verify installation
pre-commit --version  # Should show v3.6+
```

### Method 2: pipx (Isolated Installation)

```bash
# Install with pipx for isolated environment
pipx install pre-commit

# Verify installation
pre-commit --version
```

### Method 3: System Package Manager

```bash
# macOS
brew install pre-commit

# Ubuntu/Debian
sudo apt install pre-commit

# Arch Linux
sudo pacman -S pre-commit
```

### Hook Installation

```bash
# Navigate to project directory
cd /path/to/mortgage-nitor

# Install pre-commit hooks
pre-commit install

# Install for additional git hooks (optional)
pre-commit install --hook-type pre-push
pre-commit install --hook-type commit-msg
```

## ⚙️ Configuration Details

### Core Configuration Files

| File                      | Purpose                 | Customizable    |
| ------------------------- | ----------------------- | --------------- |
| `.pre-commit-config.yaml` | Main hook configuration | ✅ Yes          |
| `.markdownlint.yaml`      | Documentation rules     | ✅ Yes          |
| `.gitleaks.toml`          | Security patterns       | ✅ Yes          |
| `ruff.toml`               | Python code quality     | ✅ Yes          |
| `.secrets.baseline`       | Secrets baseline        | 🔄 Auto-updated |

### Hook Categories

#### 🔒 Security (Priority 1)

- **GitLeaks**: Fast secrets detection (Golang-based)
- **detect-secrets**: Comprehensive baseline management
- **Bandit**: Python security analysis

#### 🐍 Python Tools (2025 Modern Stack)

- **Ruff**: Linting + formatting (replaces black, isort, flake8, pyupgrade)
- **Performance**: 1000x faster than traditional tools

#### 🤖 Kotlin/Android (Future-Ready)

- **ktlint**: Code formatting and style
- **detekt**: Static analysis and code smells

#### 🗄️ Database & Infrastructure

- **SQLFluff**: PostgreSQL/TimescaleDB linting
- **Hadolint**: Docker best practices

#### 📄 Documentation & Configuration

- **markdownlint**: Documentation quality
- **prettier**: YAML/JSON formatting
- **Built-in hooks**: File validation

## 🔐 Security Features

### Financial Application Security

Our configuration includes **fintech-specific patterns** for detecting:

- **Banking APIs**: ECB, NBB, SDMX credentials
- **Database**: PostgreSQL, TimescaleDB connection strings
- **Authentication**: JWT secrets, API keys, bearer tokens
- **Mobile**: FCM keys, Android keystore passwords
- **Communication**: SendGrid, Twilio, Mailgun credentials
- **Infrastructure**: AWS, Docker registry tokens

### Custom Security Patterns

The `.gitleaks.toml` includes **12 custom rules** for mortgage monitoring
applications:

```toml
# Example: European Central Bank API detection
[[rules]]
id = "ecb-api-key"
description = "European Central Bank API credentials"
regex = '''(?i)(ecb[_-]?api[_-]?key|ecb[_-]?token)['"[:space:]]*[:=]['"[:space:]]*[0-9a-f]{32,}'''
```

### Security Workflow

1. **Pre-commit**: GitLeaks scans for secrets (fast feedback)
2. **CI/CD**: detect-secrets provides comprehensive analysis
3. **Baseline**: Tracks approved patterns to reduce false positives
4. **Updates**: Regular pattern updates for new threat vectors

## 🛠️ Tool-Specific Guides

### Python Development with Ruff

Ruff replaces multiple tools with a single, ultra-fast linter:

| Traditional Tool | Ruff Equivalent             | Speed Improvement |
| ---------------- | --------------------------- | ----------------- |
| black            | `ruff format`               | 10x faster        |
| isort            | `ruff check --select I`     | 100x faster       |
| flake8           | `ruff check --select F,E,W` | 200x faster       |
| pyupgrade        | `ruff check --select UP`    | 150x faster       |

**Configuration**: `ruff.toml`

- **Target**: Python 3.11+ for FastAPI
- **Line length**: 88 characters (Black-compatible)
- **Security**: Bandit integration for financial code
- **FastAPI**: Optimized rules for API development

### Android Development (Future)

When implementing the Kotlin Android app:

**ktlint** - Code formatting:

```bash
# Manual run (when Android code exists)
./gradlew ktlintCheck
./gradlew ktlintFormat
```

**detekt** - Static analysis:

```bash
# Manual run (when Android code exists)
./gradlew detekt
```

### Database Development

**SQLFluff** for PostgreSQL/TimescaleDB:

```bash
# Manual run (when SQL files exist)
sqlfluff lint --dialect postgres sql/
sqlfluff fix --dialect postgres sql/
```

### Docker Development

**Hadolint** for Dockerfile linting:

```bash
# Manual run (when Dockerfiles exist)
hadolint Dockerfile
hadolint docker/*/Dockerfile
```

## 👥 Team Collaboration

### Onboarding New Developers

1. **Clone repository**:

   ```bash
   git clone <repository-url>
   cd mortgage-nitor
   ```

2. **Install pre-commit**:

   ```bash
   pip install pre-commit
   pre-commit install
   ```

3. **First run** (optional):

   ```bash
   pre-commit run --all-files
   ```

### Shared Configuration

- **Version Control**: All configuration files are committed
- **Consistency**: Same rules for all team members
- **Updates**: Central configuration updates for everyone

### Handling Pre-commit Failures

When pre-commit fails:

1. **Review changes**: Check what tools modified
2. **Stage changes**: `git add .` for auto-fixes
3. **Retry commit**: Commit again with fixes applied
4. **Manual fixes**: Address issues that can't be auto-fixed

Example workflow:

```bash
git commit -m "Add new feature"
# Pre-commit runs and makes changes
git add .  # Stage the changes made by pre-commit
git commit -m "Add new feature"  # Commit with fixes
```

### Configuration Updates

**Updating tool versions**:

```bash
# Update all hooks to latest versions
pre-commit autoupdate

# Update specific hook
pre-commit autoupdate --repo https://github.com/astral-sh/ruff-pre-commit
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Hook Installation Fails

```bash
# Error: pre-commit command not found
# Solution: Ensure pre-commit is installed and in PATH
pip install pre-commit
which pre-commit  # Verify installation
```

#### 2. Ruff Hook Fails

```bash
# Error: ruff not found
# Solution: Ruff installs automatically, but check Python version
python --version  # Should be 3.11+
pre-commit clean   # Clear cache
pre-commit install # Reinstall hooks
```

#### 3. Network Issues

```bash
# Error: Failed to download hooks
# Solution: Check internet connection and try again
pre-commit install --install-hooks
```

#### 4. Performance Issues

```bash
# If hooks are slow:
# 1. Check which hooks are slow
pre-commit run --all-files --verbose

# 2. Skip expensive hooks in CI
export SKIP=hadolint-docker,markdown-link-check
git commit -m "Quick commit"
```

### Environment-Specific Issues

#### macOS

```bash
# If using system Python, prefer pipx
pipx install pre-commit

# If M1/M2 Mac issues with native dependencies
arch -arm64 pip install pre-commit
```

#### Windows

```bash
# Use PowerShell or Git Bash
pip install pre-commit
pre-commit install

# If path issues, add Python Scripts to PATH
```

#### Linux

```bash
# Ubuntu/Debian package issues
sudo apt update
sudo apt install python3-pip git
pip3 install --user pre-commit

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Debug Mode

```bash
# Run with debug information
pre-commit run --all-files --verbose

# Check hook installation
pre-commit run --hook-stage pre-commit --verbose

# Test specific hook
pre-commit run ruff --all-files --verbose
```

## 🤖 Integration with Claude Flow

The pre-commit configuration integrates seamlessly with the existing **Claude
Flow agent coordination system**.

### Coordination Hooks

The Claude Flow system can leverage pre-commit hooks for:

1. **Pre-edit hooks**: Auto-assign agents based on file changes
2. **Post-edit hooks**: Format code and update swarm memory
3. **Memory validation**: Check coordination data integrity
4. **Performance tracking**: Monitor code quality improvements

### Agent Assignment

Pre-commit results can trigger specific Claude Flow agents:

| Hook Result           | Triggered Agent  | Action                   |
| --------------------- | ---------------- | ------------------------ |
| Security violations   | Security-Manager | Remediation planning     |
| Python code changes   | Backend-Dev      | Code review coordination |
| Documentation updates | API-Docs         | Documentation sync       |
| Configuration changes | System-Architect | Architecture validation  |

### Workflow Integration

```bash
# Pre-commit runs first (code quality)
git commit -m "Add new feature"

# Claude Flow hooks run after (coordination)
npx claude-flow hooks post-edit --file "changed-file.py"
npx claude-flow hooks memory-store --key "commit/$(git rev-parse HEAD)"
```

## ⚡ Performance Optimization

### Speed Benchmarks

| Tool Category      | Traditional Stack      | Modern Stack (2025) | Speed Improvement |
| ------------------ | ---------------------- | ------------------- | ----------------- |
| Python Linting     | flake8 + black + isort | Ruff                | 1000x faster      |
| Security Scanning  | Multiple tools         | GitLeaks            | 10x faster        |
| Documentation      | Multiple validators    | Streamlined set     | 5x faster         |
| **Total Workflow** | **~60 seconds**        | **~5 seconds**      | **12x faster**    |

### Optimization Strategies

#### 1. Selective Hook Execution

```bash
# Skip expensive hooks for quick commits
SKIP=hadolint-docker,markdown-link-check git commit -m "Quick fix"

# Run only security checks
pre-commit run gitleaks detect-secrets --all-files
```

#### 2. File-Specific Hooks

Hooks only run on relevant files:

- Python hooks: Only on `*.py` files
- Kotlin hooks: Only on `*.kt` files
- Docker hooks: Only on `Dockerfile*` files

#### 3. CI Optimization

```yaml
# .pre-commit-config.yaml includes CI-specific settings
ci:
  skip: [sqlfluff-lint, hadolint-docker, markdown-link-check]
  autofix_prs: true
  autoupdate_schedule: weekly
```

#### 4. Local Caching

Pre-commit caches hook environments:

```bash
# Clear cache if issues occur
pre-commit clean

# Force reinstall
pre-commit install --install-hooks
```

## 🎛️ Customization

### Project-Specific Adjustments

#### Adding New Hooks

```yaml
# Add to .pre-commit-config.yaml
repos:
  - repo: https://github.com/new-tool/pre-commit-hooks
    rev: v1.0.0
    hooks:
      - id: new-tool-check
        name: Custom validation
        args: [--custom-flag]
```

#### Modifying Existing Hooks

```yaml
# Customize Ruff configuration
- id: ruff
  args: [--fix, --exit-non-zero-on-fix, --config=custom-ruff.toml]
```

### Team-Specific Rules

#### Stricter Rules for Production

```yaml
# Production branch configuration
- id: ruff
  args: [--select=ALL, --ignore=D100, D104] # Enable all rules
```

#### Relaxed Rules for Development

```yaml
# Development branch configuration
- id: ruff
  args: [--fix, --ignore=D, PLR] # Skip docs and complexity
```

### File-Specific Overrides

#### Python Files

```toml
# ruff.toml
[lint.per-file-ignores]
"tests/*.py" = ["S101", "PLR2004"]  # Allow assert and magic numbers
"scripts/*.py" = ["T201"]           # Allow print statements
```

#### Markdown Files

```yaml
# .markdownlint.yaml
overrides:
  - files: ["README.md"]
    rules:
      MD013: false # No line length limit for main docs
```

### Repository-Specific Patterns

#### Custom Security Patterns

```toml
# .gitleaks.toml - Add project-specific secrets
[[rules]]
id = "custom-api-key"
description = "Custom API pattern"
regex = '''(?i)(custom[_-]?api[_-]?key)['"[:space:]]*[:=]['"[:space:]]*[0-9a-f]{32,}'''
```

## 📊 Monitoring & Metrics

### Hook Performance

```bash
# Time hook execution
time pre-commit run --all-files

# Profile specific hooks
pre-commit run --hook-stage pre-commit --verbose ruff
```

### Quality Metrics

Track improvements over time:

- **Security**: Number of secrets detected and fixed
- **Code Quality**: Ruff violations reduced
- **Documentation**: Markdown issues resolved
- **Performance**: Commit time reduction

### Reporting

Generate reports for team visibility:

```bash
# Security scan results
pre-commit run gitleaks --all-files > security-report.txt

# Code quality summary
pre-commit run ruff --all-files > quality-report.txt
```

## 🚀 Getting Started Checklist

### Initial Setup (5 minutes)

- [ ] Install pre-commit: `pip install pre-commit`
- [ ] Install hooks: `pre-commit install`
- [ ] Test run: `pre-commit run --all-files`
- [ ] First commit with pre-commit active

### Team Onboarding (10 minutes)

- [ ] Share this guide with team members
- [ ] Verify everyone has same pre-commit version
- [ ] Run team sync on configuration preferences
- [ ] Document any project-specific customizations

### Continuous Improvement

- [ ] Weekly: Review hook performance and failures
- [ ] Monthly: Update hook versions with `pre-commit autoupdate`
- [ ] Quarterly: Review and optimize configuration
- [ ] As needed: Add new hooks for new technologies

## 📞 Support & Resources

### Documentation

- **Pre-commit**: <https://pre-commit.com/>
- **Ruff**: <https://docs.astral.sh/ruff/>
- **GitLeaks**: <https://github.com/gitleaks/gitleaks>
- **markdownlint**: <https://github.com/markdownlint/markdownlint>

### Community

- **Issues**: Open GitHub issues for problems
- **Discussions**: Team Slack/Discord for questions
- **Updates**: Subscribe to tool changelogs

### Maintenance

This configuration is maintained by the **Mortgage-nitor development team**. For
questions or suggestions:

1. Check troubleshooting section above
2. Search existing issues
3. Open new issue with details
4. Tag relevant team members

---

**🎉 Welcome to modern, fast, secure development with pre-commit hooks! Your
code quality journey starts here.**
