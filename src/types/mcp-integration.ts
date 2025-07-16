/**
 * MCP Protocol Integration Types
 *
 * Advanced type definitions for Model Context Protocol integration
 * with circular dependency resolution and protocol abstraction.
 */

/**
 * Base MCP protocol types without circular dependencies
 */
export interface MCPProtocolVersion {
  _major: number;
  minor: number;
  patch: number;
  toString(): string;
}

export interface MCPCapabilities {
  // Core capabilities,
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  // Extension capabilities,
  logging?: {
    level?:
      | "debug"
      | "info"
      | "notice"
      | "warning"
      | "error"
      | "critical"
      | "alert"
      | "emergency";
  };
  sampling?: {};
  experimental?: Record<string, any>;
}

/**
 * MCP protocol request/response abstractions
 */
export interface MCPRequest {
  _id: string | number;
  method: string;
  params?: any;
  jsonrpc: "2.0";}

export interface MCPResponse {
  id: string | number;
  result?: any;
  error?: MCPError;
  jsonrpc: "2.0";}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  method: string;
  params?: any;
  jsonrpc: "2.0";}

/**
 * MCP tool integration without circular dependencies
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface MCPToolCall {
  _id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  _toolCallId: string;
  isError?: boolean;
  content: MCPContent[];}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

/**
 * MCP resource management
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt system
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

export interface MCPPromptMessage {
  role: "user" | "assistant";
  content: MCPContent;}

/**
 * Advanced MCP integration interfaces
 */
export interface MCPIntegrationContext {
  // Protocol information,
  protocolVersion: MCPProtocolVersion;
  serverCapabilities: MCPCapabilities;
  clientCapabilities: MCPCapabilities;

  // Connection state,
  connected: boolean;
  lastActivity: Date;
  connectionId: string;

  // Tool management,
  availableTools: Map<string, MCPToolDefinition>;
  _registeredHandlers: Map<string, MCPToolHandler>;

  // Resource management,
  _availableResources: Map<string, MCPResource>;
  _resourceTemplates: Map<string, MCPResourceTemplate>;

  // Session management,
  _sessionId: string;
  metadata: Record<string, any>;
}

export type MCPToolHandler = (
  _call: MCPToolCall, 
  _context: MCPIntegrationContext, 
) => Promise<MCPToolResult>;

/**
 * Circular dependency-free integration interfaces
 */
export interface MCPSystemBridge {
  // Protocol abstraction,
  sendRequest(_request: MCPRequest): Promise<MCPResponse>;
  sendNotification(_notification: MCPNotification): Promise<void>;

  // Tool integration,
  registerTool(
    _definition: MCPToolDefinition,
    _handler: MCPToolHandler,
  ): Promise<void>;
  unregisterTool(_name: string): Promise<void>;

  // Resource integration,
  registerResource(_resource: MCPResource): Promise<void>;
  unregisterResource(_uri: string): Promise<void>;

  // Lifecycle management,
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Health monitoring,
  getHealth(): Promise<MCPHealth>;
}

export interface MCPHealth {
  _connected: boolean;
  lastHeartbeat: Date;
  latency: number;
  errorCount: number;
  warningCount: number;
  capabilities: MCPCapabilities;}

/**
 * Cross-system integration without circular dependencies
 */
export interface MCPUnifiedIntegration {
  // Bridge to unified work system,
  workSystemBridge?: MCPWorkSystemBridge;

  // Bridge to hive mind system,
  hiveMindBridge?: MCPHiveMindBridge;

  // Bridge to swarm system,
  swarmBridge?: MCPSwarmBridge;

  // Integration configuration,
  integrationConfig: MCPIntegrationConfig;}

export interface MCPWorkSystemBridge {
  // Work system integration without importing work types,
  executeWork(workDescriptor: any): Promise<any>;
  getWorkStatus(_workId: string): Promise<any>;
  coordinateWork(workDescriptor: any, _coordination: any): Promise<any>;}

export interface MCPHiveMindBridge {
  // Hive mind integration without importing hive types,
  createSwarm(_swarmDescriptor: any): Promise<string>;
  submitTask(swarmId: string, _taskDescriptor: any): Promise<string>;
  getSwarmStatus(swarmId: string): Promise<any>;}

export interface MCPSwarmBridge {
  // Swarm integration without importing swarm types,
  spawnAgent(_agentDescriptor: any): Promise<string>;
  assignTask(agentId: string, _taskDescriptor: any): Promise<void>;
  getAgentStatus(agentId: string): Promise<any>;}

/**
 * Configuration for MCP integration
 */
export interface MCPIntegrationConfig {
  // Connection settings,
  serverEndpoint?: string;
  _transportType: "stdio" | "sse" | "websocket";
  authenticationRequired?: boolean;

  // Protocol settings,
  protocolVersion: MCPProtocolVersion;
  heartbeatInterval: number;
  requestTimeout: number;

  // Integration settings,
  enableWorkSystem: boolean;
  enableHiveMind: boolean;
  enableSwarm: boolean;

  // Performance settings,
  maxConcurrentRequests: number;
  retryAttempts: number;
  retryDelay: number;

  // Logging settings,
  logLevel: "debug" | "info" | "warning" | "error";
  logRequests: boolean;
  logResponses: boolean;}

/**
 * Factory functions for creating MCP integrations
 */
export interface MCPIntegrationFactory {
  createSystemBridge(config: MCPIntegrationConfig): Promise<MCPSystemBridge>;
  createUnifiedIntegration(
    config: MCPIntegrationConfig,
  ): Promise<MCPUnifiedIntegration>;
  createIntegrationContext(
    config: MCPIntegrationConfig,
  ): Promise<MCPIntegrationContext>;
}

