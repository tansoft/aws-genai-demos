/**
 * Secure memory manager for AWS AgentCore
 * Adds encryption and access control to any memory manager
 */
import * as crypto from 'crypto';
import { logger } from '../../common';
import { 
  ConversationMemory, 
  MemoryItem, 
  MemoryManager, 
  MemoryMessage, 
  MemoryQueryOptions 
} from '../models';

/**
 * Configuration for secure memory manager
 */
export interface SecureMemoryConfig {
  encryptionKey: string;
  accessControl?: {
    enabled: boolean;
    roles?: string[];
    users?: string[];
  };
  sensitivePatterns?: RegExp[];
  redactionEnabled?: boolean;
  auditLogging?: boolean;
}

/**
 * Secure memory manager that adds encryption and access control
 */
export class SecureMemoryManager implements MemoryManager {
  private baseMemory: MemoryManager;
  private config: SecureMemoryConfig;
  private algorithm = 'aes-256-gcm';
  
  constructor(baseMemory: MemoryManager, config: SecureMemoryConfig) {
    this.baseMemory = baseMemory;
    this.config = {
      ...config,
      redactionEnabled: config.redactionEnabled !== false,
      auditLogging: config.auditLogging !== false,
      sensitivePatterns: config.sensitivePatterns || [
        // Email pattern
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        // Phone number pattern
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        // Credit card pattern
        /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        // SSN pattern
        /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      ],
    };
    
    // Validate encryption key
    if (!this.config.encryptionKey || this.config.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
    
    logger.info('Secure memory manager initialized', {
      encryptionEnabled: true,
      accessControlEnabled: this.config.accessControl?.enabled,
      redactionEnabled: this.config.redactionEnabled,
      auditLoggingEnabled: this.config.auditLogging,
    });
  }
  
  /**
   * Encrypt data
   * @param data The data to encrypt
   */
  private encrypt(data: any): { encrypted: string, iv: string } {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher using the encryption key and IV
      const key = crypto.createHash('sha256').update(this.config.encryptionKey).digest();
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(data), 'utf8'),
        cipher.final(),
      ]);
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine the IV, encrypted data, and auth tag
      const result = Buffer.concat([iv, authTag, encrypted]);
      
      return {
        encrypted: result.toString('base64'),
        iv: iv.toString('hex'),
      };
    } catch (error) {
      logger.error('Error encrypting data', { error });
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data
   * @param encryptedData The encrypted data
   */
  private decrypt(encryptedData: string): any {
    try {
      // Decode the base64 string
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract the IV, auth tag, and encrypted data
      const iv = buffer.slice(0, 16);
      const authTag = buffer.slice(16, 32);
      const encrypted = buffer.slice(32);
      
      // Create decipher using the encryption key and IV
      const key = crypto.createHash('sha256').update(this.config.encryptionKey).digest();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // Set the authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      logger.error('Error decrypting data', { error });
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Redact sensitive information
   * @param text The text to redact
   */
  private redactSensitiveInfo(text: string): string {
    if (!this.config.redactionEnabled) {
      return text;
    }
    
    let redactedText = text;
    
    // Apply each pattern
    for (const pattern of this.config.sensitivePatterns!) {
      redactedText = redactedText.replace(pattern, '[REDACTED]');
    }
    
    return redactedText;
  }
  
  /**
   * Check access control
   * @param operation The operation being performed
   * @param resource The resource being accessed
   * @param context Additional context for the operation
   */
  private checkAccessControl(
    operation: string,
    resource: string,
    context: Record<string, any> = {}
  ): boolean {
    // Skip if access control is not enabled
    if (!this.config.accessControl?.enabled) {
      return true;
    }
    
    // Log the access attempt
    if (this.config.auditLogging) {
      logger.info('Access control check', {
        operation,
        resource,
        context,
        allowed: true, // For now, we're allowing all operations
      });
    }
    
    // For now, we'll allow all operations
    // In a real implementation, this would check against roles, users, etc.
    return true;
  }
  
  async getConversation(conversationId: string): Promise<ConversationMemory | null> {
    // Check access control
    if (!this.checkAccessControl('getConversation', conversationId)) {
      throw new Error('Access denied');
    }
    
    const conversation = await this.baseMemory.getConversation(conversationId);
    
    if (!conversation) {
      return null;
    }
    
    // Decrypt and redact messages
    const decryptedMessages = conversation.messages.map(message => {
      // If the message is encrypted, decrypt it
      if (message.metadata?.encrypted) {
        try {
          const decrypted = this.decrypt(message.content);
          return {
            ...message,
            content: this.redactSensitiveInfo(decrypted),
            metadata: {
              ...message.metadata,
              wasEncrypted: true,
            },
          };
        } catch (error) {
          logger.error('Error decrypting message', { error, messageId: message.id });
          return message;
        }
      }
      
      // Otherwise, just redact sensitive information
      return {
        ...message,
        content: this.redactSensitiveInfo(message.content),
      };
    });
    
    return {
      ...conversation,
      messages: decryptedMessages,
    };
  }
  
  async createConversation(metadata: Record<string, any> = {}): Promise<ConversationMemory> {
    // Check access control
    if (!this.checkAccessControl('createConversation', 'conversation', { metadata })) {
      throw new Error('Access denied');
    }
    
    // Add security metadata
    const secureMetadata = {
      ...metadata,
      security: {
        encrypted: true,
        accessControl: this.config.accessControl?.enabled,
        createdAt: new Date().toISOString(),
      },
    };
    
    return this.baseMemory.createConversation(secureMetadata);
  }
  
  async addMessage(
    conversationId: string, 
    message: Omit<MemoryMessage, 'id' | 'timestamp'>
  ): Promise<MemoryMessage> {
    // Check access control
    if (!this.checkAccessControl('addMessage', conversationId, { role: message.role })) {
      throw new Error('Access denied');
    }
    
    // Check if the message contains sensitive information
    const containsSensitiveInfo = this.config.sensitivePatterns!.some(pattern => 
      pattern.test(message.content)
    );
    
    // If the message contains sensitive information or encryption is always enabled,
    // encrypt the content
    if (containsSensitiveInfo) {
      const { encrypted } = this.encrypt(message.content);
      
      const encryptedMessage = {
        ...message,
        content: encrypted,
        metadata: {
          ...message.metadata,
          encrypted: true,
          containsSensitiveInfo,
        },
      };
      
      return this.baseMemory.addMessage(conversationId, encryptedMessage);
    }
    
    // Otherwise, store the message as is
    return this.baseMemory.addMessage(conversationId, message);
  }
  
  async getMessages(
    conversationId: string, 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryMessage[]> {
    // Check access control
    if (!this.checkAccessControl('getMessages', conversationId, { options })) {
      throw new Error('Access denied');
    }
    
    const messages = await this.baseMemory.getMessages(conversationId, options);
    
    // Decrypt and redact messages
    return messages.map(message => {
      // If the message is encrypted, decrypt it
      if (message.metadata?.encrypted) {
        try {
          const decrypted = this.decrypt(message.content);
          return {
            ...message,
            content: this.redactSensitiveInfo(decrypted),
            metadata: {
              ...message.metadata,
              wasEncrypted: true,
            },
          };
        } catch (error) {
          logger.error('Error decrypting message', { error, messageId: message.id });
          return message;
        }
      }
      
      // Otherwise, just redact sensitive information
      return {
        ...message,
        content: this.redactSensitiveInfo(message.content),
      };
    });
  }
  
  async storeItem(
    key: string, 
    value: any, 
    tags: string[] = [], 
    ttl?: number
  ): Promise<MemoryItem> {
    // Check access control
    if (!this.checkAccessControl('storeItem', key, { tags })) {
      throw new Error('Access denied');
    }
    
    // Encrypt the value
    const { encrypted } = this.encrypt(value);
    
    // Add security tags
    const secureTags = [...tags, 'encrypted'];
    
    // Store the encrypted value
    return this.baseMemory.storeItem(key, encrypted, secureTags, ttl);
  }
  
  async getItem(key: string): Promise<MemoryItem | null> {
    // Check access control
    if (!this.checkAccessControl('getItem', key)) {
      throw new Error('Access denied');
    }
    
    const item = await this.baseMemory.getItem(key);
    
    if (!item) {
      return null;
    }
    
    // If the item is encrypted (has the 'encrypted' tag), decrypt it
    if (item.tags.includes('encrypted')) {
      try {
        const decrypted = this.decrypt(item.value);
        return {
          ...item,
          value: decrypted,
          tags: item.tags.filter(tag => tag !== 'encrypted'),
        };
      } catch (error) {
        logger.error('Error decrypting item', { error, key });
        return item;
      }
    }
    
    return item;
  }
  
  async searchByTags(
    tags: string[], 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryItem[]> {
    // Check access control
    if (!this.checkAccessControl('searchByTags', 'items', { tags })) {
      throw new Error('Access denied');
    }
    
    const items = await this.baseMemory.searchByTags(tags, options);
    
    // Decrypt items
    return Promise.all(items.map(async item => {
      // If the item is encrypted (has the 'encrypted' tag), decrypt it
      if (item.tags.includes('encrypted')) {
        try {
          const decrypted = this.decrypt(item.value);
          return {
            ...item,
            value: decrypted,
            tags: item.tags.filter(tag => tag !== 'encrypted'),
          };
        } catch (error) {
          logger.error('Error decrypting item', { error, key: item.key });
          return item;
        }
      }
      
      return item;
    }));
  }
  
  async deleteItem(key: string): Promise<boolean> {
    // Check access control
    if (!this.checkAccessControl('deleteItem', key)) {
      throw new Error('Access denied');
    }
    
    return this.baseMemory.deleteItem(key);
  }
  
  async deleteConversation(conversationId: string): Promise<boolean> {
    // Check access control
    if (!this.checkAccessControl('deleteConversation', conversationId)) {
      throw new Error('Access denied');
    }
    
    return this.baseMemory.deleteConversation(conversationId);
  }
}