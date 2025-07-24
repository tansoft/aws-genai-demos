/**
 * Example of using the DynamoDB memory manager
 */
import { config, logger } from '../../common';
import { ConversationManager, DynamoDBMemoryManager } from '../services';

/**
 * Run the DynamoDB memory example
 */
async function runDynamoDBExample() {
  try {
    // Check if DynamoDB table is configured
    if (!config.memory.longTerm.tableName) {
      console.error('DynamoDB table name not configured. Please set MEMORY_TABLE_NAME in .env');
      process.exit(1);
    }
    
    console.log('Starting DynamoDB memory example...');
    console.log(`Using table: ${config.memory.longTerm.tableName}`);
    
    // Initialize the DynamoDB memory manager
    const memoryManager = new DynamoDBMemoryManager({
      tableName: config.memory.longTerm.tableName,
    });
    
    // Initialize the conversation manager
    const conversationManager = new ConversationManager(memoryManager);
    
    // Start a new conversation
    console.log('Creating a new conversation...');
    const conversationId = await conversationManager.startConversation({
      topic: 'DynamoDB Memory Example',
      createdAt: new Date().toISOString(),
    });
    
    console.log(`Conversation created with ID: ${conversationId}`);
    
    // Add messages to the conversation
    console.log('Adding messages to the conversation...');
    
    await conversationManager.addSystemMessage(
      conversationId,
      'You are a helpful assistant that explains AWS services.'
    );
    
    await conversationManager.addUserMessage(
      conversationId,
      'How does DynamoDB work with AWS AgentCore Memory?'
    );
    
    await conversationManager.addAssistantMessage(
      conversationId,
      'AWS AgentCore Memory uses DynamoDB as a persistent storage backend for long-term memory. ' +
      'It stores conversations, messages, and memory items in a DynamoDB table, allowing agents ' +
      'to maintain context and recall information across sessions and deployments.'
    );
    
    // Get the conversation history
    console.log('Getting conversation history...');
    const history = await conversationManager.getConversationHistory(conversationId);
    
    console.log(`Retrieved ${history.length} messages:`);
    history.forEach((message, index) => {
      console.log(`${index + 1}. ${message.role}: ${message.content.substring(0, 50)}...`);
    });
    
    // Store some items in memory
    console.log('Storing items in memory...');
    
    await memoryManager.storeItem(
      'dynamodb-info',
      {
        service: 'DynamoDB',
        type: 'NoSQL database',
        features: ['key-value store', 'document store', 'high availability'],
      },
      ['aws', 'database', 'nosql']
    );
    
    await memoryManager.storeItem(
      'memory-types',
      {
        shortTerm: 'In-memory storage for active sessions',
        longTerm: 'DynamoDB storage for persistent data',
      },
      ['memory', 'agentcore']
    );
    
    // Search for items by tags
    console.log('Searching for items by tags...');
    
    const awsItems = await memoryManager.searchByTags(['aws']);
    console.log(`Found ${awsItems.length} items with tag 'aws':`);
    awsItems.forEach(item => {
      console.log(`- ${item.key}: ${JSON.stringify(item.value)}`);
    });
    
    const memoryItems = await memoryManager.searchByTags(['memory']);
    console.log(`Found ${memoryItems.length} items with tag 'memory':`);
    memoryItems.forEach(item => {
      console.log(`- ${item.key}: ${JSON.stringify(item.value)}`);
    });
    
    console.log('DynamoDB memory example completed successfully');
  } catch (error) {
    console.error('Error in DynamoDB memory example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runDynamoDBExample();
}

export default runDynamoDBExample;