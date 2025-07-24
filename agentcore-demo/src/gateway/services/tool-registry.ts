/**
 * Tool registry implementation for AWS AgentCore
 */
import { logger } from '../../common';
import { Tool, ToolRegistry } from '../models/tool';

/**
 * In-memory tool registry implementation
 */
export class InMemoryToolRegistry implements ToolRegistry {
  private tools: Map<string, Tool>;
  
  constructor() {
    this.tools = new Map();
    logger.info('In-memory tool registry initialized');
  }
  
  /**
   * Register a tool
   * @param tool The tool to register
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is already registered, overwriting`);
    }
    
    this.tools.set(tool.name, tool);
    logger.info(`Tool ${tool.name} registered`);
  }
  
  /**
   * Unregister a tool
   * @param name The name of the tool to unregister
   */
  unregisterTool(name: string): void {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      logger.info(`Tool ${name} unregistered`);
    } else {
      logger.warn(`Tool ${name} is not registered`);
    }
  }
  
  /**
   * Get a tool by name
   * @param name The name of the tool
   */
  getTool(name: string): Tool | null {
    return this.tools.get(name) || null;
  }
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Check if a tool is registered
   * @param name The name of the tool
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}