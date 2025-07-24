/**
 * Gateway module for AWS AgentCore
 * Provides tool integration capabilities
 */
import { config, logger } from '../common';
import { Tool, ToolRequest, ToolResponse } from './models/tool';
import { ToolGatewayService, ToolGatewayProviderType } from './services/tool-gateway';

// Export models and services
export * from './models/tool';
export * from './services/tool-registry';
export * from './services/tool-executor';
export * from './services/lambda-tool-executor';
export * from './services/advanced-tool-executor';
export * from './services/tool-gateway';

// Default tools
const defaultTools: Tool[] = [
  {
    name: 'getCurrentTime',
    description: 'Get the current time',
    parameters: [],
    returns: {
      type: 'string',
      description: 'The current time in ISO format',
    },
    function: () => new Date().toISOString(),
  },
  {
    name: 'calculate',
    description: 'Perform a calculation',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'The operation to perform (add, subtract, multiply, divide)',
        required: true,
      },
      {
        name: 'a',
        type: 'number',
        description: 'The first number',
        required: true,
      },
      {
        name: 'b',
        type: 'number',
        description: 'The second number',
        required: true,
      },
    ],
    returns: {
      type: 'number',
      description: 'The result of the calculation',
    },
    function: (params: any) => {
      const { operation, a, b } = params;
      
      switch (operation) {
        case 'add':
          return a + b;
        case 'subtract':
          return a - b;
        case 'multiply':
          return a * b;
        case 'divide':
          if (b === 0) {
            throw new Error('Division by zero');
          }
          return a / b;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    },
  },
];

/**
 * Gateway demo for AWS AgentCore
 * Demonstrates tool integration capabilities
 */
export default async function gatewayDemo() {
  logger.info('Starting Gateway demo');
  
  try {
    // Determine which provider to use
    const useLambda = config.gateway?.providerType === 'lambda';
    
    const providerType = useLambda ? 
      ToolGatewayProviderType.LAMBDA : 
      ToolGatewayProviderType.LOCAL;
    
    logger.info('Gateway configuration', {
      providerType,
      useLambda,
    });
    
    // Initialize the tool gateway
    const gateway = new ToolGatewayService({
      providerType,
      tools: defaultTools,
      lambda: useLambda ? {
        region: config.runtime.region,
        defaultFunctionName: config.gateway?.lambdaFunctionName || 'agentcore-tool-gateway',
      } : undefined,
    });
    
    // Get all tools
    const tools = gateway.getRegistry().getAllTools();
    logger.info(`Registered ${tools.length} tools:`, {
      tools: tools.map(tool => tool.name),
    });
    
    // Execute the getCurrentTime tool
    logger.info('Executing getCurrentTime tool...');
    
    const timeRequest: ToolRequest = {
      tool: 'getCurrentTime',
      parameters: {},
    };
    
    const timeResponse = await gateway.executeTool(timeRequest);
    
    logger.info('getCurrentTime result:', {
      result: timeResponse.result,
      error: timeResponse.error,
    });
    
    // Execute the calculate tool
    logger.info('Executing calculate tool...');
    
    const calculateRequest: ToolRequest = {
      tool: 'calculate',
      parameters: {
        operation: 'add',
        a: 5,
        b: 3,
      },
    };
    
    const calculateResponse = await gateway.executeTool(calculateRequest);
    
    logger.info('calculate result:', {
      result: calculateResponse.result,
      error: calculateResponse.error,
    });
    
    // Try with an invalid operation
    logger.info('Executing calculate tool with invalid operation...');
    
    const invalidRequest: ToolRequest = {
      tool: 'calculate',
      parameters: {
        operation: 'power',
        a: 2,
        b: 3,
      },
    };
    
    const invalidResponse = await gateway.executeTool(invalidRequest);
    
    logger.info('Invalid operation result:', {
      result: invalidResponse.result,
      error: invalidResponse.error,
    });
    
    // Try with a non-existent tool
    logger.info('Executing non-existent tool...');
    
    const nonExistentRequest: ToolRequest = {
      tool: 'nonExistentTool',
      parameters: {},
    };
    
    const nonExistentResponse = await gateway.executeTool(nonExistentRequest);
    
    logger.info('Non-existent tool result:', {
      result: nonExistentResponse.result,
      error: nonExistentResponse.error,
    });
    
    logger.info('Gateway demo completed successfully');
  } catch (error) {
    logger.error('Error in gateway demo', { error });
  }
}