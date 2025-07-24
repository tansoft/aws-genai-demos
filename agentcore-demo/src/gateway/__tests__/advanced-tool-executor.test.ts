/**
 * Tests for advanced tool executor
 */
import { Tool, ToolRequest } from '../models/tool';
import { InMemoryToolRegistry } from '../services/tool-registry';
import { AdvancedToolExecutor } from '../services/advanced-tool-executor';

describe('AdvancedToolExecutor', () => {
  let registry: InMemoryToolRegistry;
  let executor: AdvancedToolExecutor;
  
  beforeEach(() => {
    registry = new InMemoryToolRegistry();
    executor = new AdvancedToolExecutor(registry, {
      maxRetries: 3,
      retryDelay: 10,
      timeout: 1000,
      collectMetrics: true,
      enableTracing: false,
    });
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
    expect(response.metadata).toBeDefined();
    expect(response.metadata?.toolName).toBe('test');
    expect(response.metadata?.requestId).toBeDefined();
    expect(response.metadata?.timestamp).toBeDefined();
    expect(response.metadata?.retries).toBe(0);
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
    
    const request: ToolRequest = {
      tool: 'flaky',
      parameters: {},
    };
    
    const response = await executor.executeTool(request);
    
    expect(attempts).toBe(2);
    expect(response.result).toBe('Success on retry');
    expect(response.error).toBeUndefined();
    expect(response.metadata?.retries).toBe(1);
  });
  
  it('should handle timeouts', async () => {
    jest.setTimeout(3000); // Increase test timeout
    
    const tool: Tool = {
      name: 'slow',
      description: 'Tool that takes too long',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Never returns in time',
      },
      function: () => new Promise(resolve => setTimeout(() => resolve('Too late'), 2000)),
    };
    
    registry.registerTool(tool);
    
    // Create executor with short timeout
    const timeoutExecutor = new AdvancedToolExecutor(registry, {
      timeout: 500,
      maxRetries: 1,
    });
    
    const request: ToolRequest = {
      tool: 'slow',
      parameters: {},
    };
    
    const response = await timeoutExecutor.executeTool(request);
    
    expect(response.result).toBeNull();
    expect(response.error).toContain('timed out');
  });
  
  it('should collect metrics', async () => {
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
    
    await executor.executeTool(request);
    
    const metrics = executor.getMetrics();
    expect(metrics.test).toBeDefined();
    expect(metrics.test.executions).toBe(1);
    expect(metrics.test.successes).toBe(1);
    expect(metrics.test.errors).toBe(0);
    
    // Reset metrics
    executor.resetMetrics();
    
    const resetMetrics = executor.getMetrics();
    expect(Object.keys(resetMetrics).length).toBe(0);
  });
});