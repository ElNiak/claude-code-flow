# Cost-Efficient Analysis Patterns

## Pattern 1: Pyramid Analysis Strategy

### Level 1: Foundation (10K tokens)
```
# Quick structural overview
find_file(file_mask="package.json") # Project type
list_dir(relative_path=".", recursive=false) # Top-level structure
find_file(file_mask="*.md") # Documentation
```

### Level 2: Core Structure (25K tokens)
```
# Identify main components
get_symbols_overview(relative_path="src") # Main source
get_symbols_overview(relative_path="lib") # Libraries
find_file(file_mask="index.*", relative_path="src") # Entry points
```

### Level 3: Focused Analysis (65K tokens)
```
# Deep dive into specific areas
find_symbol(name_path="MainClass", include_body=false, depth=1)
find_referencing_symbols(name_path="MainClass", relative_path="src/main.ts")
# Only read symbol bodies when absolutely needed
```

## Pattern 2: Targeted Search Strategy

### Step 1: Precision Targeting (15K tokens)
```
# Use most specific search possible
search_for_pattern(
  substring_pattern="exact_function_name",
  restrict_search_to_code_files=true,
  paths_include_glob="src/**/*.ts"
)
```

### Step 2: Contextual Expansion (30K tokens)
```
# Add minimal context only when needed
search_for_pattern(
  substring_pattern="broader_pattern",
  context_lines_before=2,
  context_lines_after=2,
  paths_include_glob="src/**/*.ts"
)
```

### Step 3: Implementation Details (45K tokens)
```
# Read specific symbols based on findings
find_symbol(name_path="discovered_symbol", include_body=true)
```

## Pattern 3: Incremental Discovery

### Discovery Phase (20K tokens)
```
# Start with file-level discovery
find_file(file_mask="*component*", relative_path="src")
find_file(file_mask="*service*", relative_path="src")
find_file(file_mask="*util*", relative_path="src")
```

### Mapping Phase (40K tokens)
```
# Build symbol map without reading bodies
get_symbols_overview(relative_path="src/components")
get_symbols_overview(relative_path="src/services")
find_symbol(name_path="*", include_body=false, depth=1, relative_path="src/utils")
```

### Implementation Phase (40K tokens)
```
# Read only necessary implementations
find_symbol(name_path="TargetClass/targetMethod", include_body=true)
find_referencing_symbols(name_path="TargetClass", relative_path="src/components/target.ts")
```

## Pattern 4: Relationship-First Analysis

### Relationship Discovery (25K tokens)
```
# Find symbol relationships first
find_symbol(name_path="MainClass", include_body=false, depth=1)
find_referencing_symbols(name_path="MainClass", relative_path="src/main.ts")
```

### Selective Reading (35K tokens)
```
# Read only symbols that are referenced
find_symbol(name_path="MainClass/criticalMethod", include_body=true)
find_symbol(name_path="DependentClass", include_body=false, depth=1)
```

### Implementation Focus (40K tokens)
```
# Deep dive only into active code paths
find_symbol(name_path="ActiveMethod", include_body=true)
search_for_pattern(substring_pattern="ActiveMethod", paths_include_glob="**/*.ts")
```

## Token Conservation Techniques

### Technique 1: Lazy Loading
- Use include_body=false initially
- Read symbol bodies only when modification needed
- Use depth=1 for method signatures only
- Apply substring_matching for fuzzy searches

### Technique 2: Scope Limiting
- Use relative_path to restrict search areas
- Apply paths_include_glob for file type filtering
- Use restrict_search_to_code_files for pattern searches
- Implement max_answer_chars limits for large operations

### Technique 3: Context Minimization
- Use context_lines_before/after=2 instead of larger values
- Apply specific regex patterns instead of broad searches
- Use find_file instead of recursive list_dir
- Target specific directories instead of entire codebase

### Technique 4: Progressive Refinement
- Start with broad patterns, refine based on results
- Use multiple specific searches instead of one broad search
- Apply filters incrementally to reduce result sets
- Cache discovered information in memory for reuse

## Memory-Efficient Caching

### Cache Strategy
```
# Store frequently accessed information
memory_key = "analysis/[component]/structure"
# Cache symbol overviews
memory_key = "analysis/[file]/symbols"
# Cache search results
memory_key = "analysis/[pattern]/matches"
# Cache relationship maps
memory_key = "analysis/[symbol]/references"
```

### Reuse Patterns
1. Check memory before repeating expensive operations
2. Store symbol overviews for later reference
3. Cache file structure information
4. Reuse search results across related queries

## Cost Monitoring

### Token Budget Tracking
- Discovery Phase: 20% of total budget
- Analysis Phase: 60% of total budget
- Implementation Phase: 20% of total budget

### Early Warning System
- Monitor cumulative token usage
- Switch to more efficient tools when approaching limits
- Use fallback strategies for oversized operations
- Implement progressive analysis when budget is tight

### Optimization Metrics
- Tokens per insight gained
- Information density per operation
- Redundant information percentage
- Coverage efficiency ratio
