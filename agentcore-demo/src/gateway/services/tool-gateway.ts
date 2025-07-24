/**
 * Tool gateway implementation for AWS AgentCore
 */
import { logger } from '../../common';
import { Tool, ToolGateway, ToolRegistry, ToolExecutor, ToolRequest, ToolResponse } from '../models/tool';
import { InMemoryToolRegistry } from './tool-registry';
import { LocalToolExecutor } from './tool-executor';
import { LambdaToolExecutor, LambdaToolExecutorConfig } from './lambda-tool-executor';
import { AdvancedToolExecutor, AdvancedToolExecutorConfig } from './advanced-tool-executor';

/**
 * Tool gateway provider type
 */
export enum ToolGatewayProviderType {
  LOCAL = 'local',
  LAMBDA = 'lambda',
  ADVANCED = 'advanced',
}

/**
 * Tool gateway configuration
 */
export interface ToolGatewayConfig {
  providerType: ToolGatewayProviderType;
  tools?: Tool[];
  lambda?: LambdaToolExecutorConfig;
  advanced?: AdvancedToolExecutorConfig;
}

/**
 * Tool gateway implementation
 */
export class ToolGatewayService implements ToolGateway {
  private registry: ToolRegistry;
  private executor: ToolExecutor;
  private config: ToolGatewayConfig;
  
  constructor(config: ToolGatewayConfig) {
    this.config = config;
    
    // Create the registry
    this.registry = new InMemoryToolRegistry();
    
    // Create the executor based on provider type
    switch (config.providerType) {
      case ToolGatewayProviderType.LOCAL:
        this.executor = new LocalToolExecutor(this.registry);
        break;
        
      case ToolGatewayProviderType.LAMBDA:
        this.executor = new LambdaToolExecutor(this.registry, config.lambda);
        break;
        
      case ToolGatewayProviderType.ADVANCED:
        this.executor = new AdvancedToolExecutor(this.registry, config.advanced);
        break;
        
      default:
        throw new Error(`Unsupported tool gateway provider type: ${config.providerType}`);
    }
    
    // Register tools if provided
    if (config.tools) {
      for (const tool of config.tools) {
        this.registerTool(tool);
      }
    }
    
    logger.info('Tool gateway initialized', {
      providerType: config.providerType,
      toolCount: config.tools?.length || 0,
    });
  }
  
  /**
   * Get the tool registry
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }
  
  /**
   * Get the tool executor
   */
  getExecutor(): ToolExecutor {
    return this.executor;
  }
  
  /**
   * Register a tool
   * @param tool The tool to register
   */
  registerTool(tool: Tool): void {
    this.registry.registerTool(tool);
  }
  
  /**
   * Execute a tool
   * @param request The tool request
   */
  async executeTool(request: ToolRequest): Promise<ToolResponse> {
    return this.executor.executeTool(request);
  }
}