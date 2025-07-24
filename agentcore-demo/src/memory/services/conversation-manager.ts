/**
 * Conversation manager for AWS AgentCore
 */
import { logger } from '../../common';
import { MemoryManager, MemoryMessage, MemoryQueryOptions } from '../models';
import { ShortTermMemoryManager } from './short-term-memory';

/**
 * Configuration for conversation manager
 */
export interface ConversationManagerConfig {
  maxMessages?: number;
  maxConversations?: number;
}

/**
 * Conversation manager for handling conversation history
 */
export class ConversationManager {
  private memoryManager: MemoryManager;
  
  constructor(memoryManager?: MemoryManager, config: ConversationManagerConfig = {}) {
    this.memoryManager = memoryManager || new ShortTermMemoryManager({
      maxMessages: config.maxMessages,
      maxConversations: config.maxConversations,
    });
    
    logger.info('Conversation manager initialized');
  }
  
  /**
   * Start a new conversation
   * @param metadata Optional metadata for the conversation
   */
  async startConversation(metadata: Record<string, any> = {}): Promise<string> {
    const conversation = await this.memoryManager.createConversation(metadata);
    return conversation.conversationId;
  }
  
  /**
   * Add a system message to a conversation
   * @param conversationId The conversation ID
   * @param content The message content
   * @param metadata Optional metadata for the message
   */
  async addSystemMessage(
    conversationId: string, 
    content: string, 
    metadata?: Record<string, any>
  ): Promise<MemoryMessage> {
    return this.memoryManager.addMessage(conversationId, {
      role: 'system',
      content,
      metadata,
    });
  }
  
  /**
   * Add a user message to a conversation
   * @param conversationId The conversation ID
   * @param content The message content
   * @param metadata Optional metadata for the message
   */
  async addUserMessage(
    conversationId: string, 
    content: string, 
    metadata?: Record<string, any>
  ): Promise<MemoryMessage> {
    return this.memoryManager.addMessage(conversationId, {
      role: 'user',
      content,
      metadata,
    });
  }
  
  /**
   * Add an assistant message to a conversation
   * @param conversationId The conversation ID
   * @param content The message content
   * @param metadata Optional metadata for the message
   */
  async addAssistantMessage(
    conversationId: string, 
    content: string, 
    metadata?: Record<string, any>
  ): Promise<MemoryMessage> {
    return this.memoryManager.addMessage(conversationId, {
      role: 'assistant',
      content,
      metadata,
    });
  }
  
  /**
   * Add a tool message to a conversation
   * @param conversationId The conversation ID
   * @param content The message content
   * @param metadata Optional metadata for the message
   */
  async addToolMessage(
    conversationId: string, 
    content: string, 
    metadata?: Record<string, any>
  ): Promise<MemoryMessage> {
    return this.memoryManager.addMessage(conversationId, {
      role: 'tool',
      content,
      metadata,
    });
  }
  
  /**
   * Get the conversation history
   * @param conversationId The conversation ID
   * @param options Query options
   */
  async getConversationHistory(
    conversationId: string, 
    options?: MemoryQueryOptions
  ): Promise<MemoryMessage[]> {
    return this.memoryManager.getMessages(conversationId, options);
  }
  
  /**
   * Get the conversation history formatted for a specific model provider
   * @param conversationId The conversation ID
   * @param provider The model provider (e.g., 'openai', 'anthropic')
   * @param options Query options
   */
  async getFormattedHistory(
    conversationId: string, 
    provider: string = 'openai', 
    options?: MemoryQueryOptions
  ): Promise<any[]> {
    const messages = await this.getConversationHistory(conversationId, options);
    
    switch (provider.toLowerCase()) {
      case 'openai':
        return messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.metadata ? { metadata: msg.metadata } : {}),
        }));
        
      case 'anthropic':
        return messages.map(msg => {
          // Map standard roles to Anthropic roles
          let role = msg.role;
          if (role === 'assistant') {
            role = 'assistant';
          } else if (role === 'system') {
            role = 'system';
          } else if (role === 'tool') {
            role = 'assistant'; // Anthropic doesn't have a tool role
          } else {
            role = 'user';
          }
          
          return {
            role,
            content: msg.content,
          };
        });
        
      default:
        // Default format
        return messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
    }
  }
  
  /**
   * Delete a conversation
   * @param conversationId The conversation ID
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.memoryManager.deleteConversation(conversationId);
  }
  
  /**
   * Summarize a conversation
   * @param conversationId The conversation ID
   * @param maxLength Maximum length of the summary
   */
  async summarizeConversation(
    conversationId: string, 
    maxLength: number = 500
  ): Promise<string> {
    const messages = await this.getConversationHistory(conversationId);
    
    if (messages.length === 0) {
      return '';
    }
    
    // Simple summarization: concatenate the last few messages
    const lastMessages = messages.slice(-5);
    const summary = lastMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    // Truncate if needed
    if (summary.length > maxLength) {
      return summary.substring(0, maxLength) + '...';
    }
    
    return summary;
  }
}