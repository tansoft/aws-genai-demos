/**
 * Example of using the AWS AgentCore Runtime client
 */
import { RuntimeClient } from '../client';
import { CompletionRequest } from '../models';

/**
 * Run the client example
 */
async function runClientExample() {
  // Initialize the client
  const client = new RuntimeClient({
    apiUrl: process.env.RUNTIME_API_URL || 'http://localhost:3000/complete',
    apiKey: process.env.RUNTIME_API_KEY,
  });

  console.log('Running client example...');

  try {
    // Simple completion example
    const request: CompletionRequest = {
      prompt: 'Explain what AWS AgentCore is in one paragraph:',
    };

    console.log('Sending completion request...');
    const response = await client.complete(request);

    console.log('Completion result:');
    console.log(response.text);
    console.log('Usage:', response.usage);

    // Chat completion example
    const chatRequest: CompletionRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains AWS services concisely.'
        },
        {
          role: 'user',
          content: 'What are the key features of AWS AgentCore?'
        }
      ]
    };

    console.log('\nSending chat completion request...');
    const chatResponse = await client.complete(chatRequest);

    console.log('Chat completion result:');
    console.log(chatResponse.text);
    console.log('Usage:', chatResponse.usage);

    console.log('\nClient example completed successfully');
  } catch (error) {
    console.error('Error in client example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runClientExample();
}

export default runClientExample;