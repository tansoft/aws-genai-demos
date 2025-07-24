import { SecureMemoryManager, ShortTermMemoryManager } from '../services';

describe('SecureMemoryManager', () => {
  let secureMemory: SecureMemoryManager;
  let mockBaseMemory: jest.Mocked<ShortTermMemoryManager>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock base memory manager
    mockBaseMemory = {
      getConversation: jest.fn(),
      createConversation: jest.fn(),
      addMessage: jest.fn(),
      getMessages: jest.fn(),
      storeItem: jest.fn(),
      getItem: jest.fn(),
      searchByTags: jest.fn(),
      deleteItem: jest.fn(),
      deleteConversation: jest.fn(),
    } as unknown as jest.Mocked<ShortTermMemoryManager>;
    
    // Create the secure memory manager
    secureMemory = new SecureMemoryManager(mockBaseMemory, {
      encryptionKey: 'this-is-a-very-secure-encryption-key-12345',
    });
  });
  
  test('should create a conversation with security metadata', async () => {
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: {
        topic: 'test',
        security: {
          encrypted: true,
          accessControl: undefined,
          createdAt: expect.any(String),
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockBaseMemory.createConversation.mockResolvedValueOnce(mockConversation);
    
    const conversation = await secureMemory.createConversation({ topic: 'test' });
    
    expect(conversation).toBe(mockConversation);
    expect(mockBaseMemory.createConversation).toHaveBeenCalledWith({
      topic: 'test',
      security: {
        encrypted: true,
        accessControl: undefined,
        createdAt: expect.any(String),
      },
    });
  });
  
  test('should encrypt and decrypt messages with sensitive information', async () => {
    // Mock the addMessage method
    mockBaseMemory.addMessage.mockImplementation(async (conversationId, message) => {
      return {
        id: '456',
        ...message,
        timestamp: Date.now(),
      };
    });
    
    // Add a message with sensitive information (email)
    const message = await secureMemory.addMessage('123', {
      role: 'user',
      content: 'My email is test@example.com',
    });
    
    // The message should be encrypted
    expect(message.content).not.toBe('My email is test@example.com');
    expect(message.metadata?.encrypted).toBe(true);
    expect(message.metadata?.containsSensitiveInfo).toBe(true);
    
    // Mock the getMessages method
    mockBaseMemory.getMessages.mockResolvedValueOnce([message]);
    
    // Get the messages
    const messages = await secureMemory.getMessages('123');
    
    // The message should be decrypted and redacted
    expect(messages[0].content).toBe('My email is [REDACTED]');
    expect(messages[0].metadata?.wasEncrypted).toBe(true);
  });
  
  test('should encrypt and decrypt items', async () => {
    // Mock the storeItem method
    mockBaseMemory.storeItem.mockImplementation(async (key, value, tags, ttl) => {
      return {
        key,
        value,
        tags,
        ttl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    
    // Store an item
    const item = await secureMemory.storeItem('test-key', { value: 'test' }, ['tag1']);
    
    // The item should be encrypted
    expect(typeof item.value).toBe('string');
    expect(item.value).not.toBe('test');
    expect(item.tags).toContain('encrypted');
    
    // Mock the getItem method
    mockBaseMemory.getItem.mockResolvedValueOnce(item);
    
    // Get the item
    const retrievedItem = await secureMemory.getItem('test-key');
    
    // The item should be decrypted
    expect(retrievedItem?.value).toEqual({ value: 'test' });
    expect(retrievedItem?.tags).not.toContain('encrypted');
  });
  
  test('should search by tags and decrypt items', async () => {
    // Mock the storeItem method
    mockBaseMemory.storeItem.mockImplementation(async (key, value, tags, ttl) => {
      return {
        key,
        value,
        tags,
        ttl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    
    // Store two items
    const item1 = await secureMemory.storeItem('key1', { value: 1 }, ['tag1', 'tag2']);
    const item2 = await secureMemory.storeItem('key2', { value: 2 }, ['tag2', 'tag3']);
    
    // Mock the searchByTags method
    mockBaseMemory.searchByTags.mockResolvedValueOnce([item1, item2]);
    
    // Search for items
    const items = await secureMemory.searchByTags(['tag2']);
    
    // The items should be decrypted
    expect(items[0].value).toEqual({ value: 1 });
    expect(items[1].value).toEqual({ value: 2 });
    expect(items[0].tags).not.toContain('encrypted');
    expect(items[1].tags).not.toContain('encrypted');
  });
  
  test('should redact sensitive information', async () => {
    // Create a conversation with sensitive information
    const mockConversation = {
      conversationId: '123',
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'My email is test@example.com and my phone is 123-456-7890',
          timestamp: Date.now(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'I will not store your email test@example.com or phone 123-456-7890',
          timestamp: Date.now(),
        },
      ],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Mock the getConversation method
    mockBaseMemory.getConversation.mockResolvedValueOnce(mockConversation);
    
    // Get the conversation
    const conversation = await secureMemory.getConversation('123');
    
    // The messages should be redacted
    expect(conversation?.messages[0].content).toBe('My email is [REDACTED] and my phone is [REDACTED]');
    expect(conversation?.messages[1].content).toBe('I will not store your email [REDACTED] or phone [REDACTED]');
  });
});