#!/usr/bin/env node

/**
 * Simple client for the AWS AgentCore Runtime serverless API
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get API URL from command line or environment
const apiUrl = process.argv[2] || process.env.RUNTIME_API_URL;

if (!apiUrl) {
  console.error('Error: API URL is required');
  console.error('Usage: ./client.js <api-url> [prompt]');
  console.error('Example: ./client.js https://example.execute-api.us-west-2.amazonaws.com/dev/complete "What is AWS AgentCore?"');
  console.error('Or set RUNTIME_API_URL environment variable');
  process.exit(1);
}

// Get prompt from command line or use default
const prompt = process.argv[3] || 'Explain what AWS AgentCore is in one paragraph:';

// Make the API request
async function makeRequest() {
  try {
    console.log(`Sending request to ${apiUrl}`);
    console.log(`Prompt: ${prompt}`);
    
    const response = await axios.post(apiUrl, {
      prompt,
    });
    
    console.log('\nResponse:');
    console.log(response.data.text);
    console.log('\nUsage:', response.data.usage);
  } catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the client
makeRequest();