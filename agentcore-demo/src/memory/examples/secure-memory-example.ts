/**
 * Example of using the secure memory manager
 */
import { config, logger } from '../../common';
import { 
  ConversationManager, 
  MemoryFactory, 
  MemoryType, 
  SecureMemoryManager, 
  ShortTermMemoryManager 
} from '../services';

/**
 * Run the secure memory example
 */
async function runSecureMemoryExample() {
  try {
    console.log('Starting secure memory example...');
    
    // Create a secure memory manager
    const baseMemory = new ShortTermMemoryManager({
      maxMessages: 100,
      maxConversations: 10,
    });
    
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
    
    // Create a conversation manager
    const conversationManager = new ConversationManager(secureMemory);
    
    // Start a new conversation
    console.log('Creating a new conversation...');
    const conversationId = await conversationManager.startConversation({
      topic: 'Secure Memory Example',
      createdBy: 'demo-user',
    });
    
    console.log(`Conversation created with ID: ${conversationId}`);
    
    // Add messages to the conversation
    console.log('Adding messages to the conversation...');
    
    await conversationManager.addSystemMessage(
      conversationId,
      'You are a helpful assistant that explains AWS services securely.'
    );
    
    await conversationManager.addUserMessage(
      conversationId,
      'My email is user@example.com and my phone is 123-456-7890. ' +
      'Can you tell me about AWS AgentCore memory security features?'
    );
    
    await conversationManager.addAssistantMessage(
      conversationId,
      'I notice you shared some personal information. I will keep that secure. ' +
      'AWS AgentCore memory security features include encryption, access control, ' +
      'and sensitive information redaction. Your data is encrypted at rest and in transit, ' +
      'and access is controlled based on roles and permissions.'
    );
    
    // Get the conversation history
    console.log('Getting conversation history...');
    const history = await conversationManager.getConversationHistory(conversationId);
    
    console.log(`Retrieved ${history.length} messages:`);
    history.forEach((message, index) => {
      console.log(`${index + 1}. ${message.role}: ${message.content}`);
    });
    
    // Notice that sensitive information is redacted
    console.log('\nNotice that sensitive information is redacted in the output.');
    
    // Store some sensitive information
    console.log('\nStoring sensitive information...');
    
    await secureMemory.storeItem(
      'user-info',
      {
        email: 'user@example.com',
        phone: '123-456-7890',
        creditCard: '4111-1111-1111-1111',
      },
      ['user', 'sensitive']
    );
    
    // Retrieve the sensitive information
    console.log('Retrieving sensitive information...');
    const userInfo = await secureMemory.getItem('user-info');
    
    console.log('Retrieved user info:');
    console.log(userInfo?.value);
    
    // The data is automatically decrypted when retrieved
    console.log('\nNotice that the data is automatically decrypted when retrieved.');
    
    // Search for items by tags
    console.log('\nSearching for items by tags...');
    const sensitiveItems = await secureMemory.searchByTags(['sensitive']);
    
    console.log(`Found ${sensitiveItems.length} sensitive items:`);
    sensitiveItems.forEach(item => {
      console.log(`- ${item.key}: ${JSON.stringify(item.value)}`);
    });
    
    console.log('\nSecure memory example completed successfully');
  } catch (error) {
    console.error('Error in secure memory example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runSecureMemoryExample();
}

export default runSecureMemoryExample;