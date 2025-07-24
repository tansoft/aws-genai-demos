/**
 * Examples module for AWS AgentCore
 */

// Export examples
export * from './chatbot';
export * from './data-analysis';
export * from './document-processing';

// Import example functions
import runChatbotExample from './chatbot';
import runDataAnalysisExample from './data-analysis';
import runDocumentProcessingExample from './document-processing';

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('=== Running AWS AgentCore Examples ===');
  
  // Run chatbot example
  console.log('\n--- Running Chatbot Example ---');
  await runChatbotExample();
  
  // Run data analysis example
  console.log('\n--- Running Data Analysis Example ---');
  await runDataAnalysisExample();
  
  // Run document processing example
  console.log('\n--- Running Document Processing Example ---');
  await runDocumentProcessingExample();
  
  console.log('\n=== All Examples Completed ===');
}

export default runAllExamples;