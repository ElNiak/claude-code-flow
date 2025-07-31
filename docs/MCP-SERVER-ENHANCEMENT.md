# MCP Server Enhancement Documentation

## Overview

The `setupMcpServers()` function has been enhanced from supporting 2 servers to 7 servers with comprehensive error handling, environment variable support, and multi-command type compatibility.

## Enhanced Features

### 🚀 Server Count Expansion
- **Before**: 2 servers (claude-flow, ruv-swarm)
- **After**: 7 servers with diverse capabilities

### 🔧 Command Type Support
- **NPX**: Node.js packages (`npx package-name`)
- **Docker**: Containerized servers (`docker run ...`)
- **UVX**: Python UV packages (`uvx package-name`)

### 🌍 Environment Variable Handling
- Automatic validation of required environment variables
- Smart substitution of variables like `${PWD}`
- Clear error messages for missing variables

### 📊 Enhanced Error Reporting
- Detailed troubleshooting for each command type
- Success/failure summary with counts
- Specific recommendations for each server type

## Server Configurations

### 1. claude-flow (NPX)
```javascript
{
  name: 'claude-flow',
  command: 'npx',
  args: ['claude-flow@alpha', 'mcp', 'start'],
  description: 'Claude Flow MCP server with swarm orchestration (alpha)'
}
```

### 2. ruv-swarm (NPX)
```javascript
{
  name: 'ruv-swarm',
  command: 'npx',
  args: ['ruv-swarm@latest', 'mcp', 'start'],
  description: 'ruv-swarm MCP server for enhanced coordination'
}
```

### 3. sequential-thinking (NPX)
```javascript
{
  name: 'sequential-thinking',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  description: 'Sequential thinking MCP server for structured problem-solving'
}
```

### 4. perplexity-ask (Docker)
```javascript
{
  name: 'perplexity-ask',
  command: 'docker',
  args: ['run', '-i', '--rm', '-e', 'PERPLEXITY_API_KEY', 'mcp/perplexity-ask'],
  env: { PERPLEXITY_API_KEY: 'TODO-API-KEY' },
  description: 'Perplexity Ask MCP server for web research capabilities'
}
```
**Requirements**: Docker installed, PERPLEXITY_API_KEY environment variable

### 5. context7 (NPX)
```javascript
{
  name: 'context7',
  command: 'npx',
  args: ['-y', '@upstash/context7-mcp'],
  description: 'Context7 MCP server for library documentation retrieval'
}
```

### 6. serena (UVX)
```javascript
{
  name: 'serena',
  command: 'uvx',
  args: [
    '--from', 'git+https://github.com/oraios/serena',
    'serena-mcp-server', '--context', 'ide-assistant',
    '--project', '${PWD}', '--tool-timeout', '20',
    '--mode', 'planning', '--enable-web-dashboard', 'false'
  ],
  description: 'Serena MCP server for advanced code analysis and LSP integration'
}
```
**Requirements**: UV installed (`pip install uv`), Git access

### 7. consult7 (UVX)
```javascript
{
  name: 'consult7',
  command: 'uvx',
  args: ['consult7', 'google', 'TODO-API-KEY'],
  description: 'Consult7 MCP server for advanced reasoning with Google Gemini'
}
```
**Requirements**: UV installed, Google API key

## Installation and Setup

### Prerequisites

1. **Claude Code CLI**: `npm install -g @anthropic-ai/claude-code`
2. **Docker** (for perplexity-ask): Install Docker Desktop
3. **UV** (for serena/consult7): `pip install uv`
4. **Environment Variables**:
   ```bash
   export PERPLEXITY_API_KEY=your_perplexity_api_key
   ```

### Usage

#### Dry Run (Recommended First)
```bash
npx claude-flow init --dry-run
```

#### Full Setup
```bash
npx claude-flow init
```

#### Manual Server Addition
If automatic setup fails, add servers manually:
```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking
# ... etc
```

## Architecture

### File Structure
```
src/cli/simple-commands/init/
├── index.js                 # Enhanced setupMcpServers function
├── mcp-command-builder.js   # Command building utilities
backup-setupMcpServers.js    # Original function backup
validation-mcp-setup.js      # Validation testing script
test-mcp-enhancement.js      # Comprehensive testing
```

