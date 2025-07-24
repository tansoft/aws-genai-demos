/**
 * Example of using the tool gateway
 */
import { logger } from '../../common';
import { 
  Tool, 
  ToolRequest, 
  ToolGatewayService, 
  ToolGatewayProviderType 
} from '../';

/**
 * Run the gateway example
 */
async function runGatewayExample() {
  try {
    console.log('Starting gateway example...');
    
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
        name: 'randomNumber',
        description: 'Generate a random number',
        parameters: [
          {
            name: 'min',
            type: 'number',
            description: 'The minimum value',
            required: true,
          },
          {
            name: 'max',
            type: 'number',
            description: 'The maximum value',
            required: true,
          },
        ],
        returns: {
          type: 'number',
          description: 'A random number between min and max',
        },
        function: (params: any) => {
          const { min, max } = params;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
      },
      {
        name: 'currentWeather',
        description: 'Get the current weather for a location',
        parameters: [
          {
            name: 'location',
            type: 'string',
            description: 'The location to get weather for',
            required: true,
          },
        ],
        returns: {
          type: 'object',
          description: 'Weather information',
        },
        function: (params: any) => {
          // This is a mock implementation
          const locations: Record<string, any> = {
            'new york': { temperature: 72, condition: 'Sunny', humidity: 45 },
            'london': { temperature: 62, condition: 'Cloudy', humidity: 80 },
            'tokyo': { temperature: 85, condition: 'Rainy', humidity: 90 },
            'sydney': { temperature: 70, condition: 'Clear', humidity: 50 },
          };
          
          const location = params.location.toLowerCase();
          
          if (locations[location]) {
            return locations[location];
          }
          
          return { error: 'Location not found' };
        },
      },
    ];
    
    // Initialize the tool gateway with local provider
    console.log('Initializing tool gateway with local provider...');
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
      tools,
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
    };
    
    const helloResponse = await gateway.executeTool(helloRequest);
    
    console.log('Hello tool response:');
    console.log(`- Result: ${helloResponse.result}`);
    console.log(`- Error: ${helloResponse.error || 'None'}`);
    
    // Execute the randomNumber tool
    console.log('\nExecuting randomNumber tool...');
    
    const randomRequest: ToolRequest = {
      tool: 'randomNumber',
      parameters: {
        min: 1,
        max: 100,
      },
    };
    
    const randomResponse = await gateway.executeTool(randomRequest);
    
    console.log('Random number tool response:');
    console.log(`- Result: ${randomResponse.result}`);
    console.log(`- Error: ${randomResponse.error || 'None'}`);
    
    // Execute the currentWeather tool
    console.log('\nExecuting currentWeather tool...');
    
    const weatherRequest: ToolRequest = {
      tool: 'currentWeather',
      parameters: {
        location: 'New York',
      },
    };
    
    const weatherResponse = await gateway.executeTool(weatherRequest);
    
    console.log('Current weather tool response:');
    console.log(`- Result: ${JSON.stringify(weatherResponse.result)}`);
    console.log(`- Error: ${weatherResponse.error || 'None'}`);
    
    // Try with invalid parameters
    console.log('\nExecuting hello tool with missing parameters...');
    
    const invalidRequest: ToolRequest = {
      tool: 'hello',
      parameters: {},
    };
    
    const invalidResponse = await gateway.executeTool(invalidRequest);
    
    console.log('Invalid parameters response:');
    console.log(`- Result: ${invalidResponse.result}`);
    console.log(`- Error: ${invalidResponse.error || 'None'}`);
    
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
    
    // Register a new tool at runtime
    console.log('\nRegistering a new tool at runtime...');
    
    const newTool: Tool = {
      name: 'reverse',
      description: 'Reverse a string',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'The text to reverse',
          required: true,
        },
      ],
      returns: {
        type: 'string',
        description: 'The reversed text',
      },
      function: (params: any) => params.text.split('').reverse().join(''),
    };
    
    gateway.registerTool(newTool);
    
    console.log('New tool registered');
    
    // Execute the new tool
    console.log('\nExecuting the new reverse tool...');
    
    const reverseRequest: ToolRequest = {
      tool: 'reverse',
      parameters: {
        text: 'Hello, World!',
      },
    };
    
    const reverseResponse = await gateway.executeTool(reverseRequest);
    
    console.log('Reverse tool response:');
    console.log(`- Result: ${reverseResponse.result}`);
    console.log(`- Error: ${reverseResponse.error || 'None'}`);
    
    console.log('\nGateway example completed successfully');
  } catch (error) {
    console.error('Error in gateway example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runGatewayExample();
}

export default runGatewayExample;