import { DynamoDBMemoryManager } from '../services';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock the DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');

describe('DynamoDBMemoryManager', () => {
  let memoryManager: DynamoDBMemoryManager;
  let mockDynamoDBClient: jest.Mocked<DynamoDBClient>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock DynamoDB client
    mockDynamoDBClient = {
      send: jest.fn(),
    } as unknown as jest.Mocked<DynamoDBClient>;
    
    // Mock the DynamoDB client constructor
    (DynamoDBClient as jest.Mock).mockImplementation(() => mockDynamoDBClient);
    
    // Create the memory manager
    memoryManager = new DynamoDBMemoryManager({
      tableName: 'test-table',
      region: 'us-west-2',
    });
  });
  
  test('should create a conversation', async () => {
    // Mock the send method to return a successful response
    mockDynamoDBClient.send.mockResolvedValueOnce({});
    
    const conversation = await memoryManager.createConversation({ topic: 'test' });
    
    expect(conversation).toBeDefined();
    expect(conversation.conversationId).toBeDefined();
    expect(conversation.messages).toEqual([]);
    expect(conversation.metadata).toEqual({ topic: 'test' });
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.updatedAt).toBeDefined();
    
    // Verify that send was called with a PutItemCommand
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
  });
  
  test('should get a conversation', async () => {
    // Mock the send method to return a conversation
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Item: {
        key: { S: 'CONV#123' },
        value: { M: {
          conversationId: { S: '123' },
          messages: { L: [] },
          metadata: { M: { topic: { S: 'test' } } },
          createdAt: { S: mockConversation.createdAt },
          updatedAt: { S: mockConversation.updatedAt },
        }},
      },
    });
    
    // Mock the unmarshall function
    const { unmarshall } = require('@aws-sdk/util-dynamodb');
    unmarshall.mockReturnValueOnce({
      key: 'CONV#123',
      value: mockConversation,
    });
    
    const conversation = await memoryManager.getConversation('123');
    
    expect(conversation).toBeDefined();
    expect(conversation?.conversationId).toBe('123');
    expect(conversation?.metadata).toEqual({ topic: 'test' });
    
    // Verify that send was called with a GetItemCommand
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
  });
  
  test('should add a message to a conversation', async () => {
    // Mock the getConversation method
    const mockConversation = {
      conversationId: '123',
      messages: [],
      metadata: { topic: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Mock the send method for getConversation
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Item: {
        key: { S: 'CONV#123' },
        value: { M: {
          conversationId: { S: '123' },
          messages: { L: [] },
          metadata: { M: { topic: { S: 'test' } } },
          createdAt: { S: mockConversation.createdAt },
          updatedAt: { S: mockConversation.updatedAt },
        }},
      },
    });
    
    // Mock the unmarshall function for getConversation
    const { unmarshall } = require('@aws-sdk/util-dynamodb');
    unmarshall.mockReturnValueOnce({
      key: 'CONV#123',
      value: mockConversation,
    });
    
    // Mock the send method for addMessage
    mockDynamoDBClient.send.mockResolvedValueOnce({});
    
    const message = await memoryManager.addMessage('123', {
      role: 'user',
      content: 'Hello',
    });
    
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello');
    expect(message.timestamp).toBeDefined();
    
    // Verify that send was called twice (getConversation and putItem)
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(2);
  });
  
  test('should store and retrieve an item', async () => {
    // Mock the send method for storeItem
    mockDynamoDBClient.send.mockResolvedValueOnce({})  // For tag
      .mockResolvedValueOnce({});  // For item
    
    const item = await memoryManager.storeItem('test-key', { value: 'test' }, ['tag1']);
    
    expect(item).toBeDefined();
    expect(item.key).toBe('test-key');
    expect(item.value).toEqual({ value: 'test' });
    expect(item.tags).toEqual(['tag1']);
    
    // Mock the send method for getItem
    mockDynamoDBClient.send.mockResolvedValueOnce({
      Item: {
        key: { S: 'ITEM#test-key' },
        value: { M: { value: { S: 'test' } } },
        tags: { L: [{ S: 'tag1' }] },
        createdAt: { S: new Date().toISOString() },
        updatedAt: { S: new Date().toISOString() },
      },
    });
    
    // Mock the unmarshall function for getItem
    unmarshall.mockReturnValueOnce({
      key: 'ITEM#test-key',
      value: { value: 'test' },
      tags: ['tag1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    const retrievedItem = await memoryManager.getItem('test-key');
    
    expect(retrievedItem).toBeDefined();
    expect(retrievedItem?.key).toBe('test-key');
    expect(retrievedItem?.value).toEqual({ value: 'test' });
    expect(retrievedItem?.tags).toEqual(['tag1']);
    
    // Verify that send was called 3 times (storeItem x2, getItem)
    expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(3);
  });
});