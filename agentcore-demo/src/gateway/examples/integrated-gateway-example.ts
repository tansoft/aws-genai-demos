/**
 * Example of using the integrated gateway with all components
 */
import { logger } from '../../common';
import { 
  Tool, 
  ToolRequest, 
  ToolGatewayService, 
  ToolGatewayProviderType 
} from '../';

/**
 * Run the integrated gateway example
 */
async function runIntegratedGatewayExample() {
  try {
    console.log('Starting integrated gateway example...');
    
    // Define some example tools
    const tools: Tool[] = [
      {
        name: 'hello',
        description: 'Say hello to someone',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The name to say hello to',
            required: true,
          },
        ],
        returns: {
          type: 'string',
          description: 'A greeting message',
        },
        function: (params: any) => `Hello, ${params.name}!`,
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
      {
        name: 'flaky',
        description: 'A flaky tool that sometimes fails',
        parameters: [],
        returns: {
          type: 'string',
          description: 'Success message',
        },
        function: (() => {
          let attempts = 0;
          return () => {
            attempts++;
            if (attempts % 2 === 1) {
              throw new Error(`Flaky tool failed on attempt ${attempts}`);
            }
            return `Success on attempt ${attempts}`;
          };
        })(),
      },
    ];
    
    // Initialize the tool gateway with advanced provider
    console.log('Initializing tool gateway with advanced provider...');
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.ADVANCED,
      tools,
      advanced: {
        maxRetries: 3,
        retryDelay: 100,
        timeout: 5000,
        collectMetrics: true,
        enableTracing: true,
      },
    });
    
    // Get all tools
    const registeredTools = gateway.getRegistry().getAllTools();
    
    console.log(`Registered ${registeredTools.length} tools:`);
    registeredTools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Execute the hello tool
    console.log('\nExecuting hello tool...');
    
    const helloRequest: ToolRequest = {
      tool: 'hello',
      parameters: {
        name: 'World',
      },
      requestId: 'hello-123',
      userId: 'user-456',
      context: {
        sessionId: 'session-789',
      },
    };
    
    const helloResponse = await gateway.executeTool(helloRequest);
    
    console.log('Hello tool response:');
    console.log(`- Result: ${helloResponse.result}`);
    console.log(`- Error: ${helloResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(helloResponse.metadata)}`);
    
    // Execute the calculate tool
    console.log('\nExecuting calculate tool...');
    
    const calculateRequest: ToolRequest = {
      tool: 'calculate',
      parameters: {
        operation: 'add',
        a: 5,
        b: 3,
      },
      requestId: 'calc-123',
      userId: 'user-456',
    };
    
    const calculateResponse = await gateway.executeTool(calculateRequest);
    
    console.log('Calculate tool response:');
    console.log(`- Result: ${calculateResponse.result}`);
    console.log(`- Error: ${calculateResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(calculateResponse.metadata)}`);
    
    // Execute the flaky tool to demonstrate retries
    console.log('\nExecuting flaky tool to demonstrate retries...');
    
    const flakyRequest: ToolRequest = {
      tool: 'flaky',
      parameters: {},
      requestId: 'flaky-123',
    };
    
    const flakyResponse = await gateway.executeTool(flakyRequest);
    
    console.log('Flaky tool response:');
    console.log(`- Result: ${flakyResponse.result}`);
    console.log(`- Error: ${flakyResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(flakyResponse.metadata)}`);
    
    // Execute the flaky tool again to show it succeeds
    console.log('\nExecuting flaky tool again...');
    
    const flakyResponse2 = await gateway.executeTool({
      ...flakyRequest,
      requestId: 'flaky-456',
    });
    
    console.log('Flaky tool response (second attempt):');
    console.log(`- Result: ${flakyResponse2.result}`);
    console.log(`- Error: ${flakyResponse2.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(flakyResponse2.metadata)}`);
    
    // Try with an invalid operation
    console.log('\nExecuting calculate tool with invalid operation...');
    
    const invalidRequest: ToolRequest = {
      tool: 'calculate',
      parameters: {
        operation: 'power',
        a: 2,
        b: 3,
      },
    };
    
    const invalidResponse = await gateway.executeTool(invalidRequest);
    
    console.log('Invalid operation response:');
    console.log(`- Result: ${invalidResponse.result}`);
    console.log(`- Error: ${invalidResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(invalidResponse.metadata)}`);
    
    // Try with a non-existent tool
    console.log('\nExecuting non-existent tool...');
    
    const nonExistentRequest: ToolRequest = {
      tool: 'nonExistentTool',
      parameters: {},
    };
    
    const nonExistentResponse = await gateway.executeTool(nonExistentRequest);
    
    console.log('Non-existent tool response:');
    console.log(`- Result: ${nonExistentResponse.result}`);
    console.log(`- Error: ${nonExistentResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(nonExistentResponse.metadata)}`);
    
    // Get metrics from the advanced executor
    console.log('\nTool execution metrics:');
    const advancedExecutor = gateway.getExecutor() as any;
    if (advancedExecutor.getMetrics) {
      console.log(JSON.stringify(advancedExecutor.getMetrics(), null, 2));
    } else {
      console.log('Metrics not available for this executor type');
    }
    
    console.log('\nIntegrated gateway example completed successfully');
  } catch (error) {
    console.error('Error in integrated gateway example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runIntegratedGatewayExample();
}

export default runIntegratedGatewayExample;