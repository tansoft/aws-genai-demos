/**
 * Tests for ChatbotService
 */

import { ChatbotService } from '../chatbot-service';
import { MessageRole } from '../models';

// Mock dependencies
const mockRuntimeService = {
  generateResponse: jest.fn().mockImplementation(async (options) => {
    return {
      role: MessageRole.ASSISTANT,
      content: 'This is a mock response',
      toolCalls: options.tools ? [
        {
          id: 'tool-call-1',
          type: 'function',
          function: {
            name: 'getCurrentDateTime',
            arguments: '{}'
          }
        }
      ] : undefined
    };
  })
};

const mockConversationManager = {
  saveConversation: jest.fn(),
  getConversation: jest.fn().mockImplementation(async (sessionId) => {
    if (sessionId === 'existing-session') {
      return {
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: 'You are a helpful assistant.'
          },
          {
            role: MessageRole.USER,
            content: 'Hello'
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'Hi there!'
          }
        ],
        metadata: {
          userId: 'test-user',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:01:00.000Z'
        }
      };
    }
    return null;
  })
};

const mockToolExecutor = {
  executeTool: jest.fn().mockImplementation(async (name, args) => {
    if (name === 'getCurrentDateTime') {
      return {
        date: '1/1/2023',
        time: '12:00:00 PM',
        timestamp: 1672531200000
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  }),
  getAvailableTools: jest.fn().mockReturnValue([
    {
      name: 'getCurrentDateTime',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  ])
};

const mockObservability = {
  getLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn()
  }),
  getMetricsCollector: jest.fn().mockReturnValue({
    putMetric: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined)
  }),
  getTracer: jest.fn().mockReturnValue({
    startSegment: jest.fn().mockReturnValue({ id: 'segment-1', name: 'test', startTime: Date.now() }),
    endSegment: jest.fn(),
    addAnnotation: jest.fn(),
    addMetadata: jest.fn(),
    addError: jest.fn()
  }),
  getConfig: jest.fn().mockReturnValue({})
};

describe('ChatbotService', () => {
  let chatbot: ChatbotService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    chatbot = new ChatbotService(
      {
        name: 'Test Chatbot',
        modelProvider: 'openai',
        modelName: 'gpt-3.5-turbo',
        memoryEnabled: true,
        toolsEnabled: true
      },
      mockRuntimeService as any,
      mockConversationManager as any,
      mockToolExecutor as any,
      mockObservability as any
    );
  });
  
  describe('createSession', () => {
    it('should create a new session with system message', () => {
      const session = chatbot.createSession('test-user');
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('test-user');
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe(MessageRole.SYSTEM);
      
      // Check if conversation was saved
      expect(mockConversationManager.saveConversation).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({
          messages: session.messages,
          metadata: expect.objectContaining({
            userId: 'test-user'
          })
        })
      );
    });
    
    it('should create a session with custom metadata', () => {
      const session = chatbot.createSession('test-user', { source: 'test' });
      
      expect(session.metadata).toEqual({ source: 'test' });
      
      // Check if conversation was saved with metadata
      expect(mockConversationManager.saveConversation).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'test-user',
            source: 'test'
          })
        })
      );
    });
  });
  
  describe('sendMessage', () => {
    it('should process a message and return a response', async () => {
      const session = chatbot.createSession('test-user');
      const response = await chatbot.sendMessage(session, 'Hello');
      
      expect(response).toBeDefined();
      expect(response.role).toBe(MessageRole.ASSISTANT);
      expect(response.content).toBe('This is a mock response');
      
      // Check if runtime service was called
      expect(mockRuntimeService.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: MessageRole.SYSTEM,
              content: expect.any(String)
            }),
            expect.objectContaining({
              role: MessageRole.USER,
              content: 'Hello'
            })
          ])
        })
      );
      
      // Check if session was updated
      expect(session.messages).toHaveLength(3);
      expect(session.messages[1].role).toBe(MessageRole.USER);
      expect(session.messages[1].content).toBe('Hello');
      expect(session.messages[2].role).toBe(MessageRole.ASSISTANT);
      
      // Check if conversation was saved
      expect(mockConversationManager.saveConversation).toHaveBeenCalledTimes(2);
    });
    
    it('should handle tool calls', async () => {
      const session = chatbot.createSession('test-user');
      const response = await chatbot.sendMessage(session, 'What time is it?');
      
      // Check if tool executor was called
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'getCurrentDateTime',
        expect.any(Object)
      );
      
      // Check if tool results were added to session
      expect(session.messages).toHaveLength(4); // system, user, tool, assistant
      expect(session.messages[2].role).toBe(MessageRole.TOOL);
      expect(session.messages[2].toolCallId).toBe('tool-call-1');
      
      // Check if conversation was saved
      expect(mockConversationManager.saveConversation).toHaveBeenCalledTimes(2);
    });
    
    it('should handle errors gracefully', async () => {
      // Mock runtime service to throw an error
      mockRuntimeService.generateResponse.mockRejectedValueOnce(new Error('Test error'));
      
      const session = chatbot.createSession('test-user');
      const response = await chatbot.sendMessage(session, 'Hello');
      
      expect(response).toBeDefined();
      expect(response.role).toBe(MessageRole.ASSISTANT);
      expect(response.content).toContain('I apologize');
      
      // Check if error was logged
      expect(mockObservability.getLogger().error).toHaveBeenCalled();
    });
  });
  
  describe('loadSession', () => {
    it('should load an existing session', async () => {
      const session = await chatbot.loadSession('existing-session');
      
      expect(session).toBeDefined();
      expect(session?.id).toBe('existing-session');
      expect(session?.userId).toBe('test-user');
      expect(session?.messages).toHaveLength(3);
    });
    
    it('should return undefined for non-existent session', async () => {
      const session = await chatbot.loadSession('non-existent-session');
      
      expect(session).toBeUndefined();
    });
  });
});