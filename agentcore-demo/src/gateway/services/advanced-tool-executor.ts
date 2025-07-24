/**
 * Advanced tool executor implementation for AWS AgentCore
 * Includes error handling, retries, metrics, and tracing
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { Tool, ToolExecutor, ToolRegistry, ToolRequest, ToolResponse } from '../models/tool';

/**
 * Advanced tool executor configuration
 */
export interface AdvancedToolExecutorConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  collectMetrics?: boolean;
  enableTracing?: boolean;
}

/**
 * Advanced tool executor implementation
 */
export class AdvancedToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;
  private config: AdvancedToolExecutorConfig;
  private metrics: Map<string, any>;
  
  constructor(registry: ToolRegistry, config: AdvancedToolExecutorConfig = {}) {
    this.registry = registry;
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 100,
      timeout: config.timeout || 30000,
      collectMetrics: config.collectMetrics !== false,
      enableTracing: config.enableTracing || false,
    };
    this.metrics = new Map();
    
    logger.info('Advanced tool executor initialized', { 
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      timeout: this.config.timeout,
      collectMetrics: this.config.collectMetrics,
      enableTracing: this.config.enableTracing,
    });
  }
  
  /**
   * Execute a tool
   * @param request The tool request
   */
  async executeTool(request: ToolRequest): Promise<ToolResponse> {
    try {
      logger.debug('Executing tool', { request });
      
      // Start metrics collection
      const startTime = Date.now();
      const toolName = request.tool;
      const requestId = request.requestId || uuidv4();
      
      // Start tracing if enabled
      if (this.config.enableTracing) {
        logger.debug('Starting trace', { requestId, toolName });
      }
      
      // Get the tool
      const tool = this.registry.getTool(request.tool);
      
      if (!tool) {
        logger.error('Tool not found', { tool: request.tool });
        
        // Record metrics
        this.recordMetrics(toolName, 'not_found', Date.now() - startTime, 0);
        
        return {
          result: null,
          error: `Tool not found: ${request.tool}`,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
          },
        };
      }
      
      // Validate parameters
      const validationError = this.validateParameters(tool, request.parameters);
      
      if (validationError) {
        logger.error('Parameter validation failed', { error: validationError });
        
        // Record metrics
        this.recordMetrics(toolName, 'validation_error', Date.now() - startTime, 0);
        
        return {
          result: null,
          error: validationError,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
          },
        };
      }
      
      // Execute the tool function with timeout and retries
      const response = await this.executeWithTimeoutAndRetries(tool, request, requestId);
      
      // Record metrics
      this.recordMetrics(
        toolName, 
        response.error ? 'error' : 'success', 
        Date.now() - startTime, 
        response.metadata?.retries || 0
      );
      
      // End tracing if enabled
      if (this.config.enableTracing) {
        logger.debug('Ending trace', { 
          requestId, 
          toolName, 
          duration: Date.now() - startTime,
          success: !response.error,
        });
      }
      
      return response;
    } catch (error) {
      logger.error('Error executing tool', { error });
      
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date().toISOString(),
        },
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
   * Execute the tool function with timeout and retries
   * @param tool The tool
   * @param request The tool request
   * @param requestId The request ID
   */
  private async executeWithTimeoutAndRetries(
    tool: Tool, 
    request: ToolRequest, 
    requestId: string
  ): Promise<ToolResponse> {
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount <= this.config.maxRetries!) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(tool, request);
        
        return {
          result,
          metadata: {
            toolName: tool.name,
            requestId,
            timestamp: new Date().toISOString(),
            retries: retryCount,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error('Error executing tool function', { error, retryCount });
        
        // Check if we should retry
        if (retryCount < this.config.maxRetries!) {
          retryCount++;
          logger.info('Retrying tool execution', { retryCount });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
        } else {
          break;
        }
      }
    }
    
    // Max retries exceeded
    return {
      result: null,
      error: lastError?.message || 'Unknown error',
      metadata: {
        toolName: tool.name,
        requestId,
        timestamp: new Date().toISOString(),
        retries: retryCount,
      },
    };
  }
  
  /**
   * Execute the tool function with a timeout
   * @param tool The tool
   * @param request The tool request
   */
  private async executeWithTimeout(tool: Tool, request: ToolRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
      
      // Execute the function
      try {
        if (typeof tool.function === 'function') {
          // Execute JavaScript function
          Promise.resolve(tool.function(request.parameters, request.context))
            .then(result => {
              clearTimeout(timeoutId);
              resolve(result);
            })
            .catch(error => {
              clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          // Not a function
          clearTimeout(timeoutId);
          reject(new Error('Invalid tool function'));
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Record metrics for tool execution
   * @param toolName The tool name
   * @param status The execution status
   * @param duration The execution duration in milliseconds
   * @param retries The number of retries
   */
  private recordMetrics(toolName: string, status: string, duration: number, retries: number): void {
    if (!this.config.collectMetrics) {
      return;
    }
    
    // Get or create metrics for this tool
    let toolMetrics = this.metrics.get(toolName);
    
    if (!toolMetrics) {
      toolMetrics = {
        executions: 0,
        successes: 0,
        errors: 0,
        notFound: 0,
        validationErrors: 0,
        totalDuration: 0,
        totalRetries: 0,
        maxDuration: 0,
        minDuration: Infinity,
      };
      this.metrics.set(toolName, toolMetrics);
    }
    
    // Update metrics
    toolMetrics.executions++;
    toolMetrics.totalDuration += duration;
    toolMetrics.totalRetries += retries;
    toolMetrics.maxDuration = Math.max(toolMetrics.maxDuration, duration);
    toolMetrics.minDuration = Math.min(toolMetrics.minDuration, duration);
    
    // Update status-specific metrics
    switch (status) {
      case 'success':
        toolMetrics.successes++;
        break;
      case 'error':
        toolMetrics.errors++;
        break;
      case 'not_found':
        toolMetrics.notFound++;
        break;
      case 'validation_error':
        toolMetrics.validationErrors++;
        break;
    }
    
    logger.debug('Tool execution metrics', { toolName, metrics: toolMetrics });
  }
  
  /**
   * Get metrics for all tools
   */
  getMetrics(): Record<string, any> {
    const metricsObj: Record<string, any> = {};
    
    for (const [toolName, metrics] of this.metrics.entries()) {
      metricsObj[toolName] = {
        ...metrics,
        avgDuration: metrics.executions > 0 ? metrics.totalDuration / metrics.executions : 0,
        avgRetries: metrics.executions > 0 ? metrics.totalRetries / metrics.executions : 0,
        successRate: metrics.executions > 0 ? metrics.successes / metrics.executions : 0,
        errorRate: metrics.executions > 0 ? metrics.errors / metrics.executions : 0,
      };
    }
    
    return metricsObj;
  }
  
  /**
   * Reset metrics for all tools
   */
  resetMetrics(): void {
    this.metrics.clear();
    logger.info('Tool execution metrics reset');
  }
}