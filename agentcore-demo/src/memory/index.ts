import { config, logger } from '../common';
import { 
  ConversationManager, 
  ShortTermMemoryManager, 
  DynamoDBMemoryManager,
  HybridMemoryManager,
  SecureMemoryManager,
  MemoryFactory,
  MemoryType
} from './services';
import { MemoryUtils } from './utils';

/**
 * Memory demo for AWS AgentCore
 * Demonstrates short-term and long-term memory capabilities
 */
export default async function memoryDemo() {
  logger.info('Starting Memory demo');
  
  try {
    // Check if DynamoDB table is configured
    const useDynamoDB = config.memory.longTerm.enabled && config.memory.longTerm.tableName;
    const useSecureMemory = true; // Enable secure memory for the demo
    
    logger.info('Memory configuration', {
      shortTermEnabled: config.memory.shortTerm.enabled,
      longTermEnabled: config.memory.longTerm.enabled,
      tableName: config.memory.longTerm.tableName || 'not configured',
      secureMemoryEnabled: useSecureMemory,
    });
    
    // Initialize the appropriate memory manager
    let memoryManager;
    let conversationManager;
    
    if (useSecureMemory) {
      logger.info('Using secure memory manager');
      
      // Create the base memory manager
      let baseMemory;
      
      if (useDynamoDB) {
        logger.info('Using hybrid memory as base (short-term + DynamoDB)');
        
        // Initialize the hybrid memory manager
        baseMemory = new HybridMemoryManager({
          shortTerm: {
            maxMessages: config.memory.shortTerm.maxMessages,
            maxConversations: 5,
          },
          longTerm: {
            tableName: config.memory.longTerm.tableName,
          },
          syncInterval: 5000, // Sync every 5 seconds for demo
        });
      } else {
        logger.info('Using short-term memory as base');
        
        // Initialize the short-term memory manager
        baseMemory = new ShortTermMemoryManager({
          maxMessages: config.memory.shortTerm.maxMessages,
          maxConversations: 5,
        });
      }
      
      // Wrap the base memory with secure memory
      const secureMemory = new SecureMemoryManager(baseMemory, {
        encryptionKey: 'this-is-a-very-secure-encryption-key-12345',
        accessControl: {
          enabled: true,
          roles: ['admin', 'user'],
          users: ['demo-user'],
        },
        redactionEnabled: true,
        auditLogging: true,
      });
      
      memoryManager = secureMemory;
      conversationManager = new ConversationManager(memoryManager);
    } else if (useDynamoDB) {
      logger.info('Using hybrid memory manager (short-term + DynamoDB)');
      
      // Initialize the hybrid memory manager
      const hybridMemory = new HybridMemoryManager({
        shortTerm: {
          maxMessages: config.memory.shortTerm.maxMessages,
          maxConversations: 5,
        },
        longTerm: {
          tableName: config.memory.longTerm.tableName,
        },
        syncInterval: 5000, // Sync every 5 seconds for demo
      });
      
      memoryManager = hybridMemory;
      conversationManager = new ConversationManager(memoryManager);
    } else {
      logger.info('Using short-term memory manager only');
      
      // Initialize the short-term memory manager
      const shortTermMemory = new ShortTermMemoryManager({
        maxMessages: config.memory.shortTerm.maxMessages,
        maxConversations: 5,
      });
      
      memoryManager = shortTermMemory;
      conversationManager = new ConversationManager(memoryManager);
    }
    
    // Start a new conversation
    logger.info('Creating a new conversation');
    const conversationId = await conversationManager.startConversation({
      topic: 'AWS AgentCore Memory Demo',
      createdBy: 'Demo User',
    });
    
    logger.info('Conversation created', { conversationId });
    
    // Add messages to the conversation
    logger.info('Adding messages to the conversation');
    
    await conversationManager.addSystemMessage(
      conversationId,
      'You are a helpful assistant that explains AWS services concisely.'
    );
    
    await conversationManager.addUserMessage(
      conversationId,
      'Hello! My email is user@example.com. Can you tell me about AWS AgentCore?'
    );
    
    await conversationManager.addAssistantMessage(
      conversationId,
      'AWS AgentCore is a comprehensive set of tools for building, deploying, and managing AI agents. ' +
      'It provides features like serverless runtime for any protocol and model, memory management, ' +
      'identity and security, tool integration, code execution, web browsing, and observability.'
    );
    
    await conversationManager.addUserMessage(
      conversationId,
      'What are the key features of the memory system?'
    );
    
    await conversationManager.addAssistantMessage(
      conversationId,
      'The AWS AgentCore memory system provides both short-term and long-term memory capabilities. ' +
      'Short-term memory handles conversation context within a session, while long-term memory ' +
      'stores persistent data across sessions. It supports conversation history tracking, ' +
      'memory retrieval, and summarization.'
    );
    
    await conversationManager.addToolMessage(
      conversationId,
      JSON.stringify({
        tool: 'memory_stats',
        result: {
          conversations: 1,
          messages: 5,
          items: 0,
        }
      })
    );
    
    // Get the conversation history
    logger.info('Getting conversation history');
    const history = await conversationManager.getConversationHistory(conversationId);
    
    logger.info('Conversation history', {
      conversationId,
      messageCount: history.length,
      firstMessage: history[0].content.substring(0, 50) + '...',
      lastMessage: history[history.length - 1].content.substring(0, 50) + '...',
    });
    
    // Get formatted history for different providers
    logger.info('Getting formatted history for different providers');
    
    const openaiHistory = await conversationManager.getFormattedHistory(conversationId, 'openai');
    logger.info('OpenAI formatted history', {
      provider: 'openai',
      messageCount: openaiHistory.length,
    });
    
    const anthropicHistory = await conversationManager.getFormattedHistory(conversationId, 'anthropic');
    logger.info('Anthropic formatted history', {
      provider: 'anthropic',
      messageCount: anthropicHistory.length,
    });
    
    // Extract recent messages
    logger.info('Extracting recent messages');
    const recentMessages = MemoryUtils.extractRecentMessages(history, 1000);
    logger.info('Recent messages', {
      count: recentMessages.length,
    });
    
    // Extract keywords
    logger.info('Extracting keywords');
    const keywords = MemoryUtils.extractKeywords(history);
    logger.info('Keywords', { keywords });
    
    // Store items in memory
    logger.info('Storing items in memory');
    
    await memoryManager.storeItem(
      'conversation_summary',
      {
        conversationId,
        summary: 'Conversation about AWS AgentCore memory features',
        keywords,
      },
      ['summary', 'agentcore', 'memory']
    );
    
    await memoryManager.storeItem(
      'memory_features',
      {
        shortTerm: ['conversation history', 'context tracking'],
        longTerm: ['persistent storage', 'retrieval', 'summarization'],
      },
      ['features', 'memory']
    );
    
    // Search for items by tags
    logger.info('Searching for items by tags');
    const memoryItems = await memoryManager.searchByTags(['memory']);
    logger.info('Memory items', {
      count: memoryItems.length,
      keys: memoryItems.map(item => item.key),
    });
    
    // Summarize the conversation
    logger.info('Summarizing the conversation');
    const summary = await conversationManager.summarizeConversation(conversationId);
    logger.info('Conversation summary', { summary });
    
    // If using hybrid memory, force sync to long-term memory
    if (useDynamoDB && memoryManager instanceof HybridMemoryManager) {
      logger.info('Forcing sync to long-term memory');
      await memoryManager.forceSyncAll();
      logger.info('Sync completed');
    }
    
    // Demonstrate secure memory features
    logger.info('Demonstrating secure memory features');
    
    // Store sensitive information
    logger.info('Storing sensitive information');
    await memoryManager.storeItem(
      'user-info',
      {
        email: 'user@example.com',
        phone: '123-456-7890',
        creditCard: '4111-1111-1111-1111',
      },
      ['user', 'sensitive']
    );
    
    // Retrieve the sensitive information
    logger.info('Retrieving sensitive information');
    const userInfo = await memoryManager.getItem('user-info');
    logger.info('Retrieved user info', { userInfo: userInfo?.value });
    
    logger.info('Memory demo completed successfully');
  } catch (error) {
    logger.error('Error in memory demo', { error });
  }
}