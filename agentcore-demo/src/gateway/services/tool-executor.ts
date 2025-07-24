/**
 * Tool executor implementation for AWS AgentCore
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { Tool, ToolExecutor, ToolRegistry, ToolRequest, ToolResponse } from '../models/tool';

/**
 * Local tool executor implementation
 */
export class LocalToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;
  private maxRetries: number;
  
  constructor(registry: ToolRegistry, maxRetries: number = 3) {
    this.registry = registry;
    this.maxRetries = maxRetries;
    logger.info('Local tool executor initialized', { maxRetries });
  }
  
  /**
   * Execute a tool
   * @param request The tool request
   */
  async executeTool(request: ToolRequest): Promise<ToolResponse> {
    try {
      logger.debug('Executing tool', { request });
      
      // Generate request ID if not provided
      const requestId = request.requestId || uuidv4();
      
      // Get the tool
      const tool = this.registry.getTool(request.tool);
      
      if (!tool) {
        logger.error('Tool not found', { tool: request.tool });
        return {
          result: null,
          error: `Tool not found: ${request.tool}`,
        };
      }
      
      // Validate parameters
      const validationError = this.validateParameters(tool, request.parameters);
      
      if (validationError) {
        logger.error('Parameter validation failed', { error: validationError });
        return {
          result: null,
          error: validationError,
        };
      }
      
      // Execute the tool function
      return await this.executeToolFunction(tool, request, 0);
    } catch (error) {
      logger.error('Error executing tool', { error });
      
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Validate tool parameters
   * @param tool The tool
   * @param parameters The parameters
   */
  private validateParameters(tool: Tool, parameters: Record<string, any>): string | null {
    // Check required parameters
    for (const param of tool.parameters) {
      if (param.required && (parameters[param.name] === undefined || parameters[param.name] === null)) {
        return `Missing required parameter: ${param.name}`;
      }
    }
    
    return null;
  }
  
  /**
   * Execute the tool function with retries
   * @param tool The tool
   * @param request The tool request
   * @param retryCount The current retry count
   */
  private async executeToolFunction(tool: Tool, request: ToolRequest, retryCount: number): Promise<ToolResponse> {
    try {
      // Execute the function
      if (typeof tool.function === 'function') {
        // Execute JavaScript function
        const result = await tool.function(request.parameters, request.context);
        
        return {
          result,
          metadata: {
            toolName: tool.name,
            requestId: request.requestId,
            timestamp: new Date().toISOString(),
          },
        };
      } else if (typeof tool.function === 'string') {
        // Execute Lambda function or other remote function
        // This is a placeholder for now
        throw new Error('Remote function execution not implemented yet');
      } else {
        throw new Error('Invalid tool function');
      }
    } catch (error) {
      logger.error('Error executing tool function', { error, retryCount });
      
      // Retry if not exceeded max retries
      if (retryCount < this.maxRetries) {
        logger.info('Retrying tool execution', { retryCount: retryCount + 1 });
        return this.executeToolFunction(tool, request, retryCount + 1);
      }
      
      // Max retries exceeded
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          toolName: tool.name,
          requestId: request.requestId,
          timestamp: new Date().toISOString(),
          retries: retryCount,
        },
      };
    }
  }
}