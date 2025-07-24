import { ShortTermMemoryManager } from '../services';

describe('ShortTermMemoryManager', () => {
  let memoryManager: ShortTermMemoryManager;
  
  beforeEach(() => {
    memoryManager = new ShortTermMemoryManager({
      maxMessages: 5,
      maxConversations: 3,
    });
  });
  
  test('should create a conversation', async () => {
    const conversation = await memoryManager.createConversation({ topic: 'test' });
    
    expect(conversation).toBeDefined();
    expect(conversation.conversationId).toBeDefined();
    expect(conversation.messages).toEqual([]);
    expect(conversation.metadata).toEqual({ topic: 'test' });
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.updatedAt).toBeDefined();
  });
  
  test('should add a message to a conversation', async () => {
    const conversation = await memoryManager.createConversation();
    const message = await memoryManager.addMessage(conversation.conversationId, {
      role: 'user',
      content: 'Hello',
    });
    
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello');
    expect(message.timestamp).toBeDefined();
    
    const retrievedConversation = await memoryManager.getConversation(conversation.conversationId);
    expect(retrievedConversation?.messages.length).toBe(1);
    expect(retrievedConversation?.messages[0].content).toBe('Hello');
  });
  
  test('should limit the number of messages in a conversation', async () => {
    const conversation = await memoryManager.createConversation();
    
    // Add 6 messages (max is 5)
    for (let i = 0; i < 6; i++) {
      await memoryManager.addMessage(conversation.conversationId, {
        role: 'user',
        content: `Message ${i}`,
      });
    }
    
    const messages = await memoryManager.getMessages(conversation.conversationId);
    expect(messages.length).toBe(5);
    expect(messages[0].content).toBe('Message 1');
    expect(messages[4].content).toBe('Message 5');
  });
  
  test('should limit the number of conversations', async () => {
    // Create 4 conversations (max is 3)
    const conv1 = await memoryManager.createConversation({ name: 'Conv 1' });
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
    const conv2 = await memoryManager.createConversation({ name: 'Conv 2' });
    await new Promise(resolve => setTimeout(resolve, 10));
    const conv3 = await memoryManager.createConversation({ name: 'Conv 3' });
    await new Promise(resolve => setTimeout(resolve, 10));
    const conv4 = await memoryManager.createConversation({ name: 'Conv 4' });
    
    // The oldest conversation should be removed
    expect(await memoryManager.getConversation(conv1.conversationId)).toBeNull();
    expect(await memoryManager.getConversation(conv2.conversationId)).not.toBeNull();
    expect(await memoryManager.getConversation(conv3.conversationId)).not.toBeNull();
    expect(await memoryManager.getConversation(conv4.conversationId)).not.toBeNull();
  });
  
  test('should store and retrieve items', async () => {
    const item = await memoryManager.storeItem('test-key', { value: 'test' }, ['tag1', 'tag2']);
    
    expect(item).toBeDefined();
    expect(item.key).toBe('test-key');
    expect(item.value).toEqual({ value: 'test' });
    expect(item.tags).toEqual(['tag1', 'tag2']);
    
    const retrievedItem = await memoryManager.getItem('test-key');
    expect(retrievedItem).not.toBeNull();
    expect(retrievedItem?.value).toEqual({ value: 'test' });
  });
  
  test('should search items by tags', async () => {
    await memoryManager.storeItem('key1', { value: 1 }, ['tag1', 'tag2']);
    await memoryManager.storeItem('key2', { value: 2 }, ['tag2', 'tag3']);
    await memoryManager.storeItem('key3', { value: 3 }, ['tag1', 'tag3']);
    
    const items1 = await memoryManager.searchByTags(['tag1']);
    expect(items1.length).toBe(2);
    
    const items2 = await memoryManager.searchByTags(['tag2', 'tag3']);
    expect(items2.length).toBe(1);
    expect(items2[0].key).toBe('key2');
  });
  
  test('should delete items and conversations', async () => {
    const conversation = await memoryManager.createConversation();
    await memoryManager.storeItem('test-key', { value: 'test' });
    
    expect(await memoryManager.deleteItem('test-key')).toBe(true);
    expect(await memoryManager.getItem('test-key')).toBeNull();
    
    expect(await memoryManager.deleteConversation(conversation.conversationId)).toBe(true);
    expect(await memoryManager.getConversation(conversation.conversationId)).toBeNull();
  });
});