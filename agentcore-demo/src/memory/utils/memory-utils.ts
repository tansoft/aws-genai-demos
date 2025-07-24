/**
 * Utility functions for memory operations
 */
import { MemoryMessage } from '../models';

/**
 * Memory utility functions
 */
export class MemoryUtils {
  /**
   * Extract the most recent messages from a conversation
   * @param messages The messages to extract from
   * @param maxTokens Maximum number of tokens to include
   * @param tokensPerMessage Estimated tokens per message
   */
  static extractRecentMessages(
    messages: MemoryMessage[],
    maxTokens: number = 2000,
    tokensPerMessage: number = 100
  ): MemoryMessage[] {
    if (messages.length === 0) {
      return [];
    }
    
    // Always include system messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    
    // Calculate remaining tokens
    const systemTokens = systemMessages.length * tokensPerMessage;
    const remainingTokens = maxTokens - systemTokens;
    
    // Get non-system messages
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // Calculate how many non-system messages we can include
    const maxNonSystemMessages = Math.floor(remainingTokens / tokensPerMessage);
    
    // Get the most recent non-system messages
    const recentNonSystemMessages = nonSystemMessages.slice(-maxNonSystemMessages);
    
    // Combine system messages and recent non-system messages
    return [...systemMessages, ...recentNonSystemMessages];
  }
  
  /**
   * Estimate the number of tokens in a message
   * @param message The message to estimate tokens for
   */
  static estimateTokens(message: MemoryMessage): number {
    // Simple estimation: 1 token per 4 characters
    return Math.ceil(message.content.length / 4);
  }
  
  /**
   * Filter messages by role
   * @param messages The messages to filter
   * @param roles The roles to include
   */
  static filterByRole(
    messages: MemoryMessage[],
    roles: ('system' | 'user' | 'assistant' | 'tool')[]
  ): MemoryMessage[] {
    return messages.filter(msg => roles.includes(msg.role));
  }
  
  /**
   * Group messages by role
   * @param messages The messages to group
   */
  static groupByRole(
    messages: MemoryMessage[]
  ): Record<string, MemoryMessage[]> {
    return messages.reduce((groups, message) => {
      const role = message.role;
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(message);
      return groups;
    }, {} as Record<string, MemoryMessage[]>);
  }
  
  /**
   * Extract keywords from messages
   * @param messages The messages to extract keywords from
   * @param maxKeywords Maximum number of keywords to extract
   */
  static extractKeywords(
    messages: MemoryMessage[],
    maxKeywords: number = 10
  ): string[] {
    // Simple keyword extraction: split by spaces and get unique words
    const text = messages.map(msg => msg.content).join(' ');
    const words = text.toLowerCase().split(/\W+/);
    
    // Filter out common stop words
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'of', 'from',
    ]);
    
    const filteredWords = words.filter(word => 
      word.length > 2 && !stopWords.has(word)
    );
    
    // Count word frequencies
    const wordCounts = filteredWords.reduce((counts, word) => {
      counts[word] = (counts[word] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Sort by frequency and get top keywords
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }
}