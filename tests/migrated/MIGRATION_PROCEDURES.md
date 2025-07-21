# Test Migration Procedures

## Quick Start Guide

### 1. Complete Migration (Recommended)
```bash
# Run full migration with validation
node scripts/migrate-tests.js --verbose
node scripts/validate-migrated-tests.js
npm test -- --testPathPattern=migrated
```

### 2. Incremental Migration
```bash
# Migrate specific test types
node scripts/migrate-unit-tests.js
node scripts/migrate-integration-tests.js
node scripts/validate-migrated-tests.js
```

### 3. Safe Migration with Preview
```bash
# Preview changes without applying
node scripts/migrate-tests.js --dry-run --verbose

# Apply migration
node scripts/migrate-tests.js

# Validate results
node scripts/validate-migrated-tests.js
```

## Migration Checklist

### Pre-Migration
- [ ] Backup original test files
- [ ] Ensure Jest is properly configured
- [ ] Review test file structure
- [ ] Check dependencies

### Migration Execution
- [ ] Run migration script
- [ ] Review migration report
- [ ] Check for conversion errors
- [ ] Validate file structure

### Post-Migration Validation
- [ ] Run syntax validation
- [ ] Execute Jest dry-run
- [ ] Test sample files
- [ ] Review warnings

### Testing and Integration
- [ ] Run full Jest test suite
- [ ] Check coverage reports
- [ ] Validate CI/CD pipeline
- [ ] Update documentation

## Emergency Procedures

### Rollback Migration
```bash
# Rollback all changes
node scripts/migrate-tests.js --rollback

# Manual rollback from backup
cp -r tests/backup/* tests/
```

### Recovery from Failed Migration
```bash
# Clean migration directory
rm -rf tests/migrated/*

# Re-run with safe options
node scripts/migrate-tests.js --dry-run
node scripts/migrate-tests.js --force
```

## Advanced Usage

### Custom Migration Options
```bash
# Specify directories
node scripts/migrate-tests.js \
  --source-dir ./custom/tests \
  --target-dir ./custom/migrated \
  --backup-dir ./custom/backup

# Force overwrite existing files
node scripts/migrate-tests.js --force

# Skip validation
node scripts/migrate-tests.js --no-validate
```

### Batch Processing
```bash
# Process multiple directories
for dir in tests/unit tests/integration tests/e2e; do
  node scripts/migrate-tests.js --source-dir $dir --verbose
done
```

## Monitoring and Maintenance

### Regular Validation
```bash
# Weekly validation check
node scripts/validate-migrated-tests.js --verbose

# Generate fresh reports
node scripts/migrate-tests.js --report-only
```

### Performance Monitoring
```bash
# Time migration process
time node scripts/migrate-tests.js

# Memory usage monitoring
NODE_OPTIONS="--max-old-space-size=4096" node scripts/migrate-tests.js
```

## Integration with Development Workflow

### Git Integration
```bash
# Create migration branch
git checkout -b test-migration

# Commit migration results
git add tests/migrated/
git commit -m "feat: migrate tests from Deno to Jest"

# Review changes
git diff --name-status
```

### CI/CD Integration
```yaml
# .github/workflows/test-migration.yml
name: Test Migration Validation
on: [push, pull_request]
jobs:
  validate-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: node scripts/validate-migrated-tests.js
      - run: npm test -- --testPathPattern=migrated
```

## Troubleshooting Guide

### Common Error Resolution

#### "Migration directory not found"
```bash
mkdir -p tests/migrated/{unit,integration,e2e,utils}
```

#### "Jest configuration missing"
```bash
# Check Jest config
cat jest.config.js | grep migrated

# Add migrated tests to config
npm run test -- --init
```

#### "TypeScript compilation errors"
```bash
# Check TypeScript config
npx tsc --noEmit tests/migrated/**/*.ts

# Fix import paths
sed -i 's/\.ts"/\.js"/g' tests/migrated/**/*.ts
```

#### "Import resolution failures"
```bash
# Update Jest moduleNameMapper
# Add to jest.config.js:
# "^@migrated/(.*)$": "<rootDir>/tests/migrated/$1"
```

### Performance Issues

#### Slow migration
```bash
# Use parallel processing
NODE_OPTIONS="--max-old-space-size=8192" node scripts/migrate-tests.js

# Process smaller batches
node scripts/migrate-tests.js --batch-size 10
```

#### Memory issues
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
node scripts/migrate-tests.js
```

## Quality Assurance

### Validation Levels

#### Level 1: Basic Validation
- File structure check
- Syntax validation
- Import verification

#### Level 2: Comprehensive Validation
- Jest compatibility
- Test execution dry-run
- Coverage analysis

#### Level 3: Integration Validation
- Full test suite execution
- CI/CD pipeline test
- Performance benchmarking

### Manual Review Points

#### Critical Review Areas
- Complex async patterns
- Custom assertion functions
- Mock implementations
- File system operations
- Platform-specific code

#### Review Checklist
- [ ] Test logic preserved
- [ ] Assertions converted correctly
- [ ] Async patterns handled
- [ ] Imports resolved
- [ ] Mocks functional

## Best Practices

### Migration Strategy
1. **Start Small**: Migrate a few test files first
2. **Test Early**: Validate each migration step
3. **Document Changes**: Track manual modifications
4. **Preserve History**: Keep original tests until confident
5. **Team Communication**: Coordinate with team members

### Code Quality
- Follow Jest conventions
- Use TypeScript types
- Maintain test isolation
- Preserve test intent
- Document complex conversions

### Maintenance
- Regular validation runs
- Update migration scripts
- Monitor performance
- Track migration metrics
- Keep documentation current

## Support and Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Jest Setup](https://jestjs.io/docs/getting-started#using-typescript)
- [Migration Helpers API](./utils/migration-helpers.ts)

### Commands Reference
```bash
# Migration commands
node scripts/migrate-tests.js [options]
node scripts/migrate-unit-tests.js [options]
node scripts/migrate-integration-tests.js [options]

# Validation commands
node scripts/validate-migrated-tests.js [options]

# Test execution
npm test -- --testPathPattern=migrated
npx jest tests/migrated/

# Utilities
npm run test:coverage -- --testPathPattern=migrated
npm run test:watch -- --testPathPattern=migrated
```

### Options Reference
- `--dry-run`: Preview changes without applying
- `--verbose`: Detailed output
- `--force`: Overwrite existing files
- `--rollback`: Undo migration
- `--source-dir <path>`: Custom source directory
- `--target-dir <path>`: Custom target directory
- `--backup-dir <path>`: Custom backup directory

---

**Emergency Contact**: Test Migration Infrastructure Agent
**Last Updated**: 2025-07-20
**Version**: 1.0.0
