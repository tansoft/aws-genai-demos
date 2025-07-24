/**
 * Hybrid memory manager for AWS AgentCore
 * Combines short-term and long-term memory
 */
import { logger } from '../../common';
import { 
  ConversationMemory, 
  MemoryItem, 
  MemoryManager, 
  MemoryMessage, 
  MemoryQueryOptions 
} from '../models';
import { MemoryFactory, MemoryType } from './memory-factory';

/**
 * Configuration for hybrid memory manager
 */
export interface HybridMemoryConfig {
  shortTerm?: {
    maxMessages?: number;
    maxConversations?: number;
  };
  longTerm?: {
    tableName: string;
    region?: string;
    endpoint?: string;
  };
  syncInterval?: number; // Milliseconds between syncs
}

/**
 * Hybrid memory manager that combines short-term and long-term memory
 */
export class HybridMemoryManager implements MemoryManager {
  private shortTermMemory: MemoryManager;
  private longTermMemory: MemoryManager;
  private config: HybridMemoryConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private pendingSync: Set<string> = new Set();
  
  constructor(config: HybridMemoryConfig) {
    this.config = {
      syncInterval: 60000, // Default: sync every minute
      ...config,
    };
    
    // Create short-term and long-term memory managers
    this.shortTermMemory = MemoryFactory.createMemoryManager(
      MemoryType.SHORT_TERM,
      config
    );
    
    if (config.longTerm?.tableName) {
      this.longTermMemory = MemoryFactory.createMemoryManager(
        MemoryType.LONG_TERM,
        config
      );
      
      // Start sync timer if long-term memory is available
      this.startSyncTimer();
    } else {
      // If no long-term memory is configured, use short-term for both
      this.longTermMemory = this.shortTermMemory;
    }
    
    logger.info('Hybrid memory manager initialized', {
      hasLongTermMemory: config.longTerm?.tableName !== undefined,
      syncInterval: this.config.syncInterval,
    });
  }
  
  /**
   * Start the sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.syncPendingConversations();
    }, this.config.syncInterval);
  }
  
  /**
   * Stop the sync timer
   */
  public stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  /**
   * Sync pending conversations to long-term memory
   */
  private async syncPendingConversations(): Promise<void> {
    if (this.pendingSync.size === 0) {
      return;
    }
    
    logger.debug('Syncing pending conversations to long-term memory', {
      count: this.pendingSync.size,
    });
    
    const conversationIds = Array.from(this.pendingSync);
    this.pendingSync.clear();
    
    for (const conversationId of conversationIds) {
      try {
        const conversation = await this.shortTermMemory.getConversation(conversationId);
        
        if (conversation) {
          // Check if the conversation exists in long-term memory
          const existingConversation = await this.longTermMemory.getConversation(conversationId);
          
          if (existingConversation) {
            // Update existing conversation
            for (const message of conversation.messages) {
              // Check if the message already exists in long-term memory
              const existingMessages = existingConversation.messages;
              const messageExists = existingMessages.some(m => m.id === message.id);
              
              if (!messageExists) {
                await this.longTermMemory.addMessage(conversationId, {
                  role: message.role,
                  content: message.content,
                  metadata: message.metadata,
                });
              }
            }
          } else {
            // Create new conversation in long-term memory
            await this.longTermMemory.createConversation(conversation.metadata);
            
            // Add all messages
            for (const message of conversation.messages) {
              await this.longTermMemory.addMessage(conversationId, {
                role: message.role,
                content: message.content,
                metadata: message.metadata,
              });
            }
          }
          
          logger.debug('Synced conversation to long-term memory', { conversationId });
        }
      } catch (error) {
        logger.error('Error syncing conversation to long-term memory', {
          error,
          conversationId,
        });
        
        // Add back to pending sync
        this.pendingSync.add(conversationId);
      }
    }
  }
  
  /**
   * Mark a conversation for sync to long-term memory
   * @param conversationId The conversation ID to sync
   */
  private markForSync(conversationId: string): void {
    this.pendingSync.add(conversationId);
  }
  
  async getConversation(conversationId: string): Promise<ConversationMemory | null> {
    // Try short-term memory first
    const conversation = await this.shortTermMemory.getConversation(conversationId);
    
    if (conversation) {
      return conversation;
    }
    
    // Fall back to long-term memory
    return this.longTermMemory.getConversation(conversationId);
  }
  
