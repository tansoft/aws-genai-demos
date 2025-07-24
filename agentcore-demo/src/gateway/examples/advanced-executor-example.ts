/**
 * Example of using the advanced tool executor
 */
import { logger } from '../../common';
import { 
  Tool, 
  ToolRequest, 
  ToolRegistry 
} from '../models/tool';
import { InMemoryToolRegistry } from '../services/tool-registry';
import { AdvancedToolExecutor } from '../services/advanced-tool-executor';

/**
 * Run the advanced executor example
 */
async function runAdvancedExecutorExample() {
  try {
    console.log('Starting advanced executor example...');
    
    // Create a registry
    const registry = new InMemoryToolRegistry();
    
    // Create an advanced executor with metrics and tracing
    const executor = new AdvancedToolExecutor(registry, {
      maxRetries: 3,
      retryDelay: 100,
      timeout: 5000,
      collectMetrics: true,
      enableTracing: true,
    });
    
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
      {
        name: 'slow',
        description: 'A slow tool that takes time to execute',
        parameters: [
          {
            name: 'delay',
            type: 'number',
            description: 'The delay in milliseconds',
            required: true,
          },
        ],
        returns: {
          type: 'string',
          description: 'Success message',
        },
        function: (params: any) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(`Completed after ${params.delay}ms`);
            }, params.delay);
          });
        },
      },
      {
        name: 'timeout',
        description: 'A tool that always times out',
        parameters: [],
        returns: {
          type: 'string',
          description: 'Never returns',
        },
        function: () => {
          return new Promise((resolve) => {
            // This will timeout before resolving
            setTimeout(() => {
              resolve('This should never be returned');
            }, 10000);
          });
        },
      },
    ];
    
    // Register the tools
    for (const tool of tools) {
      registry.registerTool(tool);
    }
    
    console.log(`Registered ${tools.length} tools`);
    
    // Execute the hello tool
    console.log('\nExecuting hello tool...');
    
    const helloRequest: ToolRequest = {
      tool: 'hello',
      parameters: {
        name: 'World',
      },
    };
    
    const helloResponse = await executor.executeTool(helloRequest);
    
    console.log('Hello tool response:');
    console.log(`- Result: ${helloResponse.result}`);
    console.log(`- Error: ${helloResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(helloResponse.metadata)}`);
    
    // Execute the flaky tool multiple times to demonstrate retries
    console.log('\nExecuting flaky tool multiple times...');
    
    const flakyRequest: ToolRequest = {
      tool: 'flaky',
      parameters: {},
    };
    
    for (let i = 0; i < 4; i++) {
      console.log(`\nFlaky tool execution ${i + 1}:`);
      
      const flakyResponse = await executor.executeTool(flakyRequest);
      
      console.log(`- Result: ${flakyResponse.result}`);
      console.log(`- Error: ${flakyResponse.error || 'None'}`);
      console.log(`- Metadata: ${JSON.stringify(flakyResponse.metadata)}`);
    }
    
    // Execute the slow tool
    console.log('\nExecuting slow tool...');
    
    const slowRequest: ToolRequest = {
      tool: 'slow',
      parameters: {
        delay: 2000,
      },
    };
    
    const slowResponse = await executor.executeTool(slowRequest);
    
    console.log('Slow tool response:');
    console.log(`- Result: ${slowResponse.result}`);
    console.log(`- Error: ${slowResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(slowResponse.metadata)}`);
    
    // Execute the timeout tool
    console.log('\nExecuting timeout tool...');
    
    const timeoutRequest: ToolRequest = {
      tool: 'timeout',
      parameters: {},
    };
    
    const timeoutResponse = await executor.executeTool(timeoutRequest);
    
    console.log('Timeout tool response:');
    console.log(`- Result: ${timeoutResponse.result}`);
    console.log(`- Error: ${timeoutResponse.error || 'None'}`);
    console.log(`- Metadata: ${JSON.stringify(timeoutResponse.metadata)}`);
    
    // Get metrics
    console.log('\nTool execution metrics:');
    console.log(JSON.stringify(executor.getMetrics(), null, 2));
    
    console.log('\nAdvanced executor example completed successfully');
  } catch (error) {
    console.error('Error in advanced executor example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAdvancedExecutorExample();
}

export default runAdvancedExecutorExample;