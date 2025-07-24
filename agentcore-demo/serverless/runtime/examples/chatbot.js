#!/usr/bin/env node

/**
 * Simple chatbot example using the AWS AgentCore Runtime serverless API
 */
const axios = require('axios');
const readline = require('readline');

// Get API URL from command line or environment
const apiUrl = process.argv[2] || process.env.RUNTIME_API_URL;

if (!apiUrl) {
  console.error('Error: API URL is required');
  console.error('Usage: ./chatbot.js <api-url>');
  console.error('Example: ./chatbot.js https://example.execute-api.us-west-2.amazonaws.com/dev/complete');
  console.error('Or set RUNTIME_API_URL environment variable');
  process.exit(1);
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize conversation history
const messages = [
  {
    role: 'system',
    content: 'You are a helpful assistant that explains AWS services concisely. You specialize in AWS AgentCore and its features.'
  }
];

// Function to make API request
async function makeRequest(userMessage) {
  try {
    // Add user message to history
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Make API request
    const response = await axios.post(apiUrl, {
      messages,
    });
    
    // Add assistant response to history
    const assistantMessage = response.data.text;
    messages.push({
      role: 'assistant',
      content: assistantMessage
    });
    
    // Print assistant response
    console.log('\n🤖 Assistant: ' + assistantMessage);
    console.log('\n(Tokens: ' + response.data.usage.totalTokens + ')');
  } catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Function to prompt user for input
function promptUser() {
  rl.question('\n👤 You: ', async (input) => {
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    
    await makeRequest(input);
    promptUser();
  });
}

// Start the chatbot
console.log('🤖 AWS AgentCore Chatbot');
console.log('Type "exit" or "quit" to end the conversation');
promptUser();