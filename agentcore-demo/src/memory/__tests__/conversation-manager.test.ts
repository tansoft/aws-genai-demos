import { ConversationManager } from '../services';

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  
  beforeEach(() => {
    conversationManager = new ConversationManager(undefined, {
      maxMessages: 10,
      maxConversations: 5,
    });
  });
  
  test('should start a conversation', async () => {
    const conversationId = await conversationManager.startConversation({ topic: 'test' });
    expect(conversationId).toBeDefined();
  });
  
  test('should add messages of different roles', async () => {
    const conversationId = await conversationManager.startConversation();
    
    const systemMsg = await conversationManager.addSystemMessage(
      conversationId, 
      'System message'
    );
    expect(systemMsg.role).toBe('system');
    
    const userMsg = await conversationManager.addUserMessage(
      conversationId, 
      'User message'
    );
    expect(userMsg.role).toBe('user');
    
    const assistantMsg = await conversationManager.addAssistantMessage(
      conversationId, 
      'Assistant message'
    );
    expect(assistantMsg.role).toBe('assistant');
    
    const toolMsg = await conversationManager.addToolMessage(
      conversationId, 
      'Tool message'
    );
    expect(toolMsg.role).toBe('tool');
    
    const history = await conversationManager.getConversationHistory(conversationId);
    expect(history.length).toBe(4);
  });
  
  test('should get formatted history for different providers', async () => {
    const conversationId = await conversationManager.startConversation();
    
    await conversationManager.addSystemMessage(conversationId, 'System message');
    await conversationManager.addUserMessage(conversationId, 'User message');
    await conversationManager.addAssistantMessage(conversationId, 'Assistant message');
    await conversationManager.addToolMessage(conversationId, 'Tool message');
    
    const openaiHistory = await conversationManager.getFormattedHistory(conversationId, 'openai');
    expect(openaiHistory.length).toBe(4);
    expect(openaiHistory[0].role).toBe('system');
    expect(openaiHistory[3].role).toBe('tool');
    
    const anthropicHistory = await conversationManager.getFormattedHistory(conversationId, 'anthropic');
    expect(anthropicHistory.length).toBe(4);
    expect(anthropicHistory[0].role).toBe('system');
    // Anthropic doesn't have a tool role, so it should be mapped to assistant
    expect(anthropicHistory[3].role).toBe('assistant');
  });
  
  test('should summarize a conversation', async () => {
    const conversationId = await conversationManager.startConversation();
    
    await conversationManager.addSystemMessage(conversationId, 'You are a helpful assistant.');
    await conversationManager.addUserMessage(conversationId, 'Hello, how are you?');
    await conversationManager.addAssistantMessage(conversationId, 'I am doing well, thank you for asking!');
    await conversationManager.addUserMessage(conversationId, 'Can you help me with a question?');
    await conversationManager.addAssistantMessage(conversationId, 'Of course, I would be happy to help!');
    
    const summary = await conversationManager.summarizeConversation(conversationId);
    expect(summary).toContain('system: You are a helpful assistant.');
    expect(summary).toContain('user: Can you help me with a question?');
    expect(summary).toContain('assistant: Of course, I would be happy to help!');
  });
  
  test('should delete a conversation', async () => {
    const conversationId = await conversationManager.startConversation();
    await conversationManager.addUserMessage(conversationId, 'Test message');
    
    const result = await conversationManager.deleteConversation(conversationId);
    expect(result).toBe(true);
    
    // Try to get history after deletion
    try {
      await conversationManager.getConversationHistory(conversationId);
      fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Conversation not found');
    }
  });
});