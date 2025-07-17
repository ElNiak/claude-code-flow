#!/bin/bash

# Selective File Restoration Script with Dry-Run Mode
# Restores missing files from commit 434d2a2 while preserving TypeScript fixes

set -e

COMMIT="434d2a2"
DRY_RUN=false
VERBOSE=false
RESTORE_LIST="/tmp/missing_files_to_restore.txt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -d, --dry-run     Show what would be restored without actually doing it"
    echo "  -v, --verbose     Show detailed output"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 --dry-run      # Preview what files would be restored"
    echo "  $0 --verbose      # Restore with detailed output"
    echo "  $0                # Restore files (default mode)"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to check if a file should be preserved (has TypeScript fixes)
should_preserve_file() {
    local file="$1"

    # Critical files that contain TypeScript fixes - DO NOT RESTORE
    local preserve_patterns=(
        "package.json"
        "package-lock.json"
        "tsconfig.json"
        "src/"
        "bin/claude-flow"
        ".gitignore"
        ".hive-mind/config.json"
        ".hive-mind/memory.db"
        "CLAUDE.md"
        "README.md"
        "docs/known-issues.md"
        "docs/troubleshooting/"
        "examples/"
        "scripts/"
        "tests/"
    )

    for pattern in "${preserve_patterns[@]}"; do
        if [[ "$file" == *"$pattern"* ]]; then
            return 0  # Should preserve (don't restore)
        fi
    done

    return 1  # Can restore
}

# Function to check if a file is safe to restore
is_safe_to_restore() {
    local file="$1"

    # Only restore these specific categories of files
    local safe_patterns=(
        ".claude/commands/"
        ".roo/"
        ".roomodes"
        ".serena/"
        "benchmark/"
        "current_tasks/"
        "docs/"
        "*.md"
        "*.json"
        "assets/"
        "config/"
        "LICENSE"
        "CHANGELOG.md"
        ".github/"
        ".releaserc.json"
        ".npmignore"
        "codecov.yml"
        "data/"
        "docker/"
    )

    for pattern in "${safe_patterns[@]}"; do
        if [[ "$file" == *"$pattern"* ]] || [[ "$file" == $pattern ]]; then
            return 0  # Safe to restore
        fi
    done

    return 1  # Not safe to restore
}

# Create list of files to restore
create_restore_list() {
    log_info "Analyzing files to restore..."

    # Get files from commit 434d2a2
    git ls-tree -r --name-only "$COMMIT" | sort > /tmp/commit_files.txt

    # Get current files
    find . -type f | grep -v "\.git/" | grep -v "node_modules/" | sed 's|^\./||' | sort > /tmp/current_files.txt

    # Find missing files
    comm -23 /tmp/commit_files.txt /tmp/current_files.txt > /tmp/missing_files.txt

    # Filter to only safe files that should be restored
    > "$RESTORE_LIST"
    while IFS= read -r file; do
        if should_preserve_file "$file"; then
            if [[ "$VERBOSE" == true ]]; then
                log_warning "Preserving (has fixes): $file"
            fi
            continue
        fi

        if is_safe_to_restore "$file"; then
            echo "$file" >> "$RESTORE_LIST"
            if [[ "$VERBOSE" == true ]]; then
                log_info "Will restore: $file"
            fi
        else
            if [[ "$VERBOSE" == true ]]; then
                log_warning "Skipping (not safe): $file"
            fi
        fi
    done < /tmp/missing_files.txt

    local total_missing=$(wc -l < /tmp/missing_files.txt)
    local total_to_restore=$(wc -l < "$RESTORE_LIST")
    local total_preserved=$((total_missing - total_to_restore))

    log_info "Missing files analysis:"
    log_info "  Total missing: $total_missing"
    log_info "  Safe to restore: $total_to_restore"
    log_info "  Preserved (has fixes): $total_preserved"
}

# Preview what would be restored
preview_restore() {
    log_info "=== DRY RUN MODE ==="
    log_info "The following files would be restored:"
    echo ""

    local count=0
    while IFS= read -r file; do
        count=$((count + 1))
        echo "  $count. $file"
    done < "$RESTORE_LIST"

    echo ""
    log_info "Total files to restore: $count"
    log_warning "This is a dry run. No files were actually restored."
    log_info "Run without --dry-run to perform the actual restoration."
}

# Restore files
restore_files() {
    log_info "Starting file restoration..."

    local count=0
    local success=0
    local failed=0

    while IFS= read -r file; do
        count=$((count + 1))

        if [[ "$VERBOSE" == true ]]; then
            log_info "[$count] Restoring: $file"
        fi

        # Create directory if needed
        local dir=$(dirname "$file")
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
        fi

        # Restore file from commit
        if git show "$COMMIT:$file" > "$file" 2>/dev/null; then
            success=$((success + 1))
            if [[ "$VERBOSE" == true ]]; then
                log_success "  ✓ Restored: $file"
            fi
        else
            failed=$((failed + 1))
            log_error "  ✗ Failed to restore: $file"
        fi
    done < "$RESTORE_LIST"

    echo ""
    log_success "Restoration complete:"
    log_success "  Successfully restored: $success files"
    if [[ $failed -gt 0 ]]; then
        log_error "  Failed to restore: $failed files"
    fi
    log_info "  Total processed: $count files"
}

# Validate restoration
validate_restoration() {
    log_info "Validating restoration..."

    # Check if npm build still works
    if npm run build >/dev/null 2>&1; then
        log_success "✓ npm build still works"
    else
        log_error "✗ npm build failed after restoration"
        return 1
    fi

    # Check if TypeScript compilation works
    if npm run typecheck >/dev/null 2>&1; then
        log_success "✓ TypeScript compilation works"
    else
        log_error "✗ TypeScript compilation failed"
        return 1
    fi

    # Check if CLI still works
    if ./bin/claude-flow --help >/dev/null 2>&1; then
        log_success "✓ CLI still works"
    else
        log_error "✗ CLI failed after restoration"
        return 1
    fi

    log_success "All validations passed!"
}

# Main execution
main() {
    log_info "Selective File Restoration Script"
    log_info "Target commit: $COMMIT"
    log_info "Dry run: $DRY_RUN"
    log_info "Verbose: $VERBOSE"
    echo ""

    # Create restore list
    create_restore_list

    # Check if there are files to restore
    if [[ ! -s "$RESTORE_LIST" ]]; then
        log_info "No files need to be restored."
        exit 0
    fi

    if [[ "$DRY_RUN" == true ]]; then
        preview_restore
    else
        restore_files

        echo ""
        log_info "Running post-restoration validation..."
        if validate_restoration; then
            log_success "File restoration completed successfully!"
        else
            log_error "Validation failed. You may need to check the restored files."
            exit 1
        fi
    fi
}

# Run main function
main "$@"
