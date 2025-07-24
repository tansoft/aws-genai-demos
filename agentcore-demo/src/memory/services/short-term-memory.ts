/**
 * Short-term memory manager for AWS AgentCore
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { 
  ConversationMemory, 
  MemoryItem, 
  MemoryManager, 
  MemoryMessage, 
  MemoryQueryOptions 
} from '../models';

/**
 * Configuration for short-term memory
 */
export interface ShortTermMemoryConfig {
  maxMessages?: number;
  maxConversations?: number;
}

/**
 * In-memory implementation of the memory manager
 */
export class ShortTermMemoryManager implements MemoryManager {
  private conversations: Map<string, ConversationMemory>;
  private items: Map<string, MemoryItem>;
  private config: ShortTermMemoryConfig;
  
  constructor(config: ShortTermMemoryConfig = {}) {
    this.conversations = new Map();
    this.items = new Map();
    this.config = {
      maxMessages: config.maxMessages || 100,
      maxConversations: config.maxConversations || 10,
    };
    
    logger.info('Short-term memory manager initialized', { config: this.config });
  }
  
  async getConversation(conversationId: string): Promise<ConversationMemory | null> {
    const conversation = this.conversations.get(conversationId);
    return conversation || null;
  }
  
  async createConversation(metadata: Record<string, any> = {}): Promise<ConversationMemory> {
    // Check if we need to remove old conversations
    if (this.conversations.size >= (this.config.maxConversations || 10)) {
      // Find the oldest conversation
      let oldestId = '';
      let oldestTime = Date.now();
      
      for (const [id, conversation] of this.conversations.entries()) {
        const createdAt = new Date(conversation.createdAt).getTime();
        if (createdAt < oldestTime) {
          oldestId = id;
          oldestTime = createdAt;
        }
      }
      
      // Remove the oldest conversation
      if (oldestId) {
        this.conversations.delete(oldestId);
        logger.debug('Removed oldest conversation to make room', { conversationId: oldestId });
      }
    }
    
    const now = new Date().toISOString();
    const conversationId = uuidv4();
    
    const conversation: ConversationMemory = {
      conversationId,
      messages: [],
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    
    this.conversations.set(conversationId, conversation);
    logger.debug('Created new conversation', { conversationId });
    
    return conversation;
  }
  
  async addMessage(
    conversationId: string, 
    message: Omit<MemoryMessage, 'id' | 'timestamp'>
  ): Promise<MemoryMessage> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    const now = Date.now();
    const fullMessage: MemoryMessage = {
      id: uuidv4(),
      ...message,
      timestamp: now,
    };
    
    // Add the message to the conversation
    conversation.messages.push(fullMessage);
    conversation.updatedAt = new Date(now).toISOString();
    
    // Trim messages if needed
    if (conversation.messages.length > (this.config.maxMessages || 100)) {
      conversation.messages = conversation.messages.slice(-this.config.maxMessages!);
      logger.debug('Trimmed conversation messages to max size', { 
        conversationId, 
        maxMessages: this.config.maxMessages 
      });
    }
    
    logger.debug('Added message to conversation', { 
      conversationId, 
      messageId: fullMessage.id, 
      role: fullMessage.role 
    });
    
    return fullMessage;
  }
  
  async getMessages(
    conversationId: string, 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryMessage[]> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    let messages = conversation.messages;
    
    // Apply time filters
    if (options.startTime !== undefined) {
      messages = messages.filter(msg => msg.timestamp >= (options.startTime || 0));
    }
    
    if (options.endTime !== undefined) {
      messages = messages.filter(msg => msg.timestamp <= (options.endTime || Date.now()));
    }
    
    // Apply limit
    if (options.limit !== undefined && options.limit > 0) {
      messages = messages.slice(-options.limit);
    }
    
    return messages;
  }
  
  async storeItem(
    key: string, 
    value: any, 
    tags: string[] = [], 
    ttl?: number
  ): Promise<MemoryItem> {
    const now = new Date().toISOString();
    
    const item: MemoryItem = {
      key,
      value,
      tags,
      ttl,
      createdAt: now,
      updatedAt: now,
    };
    
    this.items.set(key, item);
    logger.debug('Stored item in memory', { key, tags });
    
    return item;
  }
  
  async getItem(key: string): Promise<MemoryItem | null> {
    const item = this.items.get(key);
    
    // Check if the item has expired
    if (item && item.ttl !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      if (now > item.ttl) {
        // Item has expired, delete it
        this.items.delete(key);
        logger.debug('Item has expired', { key });
        return null;
      }
    }
    
    return item || null;
  }
  
  async searchByTags(
    tags: string[], 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryItem[]> {
    let items = Array.from(this.items.values());
    
    // Filter by tags
    items = items.filter(item => {
      return tags.every(tag => item.tags.includes(tag));
    });
    
    // Apply limit
    if (options.limit !== undefined && options.limit > 0) {
      items = items.slice(0, options.limit);
    }
    
    return items;
  }
  
  async deleteItem(key: string): Promise<boolean> {
    return this.items.delete(key);
  }
  
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.conversations.delete(conversationId);
  }
}