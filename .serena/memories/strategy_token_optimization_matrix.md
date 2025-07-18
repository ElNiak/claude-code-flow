# Token Optimization Strategy Matrix

## Core Strategy Principles
- **Progressive Disclosure**: Start narrow, expand systematically
- **Token Budgeting**: Allocate ~200K tokens across phases
- **Intelligent Filtering**: Use specific parameters to limit scope
- **Hierarchical Analysis**: Structure → Code → Symbols

## Tool Usage Strategy Matrix

### 1. Directory Analysis Strategies

#### Primary Strategy: Targeted Discovery
- **Tool**: `find_file` with specific patterns
- **Parameters**: Use precise file masks (`*.ts`, `*.js`, `*.py`)
- **Token Cost**: Low (file paths only)
- **Fallback**: `list_dir` with `recursive=false` for specific subdirectories

#### Secondary Strategy: Pattern-Based Exploration
- **Tool**: `search_for_pattern` with file-type restrictions
- **Parameters**: `restrict_search_to_code_files=true`, specific `paths_include_glob`
- **Token Cost**: Medium (depends on matches)
- **Fallback**: Break into smaller directory chunks

### 2. Code Analysis Strategies

#### Primary Strategy: Symbol-First Approach
- **Tool**: `get_symbols_overview` for file structure
- **Parameters**: Target specific files/directories
- **Token Cost**: Low-Medium (symbol metadata only)
- **Fallback**: `find_symbol` with specific name paths

#### Secondary Strategy: Targeted Symbol Reading
- **Tool**: `find_symbol` with `include_body=false` first
- **Parameters**: Use `depth=1` for method listings
- **Token Cost**: Low (metadata only)
- **Fallback**: Progressive `include_body=true` for specific symbols

### 3. Pattern Search Strategies

#### Primary Strategy: Constrained Pattern Search
- **Tool**: `search_for_pattern` with file restrictions
- **Parameters**: `paths_include_glob`, `context_lines_before/after=2`
- **Token Cost**: Variable (depends on matches)
- **Fallback**: Use more specific regex patterns

#### Secondary Strategy: Symbol-Based Search
- **Tool**: `find_referencing_symbols` for relationships
- **Parameters**: Target specific symbols
- **Token Cost**: Medium (code snippets)
- **Fallback**: Manual regex search

## Token Budget Allocation

### Phase 1: Discovery (20% - 40K tokens)
- Directory structure analysis
- File pattern identification
- High-level symbol overview

### Phase 2: Targeted Analysis (60% - 120K tokens)
- Specific symbol reading
- Relationship mapping
- Pattern matching

### Phase 3: Deep Dive (20% - 40K tokens)
- Full symbol bodies when needed
- Complex pattern searches
- Cross-file analysis

## Decision Trees

### For Large Codebases (>100 files)
1. Start with `find_file` for specific patterns
2. Use `get_symbols_overview` on key directories
3. Apply `find_symbol` for targeted exploration
4. Use `search_for_pattern` for specific code elements

### For Symbol Analysis
1. Use `find_symbol` with `include_body=false` first
2. Get symbol relationships with `find_referencing_symbols`
3. Read specific symbol bodies only when needed
4. Use `search_for_pattern` for usage patterns

### For Pattern Discovery
1. Start with `search_for_pattern` with file restrictions
2. Use `context_lines_before/after=2` for focused results
3. Apply more specific patterns if too many results
4. Fall back to manual inspection for complex cases
