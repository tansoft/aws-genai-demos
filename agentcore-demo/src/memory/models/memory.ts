/**
 * Models for AWS AgentCore Memory System
 */

/**
 * Interface for a message in a conversation
 */
export interface MemoryMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for conversation memory
 */
export interface ConversationMemory {
  conversationId: string;
  messages: MemoryMessage[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for memory item
 */
export interface MemoryItem {
  key: string;
  value: any;
  tags: string[];
  ttl?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for memory query options
 */
export interface MemoryQueryOptions {
  limit?: number;
  startTime?: number;
  endTime?: number;
  tags?: string[];
}

/**
 * Interface for memory manager
 */
export interface MemoryManager {
  /**
   * Get a conversation by ID
   * @param conversationId The conversation ID
   */
  getConversation(conversationId: string): Promise<ConversationMemory | null>;
  
  /**
   * Create a new conversation
   * @param metadata Optional metadata for the conversation
   */
  createConversation(metadata?: Record<string, any>): Promise<ConversationMemory>;
  
  /**
   * Add a message to a conversation
   * @param conversationId The conversation ID
   * @param message The message to add
   */
  addMessage(conversationId: string, message: Omit<MemoryMessage, 'id' | 'timestamp'>): Promise<MemoryMessage>;
  
  /**
   * Get messages from a conversation
   * @param conversationId The conversation ID
   * @param options Query options
   */
  getMessages(conversationId: string, options?: MemoryQueryOptions): Promise<MemoryMessage[]>;
  
  /**
   * Store an item in memory
   * @param key The key for the item
   * @param value The value to store
   * @param tags Optional tags for the item
   * @param ttl Optional time-to-live in seconds
   */
  storeItem(key: string, value: any, tags?: string[], ttl?: number): Promise<MemoryItem>;
  
  /**
   * Get an item from memory
   * @param key The key for the item
   */
  getItem(key: string): Promise<MemoryItem | null>;
  
  /**
   * Search for items by tags
   * @param tags The tags to search for
   * @param options Query options
   */
  searchByTags(tags: string[], options?: MemoryQueryOptions): Promise<MemoryItem[]>;
  
  /**
   * Delete an item from memory
   * @param key The key for the item
   */
  deleteItem(key: string): Promise<boolean>;
  
  /**
   * Delete a conversation
   * @param conversationId The conversation ID
   */
  deleteConversation(conversationId: string): Promise<boolean>;
}