/**
 * Example demonstrating AWS AgentCore chatbot capabilities
 * This example integrates runtime, memory, gateway, and observability features
 */

import * as readline from 'readline';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { ProviderFactory } from '../../runtime/services/provider-factory';
import { ProtocolFactory } from '../../runtime/services/protocol-factory';
import { ConversationManager } from '../../memory/services/conversation-manager';
import { ShortTermMemory } from '../../memory/services/short-term-memory';
import { ToolExecutor } from '../../gateway/services/tool-executor';
import { createObservabilityManager, LogLevel } from '../../observability';
import { ChatbotService } from './chatbot-service';
import { getToolDefinitions } from './example-tools';
import { ChatbotSession } from './models';

/**
 * Run the chatbot example
 */
async function runChatbotExample() {
  console.log('=== AWS AgentCore Chatbot Example ===');
  
  try {
    // Set up observability
    const observability = createObservabilityManager({
      logLevel: LogLevel.INFO,
      serviceName: 'chatbot-example'
    });
    
    const logger = observability.getLogger();
    logger.info('Starting chatbot example');
    
    // Set up runtime service
    const providerFactory = new ProviderFactory();
    const protocolFactory = new ProtocolFactory();
    const runtimeService = new RuntimeService(providerFactory, protocolFactory);
    
    // Set up memory
    const shortTermMemory = new ShortTermMemory();
    const conversationManager = new ConversationManager(shortTermMemory);
    
    // Set up tools
    const toolDefinitions = getToolDefinitions();
    const toolExecutor = new ToolExecutor();
    
    // Register tools
    for (const tool of toolDefinitions) {
      toolExecutor.registerTool(
        tool.name,
        tool.description,
        tool.parameters,
        tool.function
      );
    }
    
    // Create chatbot service
    const chatbot = new ChatbotService(
      {
        name: 'AgentCore Assistant',
        description: 'A helpful assistant powered by AWS AgentCore',
        systemPrompt: 'You are a helpful assistant powered by AWS AgentCore. You can answer questions, provide information, and use tools to help the user.',
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        modelName: process.env.MODEL_NAME || 'gpt-3.5-turbo',
        temperature: 0.7,
        memoryEnabled: true,
        toolsEnabled: true
      },
      runtimeService,
      conversationManager,
      toolExecutor,
      observability
    );
    
    // Create a new session
    const session = chatbot.createSession('example-user', {
      source: 'cli-example'
    });
    
    logger.info('Created new chatbot session', { sessionId: session.id });
    
    // Start interactive chat
    await startInteractiveChat(chatbot, session);
    
  } catch (error) {
    console.error('Error running chatbot example:', error);
  }
}

/**
 * Start interactive chat
 * @param chatbot Chatbot service
 * @param session Chatbot session
 */
async function startInteractiveChat(chatbot: ChatbotService, session: ChatbotSession) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\nWelcome to the AWS AgentCore Chatbot!');
  console.log('Type your messages and press Enter to send.');
  console.log('Type "exit" or "quit" to end the conversation.\n');
  
  // Display initial message
  console.log('Assistant: Hello! I\'m your AWS AgentCore assistant. How can I help you today?\n');
  
  // Start conversation loop
  let conversationActive = true;
  
  while (conversationActive) {
    const userInput = await new Promise<string>(resolve => {
      rl.question('You: ', resolve);
    });
    
    // Check for exit command
    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      console.log('\nEnding conversation. Goodbye!');
      conversationActive = false;
      continue;
    }
    
    try {
      // Send message to chatbot
      console.log('\nAssistant is thinking...');
      const response = await chatbot.sendMessage(session, userInput);
      
      // Display response
      console.log(`\nAssistant: ${response.content}\n`);
      
    } catch (error) {
      console.error('Error:', (error as Error).message);
    }
  }
  
  // Close readline interface
  rl.close();
}

// Run the example if this file is executed directly
if (require.main === module) {
  runChatbotExample()
    .then(() => console.log('Example finished'))
    .catch(err => console.error('Example failed:', err));
}

export { runChatbotExample };