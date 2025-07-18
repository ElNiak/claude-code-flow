# Fallback Mechanisms and Error Recovery

## Fallback Strategy Matrix

### Scenario 1: "Output too long" Errors

#### Primary Fallback: Scope Reduction
```
IF search_for_pattern returns "too long":
  1. Add paths_include_glob to limit file types
  2. Use more specific substring_pattern
  3. Reduce context_lines_before/after to 1
  4. Apply max_answer_chars limit
```

#### Secondary Fallback: Chunked Analysis
```
IF get_symbols_overview returns "too long":
  1. Split directory into subdirectories
  2. Process files in batches of 5-10
  3. Use find_file with specific patterns
  4. Apply targeted find_symbol calls
```

#### Tertiary Fallback: Alternative Tools
```
IF all else fails:
  1. Use find_file instead of list_dir
  2. Use find_symbol instead of get_symbols_overview
  3. Use targeted search_for_pattern with strict filters
  4. Manual incremental exploration
```

### Scenario 2: "No matches found" Errors

#### Primary Fallback: Pattern Broadening
```
IF search_for_pattern finds nothing:
  1. Remove file type restrictions
  2. Use broader substring patterns
  3. Enable substring_matching for symbols
  4. Check spelling and case sensitivity
```

#### Secondary Fallback: Alternative Search Methods
```
IF find_symbol finds nothing:
  1. Use get_symbols_overview to see available symbols
  2. Use search_for_pattern with symbol name
  3. Try fuzzy matching with substring_matching=true
  4. Check parent directory structure
```

#### Tertiary Fallback: Discovery Mode
```
IF still no matches:
  1. Use list_dir to understand structure
  2. Use find_file to locate relevant files
  3. Use get_symbols_overview for available symbols
  4. Manual exploration of similar areas
```

### Scenario 3: "Multiple matches" Errors

#### Primary Fallback: Pattern Refinement
```
IF search_for_pattern too many matches:
  1. Add more specific context to pattern
  2. Use paths_include_glob to limit scope
  3. Add context_lines to disambiguate
  4. Use head_limit to process subset
```

#### Secondary Fallback: Targeted Analysis
```
IF find_symbol multiple matches:
  1. Use more specific name_path
  2. Add relative_path to limit scope
  3. Use get_symbols_overview to see options
  4. Process matches individually
```

#### Tertiary Fallback: Batch Processing
```
IF still too many matches:
  1. Process in smaller batches
  2. Use more restrictive filters
  3. Focus on most relevant matches first
  4. Use memory to track processed items
```

## Progressive Degradation Strategies

### Strategy 1: Granularity Reduction
```
Level 1: Full detailed analysis
Level 2: Symbol-level analysis only
Level 3: File-level analysis only
Level 4: Directory-level analysis only
```

### Strategy 2: Scope Narrowing
```
Level 1: Entire codebase
Level 2: Main source directory
Level 3: Specific modules
Level 4: Individual files
```

### Strategy 3: Detail Reduction
```
Level 1: Full symbol bodies
Level 2: Symbol signatures only
Level 3: Symbol names only
Level 4: File names only
```

## Error Recovery Workflows

### Workflow 1: Search Recovery
```
1. Original search_for_pattern fails
2. Try with paths_include_glob="**/*.ts"
3. Try with more specific pattern
4. Try with context_lines_before/after=1
5. Try find_symbol with substring_matching
6. Manual file-by-file exploration
```

### Workflow 2: Symbol Recovery
```
1. Original find_symbol fails
2. Try get_symbols_overview on directory
3. Try search_for_pattern with symbol name
4. Try with substring_matching=true
5. Try broader name_path pattern
6. Manual symbol discovery
```

### Workflow 3: Analysis Recovery
```
1. Original comprehensive analysis fails
2. Try component-by-component analysis
3. Try file-by-file analysis
4. Try pattern-based discovery
5. Try minimal viable analysis
6. Manual exploration with basic tools
```

## Adaptive Algorithm

### Intelligence Layer
```python
def adaptive_tool_selection(operation_type, previous_failures):
    """
    Selects optimal tool based on operation type and failure history
    """
    if "output_too_long" in previous_failures:
        return get_constrained_tool(operation_type)
    elif "no_matches" in previous_failures:
        return get_broader_tool(operation_type)
    elif "multiple_matches" in previous_failures:
        return get_specific_tool(operation_type)
    else:
        return get_default_tool(operation_type)
```

### Failure Pattern Recognition
```python
def analyze_failure_pattern(error_history):
    """
    Identifies recurring failure patterns and suggests optimization
    """
    if count_errors("output_too_long") > 3:
        return "switch_to_chunked_analysis"
    elif count_errors("no_matches") > 2:
        return "broaden_search_patterns"
    elif count_errors("multiple_matches") > 2:
        return "add_context_filters"
    else:
        return "continue_current_strategy"
```

## Emergency Protocols

### Protocol 1: Token Budget Exhaustion
```
When approaching token limit:
1. Switch to most efficient tools only
2. Use cached information from memory
3. Focus on critical path analysis only
4. Defer non-essential analysis
```

### Protocol 2: Repeated Tool Failures
```
When tools consistently fail:
1. Switch to alternative tool sequence
2. Use manual exploration methods
3. Implement chunked processing
4. Fall back to basic file operations
```

### Protocol 3: Information Overload
```
When results are too large:
1. Implement progressive filtering
2. Use sampling techniques
3. Focus on most relevant results
4. Cache partial results for later
```

## Recovery Validation

### Validation Checks
```
After each fallback attempt:
1. Verify results are meaningful
2. Check token budget remaining
3. Ensure progress toward goal
4. Validate information quality
```

### Success Metrics
```
Recovery considered successful when:
1. Useful information obtained
2. Within token budget
3. Actionable insights gained
4. Forward progress made
```

### Iteration Control
```
Limit fallback attempts:
1. Maximum 3 fallbacks per operation
2. Escalate to manual methods after 3 failures
3. Cache successful fallback patterns
4. Learn from failure patterns
```
