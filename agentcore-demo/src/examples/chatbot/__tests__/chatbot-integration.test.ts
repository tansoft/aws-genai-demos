/**
 * Integration tests for chatbot example
 */

import { ChatbotService } from '../chatbot-service';
import { RuntimeService } from '../../../runtime/services/runtime-service';
import { ConversationManager } from '../../../memory/services/conversation-manager';
import { ShortTermMemory } from '../../../memory/services/short-term-memory';
import { ToolExecutor } from '../../../gateway/services/tool-executor';
import { createObservabilityManager } from '../../../observability';
import { getToolDefinitions } from '../example-tools';
import { MessageRole } from '../models';

// Mock runtime service
jest.mock('../../../runtime/services/runtime-service', () => {
  return {
    RuntimeService: jest.fn().mockImplementation(() => ({
      generateResponse: jest.fn().mockImplementation(async (options) => {
        // Check if this is a tool call request
        if (options.messages.some(m => m.content.toLowerCase().includes('weather'))) {
          return {
            role: MessageRole.ASSISTANT,
            content: 'I\'ll check the weather for you.',
            toolCalls: [
              {
                id: 'weather-call-1',
                type: 'function',
                function: {
                  name: 'getWeather',
                  arguments: JSON.stringify({ location: 'New York' })
                }
              }
            ]
          };
        }
        
        // Check if this is a follow-up to a tool call
        if (options.messages.some(m => m.role === MessageRole.TOOL)) {
          return {
            role: MessageRole.ASSISTANT,
            content: 'Based on the information I retrieved, the weather in New York is sunny with a temperature of 75°F (24°C).'
          };
        }
        
        // Default response
        return {
          role: MessageRole.ASSISTANT,
          content: 'Hello! How can I help you today?'
        };
      })
    }))
  };
});

describe('Chatbot Integration', () => {
  let chatbot: ChatbotService;
  let runtimeService: RuntimeService;
  let conversationManager: ConversationManager;
  let toolExecutor: ToolExecutor;
  
  beforeEach(() => {
    // Set up dependencies
    runtimeService = new RuntimeService({} as any, {} as any);
    
    const shortTermMemory = new ShortTermMemory();
    conversationManager = new ConversationManager(shortTermMemory);
    
    toolExecutor = new ToolExecutor();
    const toolDefinitions = getToolDefinitions();
    
    // Register tools
    for (const tool of toolDefinitions) {
      toolExecutor.registerTool(
        tool.name,
        tool.description,
        tool.parameters,
        tool.function
      );
    }
    
    const observability = createObservabilityManager({
      serviceName: 'chatbot-test'
    });
    
    // Create chatbot service
    chatbot = new ChatbotService(
      {
        name: 'Test Chatbot',
        modelProvider: 'openai',
        modelName: 'gpt-3.5-turbo',
        memoryEnabled: true,
        toolsEnabled: true
      },
      runtimeService,
      conversationManager,
      toolExecutor,
      observability
    );
  });
  
  it('should handle a simple conversation', async () => {
    // Create a session
    const session = chatbot.createSession('test-user');
    expect(session).toBeDefined();
    
    // Send a message
    const response = await chatbot.sendMessage(session, 'Hello');
    
    // Check response
    expect(response).toBeDefined();
    expect(response.role).toBe(MessageRole.ASSISTANT);
    expect(response.content).toBe('Hello! How can I help you today?');
    
    // Check session state
    expect(session.messages).toHaveLength(3);
    expect(session.messages[0].role).toBe(MessageRole.SYSTEM);
    expect(session.messages[1].role).toBe(MessageRole.USER);
    expect(session.messages[2].role).toBe(MessageRole.ASSISTANT);
  });
  
  it('should handle tool calls', async () => {
    // Create a session
    const session = chatbot.createSession('test-user');
    
    // Send a message that triggers a tool call
    const response = await chatbot.sendMessage(session, 'What\'s the weather in New York?');
    
    // Check response
    expect(response).toBeDefined();
    expect(response.role).toBe(MessageRole.ASSISTANT);
    expect(response.content).toContain('weather in New York');
    
    // Check session state
    expect(session.messages).toHaveLength(5);
    expect(session.messages[0].role).toBe(MessageRole.SYSTEM);
    expect(session.messages[1].role).toBe(MessageRole.USER);
    expect(session.messages[2].role).toBe(MessageRole.ASSISTANT);
    expect(session.messages[3].role).toBe(MessageRole.TOOL);
    expect(session.messages[4].role).toBe(MessageRole.ASSISTANT);
    
    // Check tool response
    const toolResponse = session.messages[3];
    expect(toolResponse.toolCallId).toBe('weather-call-1');
    expect(toolResponse.content).toBeDefined();
    
    // Parse tool response content
    const toolResult = JSON.parse(toolResponse.content);
    expect(toolResult.location).toBe('New York');
    expect(toolResult.condition).toBeDefined();
    expect(toolResult.temperature).toBeDefined();
  });
  
  it('should maintain conversation context across messages', async () => {
    // Create a session
    const session = chatbot.createSession('test-user');
    
    // Send first message
    await chatbot.sendMessage(session, 'Hello');
    
    // Send second message
    await chatbot.sendMessage(session, 'How are you?');
    
    // Check session state
    expect(session.messages).toHaveLength(5);
    expect(session.messages[0].role).toBe(MessageRole.SYSTEM);
    expect(session.messages[1].role).toBe(MessageRole.USER);
    expect(session.messages[1].content).toBe('Hello');
    expect(session.messages[2].role).toBe(MessageRole.ASSISTANT);
    expect(session.messages[3].role).toBe(MessageRole.USER);
    expect(session.messages[3].content).toBe('How are you?');
    expect(session.messages[4].role).toBe(MessageRole.ASSISTANT);
  });
});