/**
 * Event system for MCP integration
 */
export interface MCPIntegrationEvents {
  // Connection events,
  onConnectionEstablished(
    handler: (context: MCPIntegrationContext) => void,
  ): void;
  onConnectionLost(handler: (error: Error) => void): void;

  // Tool events,
  onToolRegistered(handler: (tool: MCPToolDefinition) => void): void;
  onToolCalled(
    handler: (call: MCPToolCall,  _result: MCPToolResult) => void,
  ): void;

  // Resource events,
  onResourceRegistered(handler: (resource: MCPResource) => void): void;
  onResourceAccessed(handler: (uri: string) => void): void;

  // Error events,
  onError(handler: (error: MCPError) => void): void;
  onWarning(handler: (warning: string) => void): void;}

/**
 * MCP protocol abstraction layer
 */
export interface MCPProtocolAbstraction {
  // Protocol handling,
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  handleNotification(notification: MCPNotification): Promise<void>;

  // Message validation,
  validateRequest(request: any): request is MCPRequest;
  validateResponse(response: any): response is MCPResponse;
  validateNotification(notification: any): notification is MCPNotification;

  // Error handling,
  createError(_code: number, _message: string, data?: any): MCPError;
  handleError(_error: MCPError): Promise<void>;

  // Protocol utilities,
  generateRequestId(): string | number;
  getProtocolVersion(): MCPProtocolVersion;
  getCapabilities(): MCPCapabilities;
}

/**
 * Advanced MCP features
 */
export interface MCPAdvancedFeatures {
  // Streaming support,
  _streamSupport: {
    enabled: boolean;
    maxStreamSize: number;
    streamTimeout: number;};

  // Batch operations,
  batchSupport: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeout: number;};

  // Caching,
  cachingSupport: {
    enabled: boolean;
    cacheSize: number;
    cacheTTL: number;};

  // Compression,
  compressionSupport: {
    enabled: boolean;
    algorithm: "gzip" | "deflate" | "brotli";
    threshold: number;};
}

/**
 * MCP performance monitoring
 */
export interface MCPPerformanceMonitor {
  // Metrics collection,
  getRequestMetrics(): MCPRequestMetrics;
  getResourceMetrics(): MCPResourceMetrics;
  getConnectionMetrics(): MCPConnectionMetrics;

  // Performance analysis,
  analyzePerformance(): MCPPerformanceAnalysis;
  getRecommendations(): string[];

  // Health monitoring,
  checkHealth(): Promise<MCPHealth>;
  getSystemLoad(): MCPSystemLoad;
}

export interface MCPRequestMetrics {
  _totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  requestsPerSecond: number;}

export interface MCPResourceMetrics {
  totalResources: number;
  activeResources: number;
  resourceAccessCount: number;
  averageResourceSize: number;
  cacheHitRate: number;}

export interface MCPConnectionMetrics {
  uptime: number;
  reconnections: number;
  heartbeatMisses: number;
  averageHeartbeatLatency: number;
  dataTransferred: number;}

export interface MCPPerformanceAnalysis {
  overallScore: number;
  bottlenecks: string[];
  optimizations: string[];
  trends: {
    latency: "improving" | "stable" | "degrading";
    throughput: "improving" | "stable" | "degrading";
    reliability: "improving" | "stable" | "degrading";};
}

export interface MCPSystemLoad {
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  activeConnections: number;
  queuedRequests: number;}

/**
 * Utility functions for MCP integration
 */
export const _MCPUtils = {
  // Version utilities,
  createProtocolVersion(
    major: number,
    minor: number,
    patch: number,
  ): MCPProtocolVersion {
    return {
      _major: major,
      minor,
      patch,
      toString: () => `${major}.${minor}.${patch}`};
  },

  // Capability utilities,
  mergeCapabilities(
    cap1: MCPCapabilities,
    cap2: MCPCapabilities,
  ): MCPCapabilities {
    return {
      tools: { ...cap1.tools, ...cap2.tools },
      resources: { ...cap1.resources, ...cap2.resources },
      prompts: { ...cap1.prompts, ...cap2.prompts },
      logging: { ...cap1.logging, ...cap2.logging },
      sampling: { ...cap1.sampling, ...cap2.sampling },
      experimental: { ...cap1.experimental, ...cap2.experimental }};
  },

  // Error utilities,
  isRetryableError(error: MCPError): boolean {
    return error.code >= 500 && error.code < 600;
  },

  // Validation utilities,
  validateToolSchema(schema: any): boolean {
    return (
      schema &&
      schema.type === "object" &&
      schema.properties &&
      typeof schema.properties === "object"
    );
  }};

/**
 * Type guards for MCP types
 */
export function isMCPRequest(obj: any): obj is MCPRequest {
  return (
    obj &&
    obj.jsonrpc === "2.0" &&
    typeof obj.method === "string" &&
    (typeof obj.id === "string" || typeof obj.id === "number")
  );
}

export function isMCPResponse(obj: any): obj is MCPResponse {
  return (
    obj &&
    obj.jsonrpc === "2.0" &&
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    (obj.result !== undefined || obj.error !== undefined)
  );
}

export function isMCPNotification(obj: any): obj is MCPNotification {
  return (
    obj &&
    obj.jsonrpc === "2.0" &&
    typeof obj.method === "string" &&
    obj.id === undefined
  );
}

export function isMCPError(obj: any): obj is MCPError {
  return obj && typeof obj.code === "number" && typeof obj.message === "string";
}
