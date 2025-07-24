/**
 * Tests for tool gateway
 */
import { Tool, ToolRequest } from '../models/tool';
import { ToolGatewayService, ToolGatewayProviderType } from '../services/tool-gateway';

describe('ToolGatewayService', () => {
  it('should initialize with local provider', () => {
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
    });
    
    expect(gateway).toBeDefined();
    expect(gateway.getRegistry()).toBeDefined();
    expect(gateway.getExecutor()).toBeDefined();
  });
  
  it('should initialize with tools', () => {
    const tools: Tool[] = [
      {
        name: 'test',
        description: 'Test tool',
        parameters: [],
        returns: {
          type: 'string',
          description: 'Test result',
        },
        function: () => 'test result',
      },
    ];
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
      tools,
    });
    
    expect(gateway.getRegistry().getAllTools()).toHaveLength(1);
    expect(gateway.getRegistry().hasTool('test')).toBe(true);
  });
  
  it('should register tools', () => {
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
    });
    
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
    
    gateway.registerTool(tool);
    
    expect(gateway.getRegistry().getAllTools()).toHaveLength(1);
    expect(gateway.getRegistry().hasTool('test')).toBe(true);
  });
  
  it('should execute tools', async () => {
    const tools: Tool[] = [
      {
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
      },
    ];
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
      tools,
    });
    
    const request: ToolRequest = {
      tool: 'add',
      parameters: {
        a: 2,
        b: 3,
      },
    };
    
    const response = await gateway.executeTool(request);
    
    expect(response.result).toBe(5);
    expect(response.error).toBeUndefined();
  });
  
  it('should handle tool execution errors', async () => {
    const tools: Tool[] = [
      {
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
      },
    ];
    
    const gateway = new ToolGatewayService({
      providerType: ToolGatewayProviderType.LOCAL,
      tools,
    });
    
    const request: ToolRequest = {
      tool: 'error',
      parameters: {},
    };
    
    const response = await gateway.executeTool(request);
    
    expect(response.result).toBeNull();
    expect(response.error).toBe('Test error');
  });
  
  it('should throw for unsupported provider types', () => {
    expect(() => {
      new ToolGatewayService({
        // @ts-ignore - Testing invalid provider type
        providerType: 'invalid',
      });
    }).toThrow('Unsupported tool gateway provider type: invalid');
  });
});