/**
 * Example of using the tool gateway with AWS Lambda
 */
import { 
  Tool, 
  ToolRequest, 
  ToolGatewayService, 
  ToolGatewayProviderType 
} from '../';

/**
 * Run the Lambda example
 */
async function runLambdaExample() {
  try {
    console.log('Starting Lambda example...');
    
    // Define some example tools that will be executed via Lambda
    const tools: Tool[] = [
      {
        name: 'getCurrentTime',
        description: 'Get the current time',
        parameters: [],
        returns: {
          type: 'string',
          description: 'The current time in ISO format',
        },
        function: 'agentcore-tool-gateway', // Lambda function name
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
        function: 'agentcore-tool-gateway', // Lambda function name
      },
    ];
    
    // Initialize the tool gateway with Lambda provider
    console.log('Initializing tool gateway with Lambda provider...');
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LAMBDA,
      tools,
      lambda: {
        region: process.env.AWS_REGION || 'us-east-1',
        defaultFunctionName: 'agentcore-tool-gateway',
        maxRetries: 2,
      },
    });
    
    // Get all tools
    const registeredTools = gateway.getRegistry().getAllTools();
    
    console.log(`Registered ${registeredTools.length} tools:`);
    registeredTools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Execute the getCurrentTime tool
    console.log('\nExecuting getCurrentTime tool via Lambda...');
    
    const timeRequest: ToolRequest = {
      tool: 'getCurrentTime',
      parameters: {},
    };
    
    const timeResponse = await gateway.executeTool(timeRequest);
    
    console.log('getCurrentTime tool response:');
    console.log(`- Result: ${timeResponse.result}`);
    console.log(`- Error: ${timeResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(timeResponse.metadata)}`);
    
    // Execute the calculate tool
    console.log('\nExecuting calculate tool via Lambda...');
    
    const calculateRequest: ToolRequest = {
      tool: 'calculate',
      parameters: {
        operation: 'add',
        a: 5,
        b: 3,
      },
    };
    
    const calculateResponse = await gateway.executeTool(calculateRequest);
    
    console.log('calculate tool response:');
    console.log(`- Result: ${calculateResponse.result}`);
    console.log(`- Error: ${calculateResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(calculateResponse.metadata)}`);
    
    // Try with an invalid operation
    console.log('\nExecuting calculate tool with invalid operation via Lambda...');
    
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
    
    console.log('\nLambda example completed successfully');
  } catch (error) {
    console.error('Error in Lambda example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runLambdaExample();
}

export default runLambdaExample;