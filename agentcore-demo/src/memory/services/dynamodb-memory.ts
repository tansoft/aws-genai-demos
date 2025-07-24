/**
 * DynamoDB-based memory manager for AWS AgentCore
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  QueryCommand, 
  DeleteItemCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '../../common';
import { 
  ConversationMemory, 
  MemoryItem, 
  MemoryManager, 
  MemoryMessage, 
  MemoryQueryOptions 
} from '../models';

/**
 * Configuration for DynamoDB memory manager
 */
export interface DynamoDBMemoryConfig {
  tableName: string;
  region?: string;
  endpoint?: string;
  conversationPrefix?: string;
  itemPrefix?: string;
}

/**
 * DynamoDB implementation of the memory manager
 */
export class DynamoDBMemoryManager implements MemoryManager {
  private client: DynamoDBClient;
  private config: DynamoDBMemoryConfig;
  
  constructor(config: DynamoDBMemoryConfig) {
    this.config = {
      conversationPrefix: 'CONV#',
      itemPrefix: 'ITEM#',
      ...config,
    };
    
    this.client = new DynamoDBClient({
      region: config.region,
      endpoint: config.endpoint,
    });
    
    logger.info('DynamoDB memory manager initialized', { 
      tableName: this.config.tableName,
      region: this.config.region || 'default',
    });
  }
  
  async getConversation(conversationId: string): Promise<ConversationMemory | null> {
    try {
      const key = `${this.config.conversationPrefix}${conversationId}`;
      
      const command = new GetItemCommand({
        TableName: this.config.tableName,
        Key: marshall({ key }),
      });
      
      const response = await this.client.send(command);
      
      if (!response.Item) {
        return null;
      }
      
      const item = unmarshall(response.Item);
      return item.value as ConversationMemory;
    } catch (error) {
      logger.error('Error getting conversation from DynamoDB', { error, conversationId });
      throw error;
    }
  }
  
  async createConversation(metadata: Record<string, any> = {}): Promise<ConversationMemory> {
    try {
      const conversationId = uuidv4();
      const now = new Date().toISOString();
      
      const conversation: ConversationMemory = {
        conversationId,
        messages: [],
        metadata,
        createdAt: now,
        updatedAt: now,
      };
      
      const key = `${this.config.conversationPrefix}${conversationId}`;
      
      const command = new PutItemCommand({
        TableName: this.config.tableName,
        Item: marshall({
          key,
          type: 'conversation',
          value: conversation,
          createdAt: now,
          updatedAt: now,
        }),
      });
      
      await this.client.send(command);
      logger.debug('Created new conversation in DynamoDB', { conversationId });
      
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation in DynamoDB', { error });
      throw error;
    }
  }
  
  async addMessage(
    conversationId: string, 
    message: Omit<MemoryMessage, 'id' | 'timestamp'>
  ): Promise<MemoryMessage> {
    try {
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
      
      // Update the conversation in DynamoDB
      const key = `${this.config.conversationPrefix}${conversationId}`;
      
      const command = new PutItemCommand({
        TableName: this.config.tableName,
        Item: marshall({
          key,
          type: 'conversation',
          value: conversation,
          createdAt: new Date(conversation.createdAt).toISOString(),
          updatedAt: conversation.updatedAt,
        }),
      });
      
      await this.client.send(command);
      logger.debug('Added message to conversation in DynamoDB', { 
        conversationId, 
        messageId: fullMessage.id, 
        role: fullMessage.role 
      });
      
      return fullMessage;
    } catch (error) {
      logger.error('Error adding message to conversation in DynamoDB', { error, conversationId });
      throw error;
    }
  }
  
