/**
 * Tests for tool registry
 */
import { Tool } from '../models/tool';
import { InMemoryToolRegistry } from '../services/tool-registry';

describe('InMemoryToolRegistry', () => {
  let registry: InMemoryToolRegistry;
  
  beforeEach(() => {
    registry = new InMemoryToolRegistry();
  });
  
  it('should initialize empty', () => {
    expect(registry.getAllTools()).toHaveLength(0);
  });
  
  it('should register a tool', () => {
    const tool: Tool = {
      name: 'test',
      description: 'Test tool',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result',
      },
      function: () => 'test',
    };
    
    registry.registerTool(tool);
    
    expect(registry.getAllTools()).toHaveLength(1);
    expect(registry.hasTool('test')).toBe(true);
    expect(registry.getTool('test')).toEqual(tool);
  });
  
  it('should unregister a tool', () => {
    const tool: Tool = {
      name: 'test',
      description: 'Test tool',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result',
      },
      function: () => 'test',
    };
    
    registry.registerTool(tool);
    expect(registry.hasTool('test')).toBe(true);
    
    registry.unregisterTool('test');
    expect(registry.hasTool('test')).toBe(false);
    expect(registry.getTool('test')).toBeNull();
  });
  
  it('should overwrite a tool with the same name', () => {
    const tool1: Tool = {
      name: 'test',
      description: 'Test tool 1',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result 1',
      },
      function: () => 'test1',
    };
    
    const tool2: Tool = {
      name: 'test',
      description: 'Test tool 2',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result 2',
      },
      function: () => 'test2',
    };
    
    registry.registerTool(tool1);
    registry.registerTool(tool2);
    
    expect(registry.getAllTools()).toHaveLength(1);
    expect(registry.getTool('test')).toEqual(tool2);
  });
  
  it('should return null for non-existent tools', () => {
    expect(registry.getTool('nonexistent')).toBeNull();
  });
  
  it('should return all registered tools', () => {
    const tool1: Tool = {
      name: 'test1',
      description: 'Test tool 1',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result 1',
      },
      function: () => 'test1',
    };
    
    const tool2: Tool = {
      name: 'test2',
      description: 'Test tool 2',
      parameters: [],
      returns: {
        type: 'string',
        description: 'Test result 2',
      },
      function: () => 'test2',
    };
    
    registry.registerTool(tool1);
    registry.registerTool(tool2);
    
    const tools = registry.getAllTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContainEqual(tool1);
    expect(tools).toContainEqual(tool2);
  });
});