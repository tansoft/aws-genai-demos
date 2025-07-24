import { HybridMemoryManager, ShortTermMemoryManager, DynamoDBMemoryManager } from '../services';

// Mock the DynamoDB memory manager
jest.mock('../services/dynamodb-memory');

describe('HybridMemoryManager', () => {
  let hybridMemory: HybridMemoryManager;
  let mockShortTermMemory: jest.Mocked<ShortTermMemoryManager>;
  let mockLongTermMemory: jest.Mocked<DynamoDBMemoryManager>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock memory managers
    mockShortTermMemory = {
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
    
    mockLongTermMemory = {
      getConversation: jest.fn(),
      createConversation: jest.fn(),
      addMessage: jest.fn(),
      getMessages: jest.fn(),
      storeItem: jest.fn(),
      getItem: jest.fn(),
      searchByTags: jest.fn(),
      deleteItem: jest.fn(),
      deleteConversation: jest.fn(),
    } as unknown as jest.Mocked<DynamoDBMemoryManager>;
    
    // Mock the DynamoDB memory manager constructor
    (DynamoDBMemoryManager as jest.Mock).mockImplementation(() => mockLongTermMemory);
    
    // Create the hybrid memory manager
    hybridMemory = new HybridMemoryManager({
      longTerm: {
        tableName: 'test-table',
        region: 'us-west-2',
      },
      syncInterval: 100, // Short interval for testing
    });
    
    // Replace the short-term memory with our mock
    (hybridMemory as any).shortTermMemory = mockShortTermMemory;
  });
  
  afterEach(() => {
    // Stop the sync timer
    hybridMemory.stopSyncTimer();
  });
  
  test('should create a conversation in short-term memory', async () => {
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockShortTermMemory.createConversation.mockResolvedValueOnce(mockConversation);
    
    const conversation = await hybridMemory.createConversation({ topic: 'test' });
    
    expect(conversation).toBe(mockConversation);
    expect(mockShortTermMemory.createConversation).toHaveBeenCalledWith({ topic: 'test' });
    
    // Verify that the conversation is marked for sync
    expect((hybridMemory as any).pendingSync.has('123')).toBe(true);
  });
  
  test('should get a conversation from short-term memory first', async () => {
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockShortTermMemory.getConversation.mockResolvedValueOnce(mockConversation);
    
    const conversation = await hybridMemory.getConversation('123');
    
    expect(conversation).toBe(mockConversation);
    expect(mockShortTermMemory.getConversation).toHaveBeenCalledWith('123');
    expect(mockLongTermMemory.getConversation).not.toHaveBeenCalled();
  });
  
  test('should fall back to long-term memory if not in short-term', async () => {
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockShortTermMemory.getConversation.mockResolvedValueOnce(null);
    mockLongTermMemory.getConversation.mockResolvedValueOnce(mockConversation);
    
    const conversation = await hybridMemory.getConversation('123');
    
    expect(conversation).toBe(mockConversation);
    expect(mockShortTermMemory.getConversation).toHaveBeenCalledWith('123');
    expect(mockLongTermMemory.getConversation).toHaveBeenCalledWith('123');
  });
  
  test('should add a message to short-term memory and mark for sync', async () => {
    const mockMessage = {
      id: '456',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    };
    
    mockShortTermMemory.addMessage.mockResolvedValueOnce(mockMessage);
    
    const message = await hybridMemory.addMessage('123', {
      role: 'user',
      content: 'Hello',
    });
    
    expect(message).toBe(mockMessage);
    expect(mockShortTermMemory.addMessage).toHaveBeenCalledWith('123', {
      role: 'user',
      content: 'Hello',
    });
    
    // Verify that the conversation is marked for sync
    expect((hybridMemory as any).pendingSync.has('123')).toBe(true);
  });
  
  test('should store items in both short-term and long-term memory', async () => {
    const mockItem = {
      key: 'test-key',
      value: { value: 'test' },
      tags: ['tag1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockShortTermMemory.storeItem.mockResolvedValueOnce(mockItem);
    mockLongTermMemory.storeItem.mockResolvedValueOnce(mockItem);
    
    const item = await hybridMemory.storeItem('test-key', { value: 'test' }, ['tag1']);
    
    expect(item).toBe(mockItem);
    expect(mockShortTermMemory.storeItem).toHaveBeenCalledWith(
      'test-key',
      { value: 'test' },
      ['tag1'],
      undefined
    );
    expect(mockLongTermMemory.storeItem).toHaveBeenCalledWith(
      'test-key',
      { value: 'test' },
      ['tag1'],
      undefined
    );
  });
  
  test('should search by tags in both short-term and long-term memory', async () => {
    const mockShortTermItems = [
      {
        key: 'key1',
        value: { value: 1 },
        tags: ['tag1', 'tag2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    const mockLongTermItems = [
      {
        key: 'key2',
        value: { value: 2 },
        tags: ['tag1', 'tag3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    mockShortTermMemory.searchByTags.mockResolvedValueOnce(mockShortTermItems);
    mockLongTermMemory.searchByTags.mockResolvedValueOnce(mockLongTermItems);
    
    const items = await hybridMemory.searchByTags(['tag1']);
    
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(mockShortTermItems[0]);
    expect(items[1]).toBe(mockLongTermItems[0]);
    expect(mockShortTermMemory.searchByTags).toHaveBeenCalledWith(['tag1'], {});
    expect(mockLongTermMemory.searchByTags).toHaveBeenCalledWith(['tag1'], {});
  });
  
  test('should sync conversations to long-term memory', async () => {
    const mockConversation = {
      conversationId: '123',
      messages: [
        {
          id: '456',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Mark a conversation for sync
    (hybridMemory as any).pendingSync.add('123');
    
    // Mock the getConversation method
    mockShortTermMemory.getConversation.mockResolvedValueOnce(mockConversation);
    mockLongTermMemory.getConversation.mockResolvedValueOnce(null);
    
    // Mock the createConversation and addMessage methods
    mockLongTermMemory.createConversation.mockResolvedValueOnce({
      ...mockConversation,
      messages: [],
    });
    mockLongTermMemory.addMessage.mockResolvedValueOnce(mockConversation.messages[0]);
    
    // Force sync
    await hybridMemory.forceSyncAll();
    
    // Verify that the conversation was synced
    expect(mockLongTermMemory.createConversation).toHaveBeenCalledWith(mockConversation.metadata);
    expect(mockLongTermMemory.addMessage).toHaveBeenCalledWith('123', {
      role: 'user',
      content: 'Hello',
      metadata: undefined,
    });
    
    // Verify that the pending sync set is empty
    expect((hybridMemory as any).pendingSync.size).toBe(0);
  });
});