/**
 * MCP Command Builder Utility
 * Converts structured MCP server configurations to command strings
 */

/**
 * Build command string from MCP server configuration
 * @param {Object} serverConfig - Server configuration from .mcp.json
 * @returns {string} - Command string for claude mcp add
 */
export function buildMcpCommand(serverConfig) {
  const { command, args = [] } = serverConfig;
  
  switch (command) {
    case 'npx':
      return `npx ${args.join(' ')}`;
    
    case 'docker':
      return `docker ${args.join(' ')}`;
    
    case 'uvx':
      return `uvx ${args.join(' ')}`;
    
    default:
      // Handle legacy format where command is the full command string
      if (typeof command === 'string' && !args.length) {
        return command;
      }
      
      // Unknown command type, return as-is
      console.warn(`Unknown command type: ${command}`);
      return `${command} ${args.join(' ')}`;
  }
}

/**
 * Check if required environment variables are set
 * @param {Object} serverConfig - Server configuration
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export function validateEnvironmentVariables(serverConfig) {
  const { env = {} } = serverConfig;
  const missing = [];
  
  for (const [key, value] of Object.entries(env)) {
    // Check if env var is required (marked as TODO-API-KEY or similar)
    if (value && (value.includes('TODO') || value.includes('REPLACE'))) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Get server configuration with environment variable substitution
 * @param {Object} serverConfig - Server configuration
 * @returns {Object} - Configuration with env vars substituted
 */
export function prepareServerConfig(serverConfig) {
  const config = { ...serverConfig };
  
  // Handle environment variables in args
  if (config.args) {
    config.args = config.args.map(arg => {
      if (typeof arg === 'string') {
        // Replace ${PWD} with current working directory
        arg = arg.replace('${PWD}', process.cwd());
        
        // Replace other environment variables
        arg = arg.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
          return process.env[envVar] || match;
        });
      }
      return arg;
    });
  }
  
  return config;
}