### Command Builder Utilities

#### `buildMcpCommand(serverConfig)`
Converts structured server configuration to command string:
- Handles NPX, Docker, and UVX command types
- Joins arguments appropriately
- Supports legacy command formats

#### `validateEnvironmentVariables(serverConfig)`
Validates required environment variables:
- Detects TODO placeholders
- Returns missing variables list
- Provides validation status

#### `prepareServerConfig(serverConfig)`
Prepares configuration with environment substitution:
- Replaces `${PWD}` with current directory
- Substitutes other environment variables
- Returns prepared configuration

## Error Handling

### Command Type Specific Troubleshooting

#### NPX Errors
- Verify Node.js and npm installation
- Try global package installation
- Check network connectivity

#### Docker Errors
- Ensure Docker is running
- Verify environment variables are set
- Pull required Docker images
- Check Docker permissions

#### UVX Errors
- Install UV: `pip install uv`
- Verify Git access for repositories
- Check Python environment

### Environment Variable Errors
```
⚠️  perplexity-ask requires environment variables: PERPLEXITY_API_KEY
    Set these variables before running: export PERPLEXITY_API_KEY=your_value
```

## Testing and Validation

### Validation Script
```bash
node validation-mcp-setup.js
```

**Tests performed:**
1. Command string building
2. Environment variable validation
3. Server configuration preparation
4. Complete command generation
5. File structure validation
6. Dry run simulation

### Comprehensive Testing
```bash
node test-mcp-enhancement.js
```

**Additional tests:**
- Init command dry run
- File structure verification
- Enhanced function validation
- Backup verification

## Rollback and Recovery

### Backup Location
Original function saved to: `backup-setupMcpServers.js`

### Manual Rollback
If issues occur, restore the original function:
1. Copy content from `backup-setupMcpServers.js`
2. Replace the enhanced function in `src/cli/simple-commands/init/index.js`
3. Remove `mcp-command-builder.js` import

### Verification
```bash
claude mcp list
```

## Performance and Monitoring

### Success Metrics
- Server addition success/failure counts
- Environment validation results
- Command generation success rates

### Monitoring Commands
```bash
# List active MCP servers
claude mcp list

# Check Claude Code configuration
claude config list

# Test specific server
claude mcp test server-name
```

## Troubleshooting Common Issues

### 1. "Missing required environment variables"
**Solution**: Set the required environment variables:
```bash
export PERPLEXITY_API_KEY=your_api_key
# Edit consult7 configuration to replace TODO-API-KEY
```

### 2. "Docker daemon not running"
**Solution**: Start Docker Desktop or Docker service

### 3. "uvx command not found"
**Solution**: Install UV:
```bash
pip install uv
# or
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 4. "Git repository access denied"
**Solution**: Configure Git credentials for private repositories

### 5. "claude command not found"
**Solution**: Install Claude Code CLI:
```bash
npm install -g @anthropic-ai/claude-code
```

## Development Notes

### Code Quality
- Follows existing codebase patterns
- Comprehensive error handling
- Environment variable safety
- Backward compatibility maintained

### SPARC Methodology Compliance
- ✅ Grounded development with Context7/Serena integration
- ✅ Minimal changes approach (enhanced existing function)
- ✅ Validation and testing built-in
- ✅ Proper backup and rollback support

### Future Enhancements
- Configuration file-based server definitions
- Interactive server selection
- Health monitoring for active servers
- Automatic dependency checking

## Security Considerations

### Environment Variables
- Never hardcode API keys
- Use environment variables for sensitive data
- Validate environment variable format
- Warn about missing credentials

### Command Execution
- Sanitize command arguments
- Use execSync with proper options
- Handle shell injection risks
- Validate command types

## Changelog

### v2.0 (2025-07-31)
- ✅ Enhanced from 2 to 7 MCP servers
- ✅ Added NPX, Docker, UVX command support
- ✅ Added environment variable validation
- ✅ Enhanced error handling and troubleshooting
- ✅ Created command builder utilities
- ✅ Added comprehensive testing and validation
- ✅ Created backup and rollback system
- ✅ Added detailed documentation

### v1.0 (Original)
- Basic support for 2 NPX servers
- Simple error handling
- No environment variable support