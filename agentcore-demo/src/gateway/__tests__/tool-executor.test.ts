/**
 * Tests for tool executor
 */
import { Tool, ToolRequest } from '../models/tool';
import { InMemoryToolRegistry } from '../services/tool-registry';
import { LocalToolExecutor } from '../services/tool-executor';

describe('LocalToolExecutor', () => {
  let registry: InMemoryToolRegistry;
  let executor: LocalToolExecutor;
  
  beforeEach(() => {
    registry = new InMemoryToolRegistry();
    executor = new LocalToolExecutor(registry);
  });
  
  it('should execute a tool', async () => {
    const tool: Tool = {
      name: 'test',
      description: 'Test tool',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result',
      },
      function: () => 'test result',
    };
    
    registry.registerTool(tool);
    
    const request: ToolRequest = {
      tool: 'test',
      parameters: {},
    };
    
    const response = await executor.executeTool(request);
    
    expect(response.result).toBe('test result');
    expect(response.error).toBeUndefined();
  });
  
  it('should handle tool parameters', async () => {
    const tool: Tool = {
      name: 'add',
      description: 'Add two numbers',
      parameters: [
        {
          name: 'a',
          type: 'number',
          description: 'First number',
          required: true,
        },
        {
          name: 'b',
          type: 'number',
          description: 'Second number',
          required: true,
        },
      ],
      returns: {
        type: 'number',
        description: 'Sum of a and b',
      },
      function: (params: any) => params.a + params.b,
    };
    
    registry.registerTool(tool);
    
    const request: ToolRequest = {
      tool: 'add',
      parameters: {
        a: 2,
        b: 3,
      },
    };
    
    const response = await executor.executeTool(request);
    
    expect(response.result).toBe(5);
    expect(response.error).toBeUndefined();
  });
  
  it('should handle missing required parameters', async () => {
    const tool: Tool = {
      name: 'add',
      description: 'Add two numbers',
      parameters: [
        {
          name: 'a',
          type: 'number',
          description: 'First number',
          required: true,
        },
        {
          name: 'b',
          type: 'number',
          description: 'Second number',
          required: true,
        },
      ],
      returns: {
        type: 'number',
        description: 'Sum of a and b',
      },
      function: (params: any) => params.a + params.b,
    };
    
    registry.registerTool(tool);
    
    const request: ToolRequest = {
      tool: 'add',
      parameters: {
        a: 2,
      },
    };
    
    const response = await executor.executeTool(request);
    
    expect(response.result).toBeNull();
    expect(response.error).toBe('Missing required parameter: b');
  });
  
  it('should handle non-existent tools', async () => {
    const request: ToolRequest = {
      tool: 'nonexistent',
      parameters: {},
    };
    
    const response = await executor.executeTool(request);
    
    expect(response.result).toBeNull();
    expect(response.error).toBe('Tool not found: nonexistent');
  });
  
  it('should handle tool execution errors', async () => {
    const tool: Tool = {
      name: 'error',
      description: 'Tool that throws an error',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Never returns',
      },
      function: () => {
        throw new Error('Test error');
      },
    };
    
    registry.registerTool(tool);
    
    const request: ToolRequest = {
      tool: 'error',
      parameters: {},
    };
    
    const response = await executor.executeTool(request);
    
    expect(response.result).toBeNull();
    expect(response.error).toBe('Test error');
  });
  
  it('should retry tool execution on error', async () => {
    let attempts = 0;
    
    const tool: Tool = {
      name: 'flaky',
      description: 'Tool that succeeds on the second attempt',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Success message',
      },
      function: () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('First attempt failed');
        }
        return 'Success on retry';
      },
    };
    
    registry.registerTool(tool);
    
    // Create executor with 3 retries
    const retryExecutor = new LocalToolExecutor(registry, 3);
    
    const request: ToolRequest = {
      tool: 'flaky',
      parameters: {},
    };
    
    const response = await retryExecutor.executeTool(request);
    
    expect(attempts).toBe(2);
    expect(response.result).toBe('Success on retry');
    expect(response.error).toBeUndefined();
  });
});