  async createConversation(metadata: Record<string, any> = {}): Promise<ConversationMemory> {
    // Create in short-term memory
    const conversation = await this.shortTermMemory.createConversation(metadata);
    
    // Mark for sync to long-term memory
    this.markForSync(conversation.conversationId);
    
    return conversation;
  }
  
  async addMessage(
    conversationId: string, 
    message: Omit<MemoryMessage, 'id' | 'timestamp'>
  ): Promise<MemoryMessage> {
    try {
      // Add to short-term memory
      const result = await this.shortTermMemory.addMessage(conversationId, message);
      
      // Mark for sync to long-term memory
      this.markForSync(conversationId);
      
      return result;
    } catch (error) {
      // If not found in short-term memory, try long-term memory
      logger.debug('Message not added to short-term memory, trying long-term memory', {
        conversationId,
      });
      
      return this.longTermMemory.addMessage(conversationId, message);
    }
  }
  
  async getMessages(
    conversationId: string, 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryMessage[]> {
    try {
      // Try short-term memory first
      return await this.shortTermMemory.getMessages(conversationId, options);
    } catch (error) {
      // Fall back to long-term memory
      logger.debug('Messages not found in short-term memory, trying long-term memory', {
        conversationId,
      });
      
      return this.longTermMemory.getMessages(conversationId, options);
    }
  }
  
  async storeItem(
    key: string, 
    value: any, 
    tags: string[] = [], 
    ttl?: number
  ): Promise<MemoryItem> {
    // Store in both short-term and long-term memory
    const shortTermPromise = this.shortTermMemory.storeItem(key, value, tags, ttl);
    const longTermPromise = this.longTermMemory.storeItem(key, value, tags, ttl);
    
    // Wait for both to complete
    const [shortTermResult] = await Promise.all([shortTermPromise, longTermPromise]);
    
    return shortTermResult;
  }
  
  async getItem(key: string): Promise<MemoryItem | null> {
    // Try short-term memory first
    const item = await this.shortTermMemory.getItem(key);
    
    if (item) {
      return item;
    }
    
    // Fall back to long-term memory
    return this.longTermMemory.getItem(key);
  }
  
  async searchByTags(
    tags: string[], 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryItem[]> {
    // Search in both short-term and long-term memory
    const shortTermPromise = this.shortTermMemory.searchByTags(tags, options);
    const longTermPromise = this.longTermMemory.searchByTags(tags, options);
    
    // Wait for both to complete
    const [shortTermResults, longTermResults] = await Promise.all([
      shortTermPromise,
      longTermPromise,
    ]);
    
    // Combine results, removing duplicates
    const combinedResults: MemoryItem[] = [...shortTermResults];
    const shortTermKeys = new Set(shortTermResults.map(item => item.key));
    
    for (const item of longTermResults) {
      if (!shortTermKeys.has(item.key)) {
        combinedResults.push(item);
      }
    }
    
    // Apply limit if specified
    if (options.limit !== undefined && options.limit > 0) {
      return combinedResults.slice(0, options.limit);
    }
    
    return combinedResults;
  }
  
  async deleteItem(key: string): Promise<boolean> {
    // Delete from both short-term and long-term memory
    const shortTermPromise = this.shortTermMemory.deleteItem(key);
    const longTermPromise = this.longTermMemory.deleteItem(key);
    
    // Wait for both to complete
    const [shortTermResult, longTermResult] = await Promise.all([
      shortTermPromise,
      longTermPromise,
    ]);
    
    // Return true if deleted from either
    return shortTermResult || longTermResult;
  }
  
  async deleteConversation(conversationId: string): Promise<boolean> {
    // Delete from both short-term and long-term memory
    const shortTermPromise = this.shortTermMemory.deleteConversation(conversationId);
    const longTermPromise = this.longTermMemory.deleteConversation(conversationId);
    
    // Wait for both to complete
    const [shortTermResult, longTermResult] = await Promise.all([
      shortTermPromise,
      longTermPromise,
    ]);
    
    // Return true if deleted from either
    return shortTermResult || longTermResult;
  }
  
  /**
   * Force sync all pending conversations to long-term memory
   */
  async forceSyncAll(): Promise<void> {
    await this.syncPendingConversations();
  }
}