  async getMessages(
    conversationId: string, 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryMessage[]> {
    try {
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
    } catch (error) {
      logger.error('Error getting messages from DynamoDB', { error, conversationId });
      throw error;
    }
  }
  
  async storeItem(
    key: string, 
    value: any, 
    tags: string[] = [], 
    ttl?: number
  ): Promise<MemoryItem> {
    try {
      const now = new Date().toISOString();
      const itemKey = `${this.config.itemPrefix}${key}`;
      
      const item: MemoryItem = {
        key,
        value,
        tags,
        ttl,
        createdAt: now,
        updatedAt: now,
      };
      
      // Create tag entries for searching
      const tagPromises = tags.map(tag => {
        const tagKey = `TAG#${tag}#${key}`;
        
        const command = new PutItemCommand({
          TableName: this.config.tableName,
          Item: marshall({
            key: tagKey,
            type: 'tag',
            itemKey,
            tag,
            createdAt: now,
          }),
        });
        
        return this.client.send(command);
      });
      
      // Store the main item
      const itemCommand = new PutItemCommand({
        TableName: this.config.tableName,
        Item: marshall({
          key: itemKey,
          type: 'item',
          value: item.value,
          tags: item.tags,
          ttl: item.ttl,
          createdAt: now,
          updatedAt: now,
        }),
      });
      
      await Promise.all([...tagPromises, this.client.send(itemCommand)]);
      logger.debug('Stored item in DynamoDB', { key, tags });
      
      return item;
    } catch (error) {
      logger.error('Error storing item in DynamoDB', { error, key });
      throw error;
    }
  }
  
  async getItem(key: string): Promise<MemoryItem | null> {
    try {
      const itemKey = `${this.config.itemPrefix}${key}`;
      
      const command = new GetItemCommand({
        TableName: this.config.tableName,
        Key: marshall({ key: itemKey }),
      });
      
      const response = await this.client.send(command);
      
      if (!response.Item) {
        return null;
      }
      
      const item = unmarshall(response.Item);
      
      // Check if the item has expired
      if (item.ttl !== undefined) {
        const now = Math.floor(Date.now() / 1000);
        if (now > item.ttl) {
          // Item has expired, delete it
          await this.deleteItem(key);
          logger.debug('Item has expired', { key });
          return null;
        }
      }
      
      return {
        key,
        value: item.value,
        tags: item.tags || [],
        ttl: item.ttl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting item from DynamoDB', { error, key });
      throw error;
    }
  }
  
  async searchByTags(
    tags: string[], 
    options: MemoryQueryOptions = {}
  ): Promise<MemoryItem[]> {
    try {
      if (tags.length === 0) {
        return [];
      }
      
      // For simplicity, we'll search for items with the first tag
      // and then filter the results for the remaining tags
      const tag = tags[0];
      const tagPrefix = `TAG#${tag}#`;
      
      const command = new QueryCommand({
        TableName: this.config.tableName,
        KeyConditionExpression: 'begins_with(#key, :tagPrefix)',
        ExpressionAttributeNames: {
          '#key': 'key',
        },
        ExpressionAttributeValues: marshall({
          ':tagPrefix': tagPrefix,
        }),
        Limit: options.limit,
      });
      
      const response = await this.client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }
      
      // Get the item keys from the tag entries
      const itemKeys = response.Items.map(item => unmarshall(item).itemKey);
      
      // Get the actual items
      const itemPromises = itemKeys.map(itemKey => {
        const command = new GetItemCommand({
          TableName: this.config.tableName,
          Key: marshall({ key: itemKey }),
        });
        
        return this.client.send(command);
      });
      
      const itemResponses = await Promise.all(itemPromises);
      
      // Filter out items that don't exist or don't have all the tags
      const items: MemoryItem[] = [];
      
      for (const response of itemResponses) {
        if (response.Item) {
          const item = unmarshall(response.Item);
          
          // Check if the item has all the tags
          if (tags.every(tag => item.tags && item.tags.includes(tag))) {
            const key = item.key.replace(this.config.itemPrefix!, '');
            
            items.push({
              key,
              value: item.value,
              tags: item.tags || [],
              ttl: item.ttl,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            });
          }
        }
      }
      
      return items;
    } catch (error) {
      logger.error('Error searching by tags in DynamoDB', { error, tags });
      throw error;
    }
  }
  
  async deleteItem(key: string): Promise<boolean> {
    try {
      const itemKey = `${this.config.itemPrefix}${key}`;
      
      // First, get the item to get its tags
      const getCommand = new GetItemCommand({
        TableName: this.config.tableName,
        Key: marshall({ key: itemKey }),
      });
      
      const response = await this.client.send(getCommand);
      
      if (!response.Item) {
        return false;
      }
      
      const item = unmarshall(response.Item);
      const tags = item.tags || [];
      
      // Delete tag entries
      const tagPromises = tags.map(tag => {
        const tagKey = `TAG#${tag}#${key}`;
        
        const command = new DeleteItemCommand({
          TableName: this.config.tableName,
          Key: marshall({ key: tagKey }),
        });
        
        return this.client.send(command);
      });
      
      // Delete the main item
      const deleteCommand = new DeleteItemCommand({
        TableName: this.config.tableName,
        Key: marshall({ key: itemKey }),
      });
      
      await Promise.all([...tagPromises, this.client.send(deleteCommand)]);
      logger.debug('Deleted item from DynamoDB', { key });
      
      return true;
    } catch (error) {
      logger.error('Error deleting item from DynamoDB', { error, key });
      throw error;
    }
  }
  
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const key = `${this.config.conversationPrefix}${conversationId}`;
      
      const command = new DeleteItemCommand({
        TableName: this.config.tableName,
        Key: marshall({ key }),
      });
      
      await this.client.send(command);
      logger.debug('Deleted conversation from DynamoDB', { conversationId });
      
      return true;
    } catch (error) {
      logger.error('Error deleting conversation from DynamoDB', { error, conversationId });
      throw error;
    }
  }
  
  /**
   * List all conversations
   * @param limit Maximum number of conversations to return
   */
  async listConversations(limit?: number): Promise<ConversationMemory[]> {
    try {
      const prefix = this.config.conversationPrefix;
      
      const command = new ScanCommand({
        TableName: this.config.tableName,
        FilterExpression: 'begins_with(#key, :prefix)',
        ExpressionAttributeNames: {
          '#key': 'key',
        },
        ExpressionAttributeValues: marshall({
          ':prefix': prefix,
        }),
        Limit: limit,
      });
      
      const response = await this.client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }
      
      const conversations: ConversationMemory[] = [];
      
      for (const item of response.Items) {
        const unmarshalled = unmarshall(item);
        conversations.push(unmarshalled.value as ConversationMemory);
      }
      
      return conversations;
    } catch (error) {
      logger.error('Error listing conversations from DynamoDB', { error });
      throw error;
    }
  }
  
  /**
   * List all items
   * @param limit Maximum number of items to return
   */
  async listItems(limit?: number): Promise<MemoryItem[]> {
    try {
      const prefix = this.config.itemPrefix;
      
      const command = new ScanCommand({
        TableName: this.config.tableName,
        FilterExpression: 'begins_with(#key, :prefix)',
        ExpressionAttributeNames: {
          '#key': 'key',
        },
        ExpressionAttributeValues: marshall({
          ':prefix': prefix,
        }),
        Limit: limit,
      });
      
      const response = await this.client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }
      
      const items: MemoryItem[] = [];
      
      for (const item of response.Items) {
        const unmarshalled = unmarshall(item);
        const key = unmarshalled.key.replace(prefix, '');
        
        items.push({
          key,
          value: unmarshalled.value,
          tags: unmarshalled.tags || [],
          ttl: unmarshalled.ttl,
          createdAt: unmarshalled.createdAt,
          updatedAt: unmarshalled.updatedAt,
        });
      }
      
      return items;
    } catch (error) {
      logger.error('Error listing items from DynamoDB', { error });
      throw error;
    }
  }
}