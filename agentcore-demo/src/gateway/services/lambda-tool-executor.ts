/**
 * Lambda tool executor implementation for AWS AgentCore
 */
import { 
  LambdaClient, 
  InvokeCommand,
  InvocationType 
} from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { Tool, ToolExecutor, ToolRegistry, ToolRequest, ToolResponse } from '../models/tool';

/**
 * Lambda tool executor configuration
 */
export interface LambdaToolExecutorConfig {
  region?: string;
  endpoint?: string;
  maxRetries?: number;
  defaultFunctionName?: string;
}

/**
 * Lambda tool executor implementation
 */
export class LambdaToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;
  private client: LambdaClient;
  private maxRetries: number;
  private defaultFunctionName: string;
  
  constructor(registry: ToolRegistry, config: LambdaToolExecutorConfig = {}) {
    this.registry = registry;
    this.maxRetries = config.maxRetries || 3;
    this.defaultFunctionName = config.defaultFunctionName || 'agentcore-tool-gateway';
    
    this.client = new LambdaClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      endpoint: config.endpoint,
    });
    
    logger.info('Lambda tool executor initialized', { 
      maxRetries: this.maxRetries,
      defaultFunctionName: this.defaultFunctionName,
    });
  }
  
  /**
   * Execute a tool
   * @param request The tool request
   */
  async executeTool(request: ToolRequest): Promise<ToolResponse> {
    try {
      logger.debug('Executing tool with Lambda', { request });
      
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
      return await this.executeLambdaFunction(tool, request, 0);
    } catch (error) {
      logger.error('Error executing tool with Lambda', { error });
      
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
   * Execute the Lambda function with retries
   * @param tool The tool
   * @param request The tool request
   * @param retryCount The current retry count
   */
  private async executeLambdaFunction(tool: Tool, request: ToolRequest, retryCount: number): Promise<ToolResponse> {
    try {
      // Determine the function name
      const functionName = typeof tool.function === 'string' ? 
        tool.function : this.defaultFunctionName;
      
      // Create the payload
      const payload = {
        tool: request.tool,
        parameters: request.parameters,
        requestId: request.requestId,
        userId: request.userId,
        context: request.context,
      };
      
      // Invoke the Lambda function
      const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: InvocationType.RequestResponse,
        Payload: Buffer.from(JSON.stringify(payload)),
      });
      
      const response = await this.client.send(command);
      
      // Parse the response
      if (response.Payload) {
        const responsePayload = Buffer.from(response.Payload).toString('utf-8');
        const parsedResponse = JSON.parse(responsePayload);
        
        // Check for Lambda errors
        if (parsedResponse.errorMessage) {
          throw new Error(parsedResponse.errorMessage);
        }
        
        return {
          result: parsedResponse.result,
          metadata: {
            toolName: tool.name,
            requestId: request.requestId,
            timestamp: new Date().toISOString(),
            functionName,
            statusCode: response.StatusCode,
          },
        };
      }
      
      throw new Error('Empty response from Lambda function');
    } catch (error) {
      logger.error('Error executing Lambda function', { error, retryCount });
      
      // Retry if not exceeded max retries
      if (retryCount < this.maxRetries) {
        logger.info('Retrying Lambda function execution', { retryCount: retryCount + 1 });
        return this.executeLambdaFunction(tool, request, retryCount + 1);
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