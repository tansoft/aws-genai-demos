/**
 * Memory factory for AWS AgentCore
 */
import { logger } from '../../common';
import { MemoryManager } from '../models';
import { ShortTermMemoryManager } from './short-term-memory';
import { DynamoDBMemoryManager } from './dynamodb-memory';
import { HybridMemoryManager } from './hybrid-memory';
import { SecureMemoryManager } from './secure-memory';

/**
 * Memory type enum
 */
export enum MemoryType {
  SHORT_TERM = 'short-term',
  LONG_TERM = 'long-term',
  HYBRID = 'hybrid',
  SECURE = 'secure',
}

/**
 * Memory factory configuration
 */
export interface MemoryFactoryConfig {
  shortTerm?: {
    maxMessages?: number;
    maxConversations?: number;
  };
  longTerm?: {
    tableName: string;
    region?: string;
    endpoint?: string;
  };
  hybrid?: {
    syncInterval?: number;
  };
  secure?: {
    encryptionKey: string;
    accessControl?: {
      enabled: boolean;
      roles?: string[];
      users?: string[];
    };
    sensitivePatterns?: RegExp[];
    redactionEnabled?: boolean;
    auditLogging?: boolean;
  };
}

/**
 * Factory for creating memory managers
 */
export class MemoryFactory {
  /**
   * Create a memory manager
   * @param type The type of memory manager to create
   * @param config The configuration for the memory manager
   */
  static createMemoryManager(
    type: MemoryType,
    config: MemoryFactoryConfig
  ): MemoryManager {
    logger.debug('Creating memory manager', { type });
    
    switch (type) {
      case MemoryType.SHORT_TERM:
        return new ShortTermMemoryManager({
          maxMessages: config.shortTerm?.maxMessages,
          maxConversations: config.shortTerm?.maxConversations,
        });
        
      case MemoryType.LONG_TERM:
        if (!config.longTerm?.tableName) {
          throw new Error('Table name is required for long-term memory');
        }
        
        return new DynamoDBMemoryManager({
          tableName: config.longTerm.tableName,
          region: config.longTerm.region,
          endpoint: config.longTerm.endpoint,
        });
        
      case MemoryType.HYBRID:
        return new HybridMemoryManager({
          shortTerm: config.shortTerm,
          longTerm: config.longTerm,
          syncInterval: config.hybrid?.syncInterval,
        });
        
      case MemoryType.SECURE:
        if (!config.secure?.encryptionKey) {
          throw new Error('Encryption key is required for secure memory');
        }
        
        // Create the base memory manager
        let baseMemory: MemoryManager;
        
        if (config.longTerm?.tableName) {
          // Use hybrid memory if long-term is configured
          baseMemory = new HybridMemoryManager({
            shortTerm: config.shortTerm,
            longTerm: config.longTerm,
            syncInterval: config.hybrid?.syncInterval,
          });
        } else {
          // Otherwise, use short-term memory
          baseMemory = new ShortTermMemoryManager({
            maxMessages: config.shortTerm?.maxMessages,
            maxConversations: config.shortTerm?.maxConversations,
          });
        }
        
        // Wrap the base memory manager with secure memory
        return new SecureMemoryManager(baseMemory, {
          encryptionKey: config.secure.encryptionKey,
          accessControl: config.secure.accessControl,
          sensitivePatterns: config.secure.sensitivePatterns,
          redactionEnabled: config.secure.redactionEnabled,
          auditLogging: config.secure.auditLogging,
        });
        
      default:
        throw new Error(`Unsupported memory type: ${type}`);
    }
  }
}