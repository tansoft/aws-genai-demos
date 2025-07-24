/**
 * Tool models for AWS AgentCore
 */

/**
 * Tool interface
 */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: ToolReturn;
  function: string | Function;
}

/**
 * Tool parameter interface
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
}

/**
 * Tool return interface
 */
export interface ToolReturn {
  type: string;
  description: string;
}

/**
 * Tool request interface
 */
export interface ToolRequest {
  tool: string;
  parameters: Record<string, any>;
  requestId?: string;
  userId?: string;
  context?: Record<string, any>;
}

/**
 * Tool response interface
 */
export interface ToolResponse {
  result: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /**
   * Register a tool
   * @param tool The tool to register
   */
  registerTool(tool: Tool): void;
  
  /**
   * Unregister a tool
   * @param name The name of the tool to unregister
   */
  unregisterTool(name: string): void;
  
  /**
   * Get a tool by name
   * @param name The name of the tool
   */
  getTool(name: string): Tool | null;
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[];
  
  /**
   * Check if a tool is registered
   * @param name The name of the tool
   */
  hasTool(name: string): boolean;
}

/**
 * Tool executor interface
 */
export interface ToolExecutor {
  /**
   * Execute a tool
   * @param request The tool request
   */
  executeTool(request: ToolRequest): Promise<ToolResponse>;
}

/**
 * Tool gateway interface
 */
export interface ToolGateway {
  /**
   * Get the tool registry
   */
  getRegistry(): ToolRegistry;
  
  /**
   * Get the tool executor
   */
  getExecutor(): ToolExecutor;
  
  /**
   * Register a tool
   * @param tool The tool to register
   */
  registerTool(tool: Tool): void;
  
  /**
   * Execute a tool
   * @param request The tool request
   */
  executeTool(request: ToolRequest): Promise<ToolResponse>;
}