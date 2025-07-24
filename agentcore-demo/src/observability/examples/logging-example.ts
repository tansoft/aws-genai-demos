/**
 * Example demonstrating AWS AgentCore logging capabilities
 */

import { createObservabilityManager, LogLevel } from '../index';

/**
 * Run the logging example
 */
async function runLoggingExample() {
  console.log('Running AWS AgentCore Logging Example');
  
  // Create observability manager with custom configuration
  const observability = createObservabilityManager({
    logLevel: LogLevel.DEBUG,
    logGroupName: 'aws-agentcore-example',
    serviceName: 'logging-example'
  });
  
  // Get logger
  const logger = observability.getLogger();
  
  // Log messages at different levels
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  
  // Log with context
  logger.info('Message with context', { 
    userId: '123456',
    operation: 'example'
  });
  
  // Set context for all subsequent logs
  logger.setContext({
    requestId: 'req-123',
    sessionId: 'sess-456'
  });
  
  // Log with the set context
  logger.info('This message includes the set context');
  
  // Get a context-specific logger
  const userLogger = observability.getLogger('user-service');
  userLogger.info('This message is from the user service context');
  
  // Log an error with stack trace
  try {
    throw new Error('Example error');
  } catch (error) {
    logger.error('An error occurred', error as Error, { 
      additionalInfo: 'This provides more context about the error'
    });
  }
  
  // Clean up (important for flushing buffered logs)
  if ('dispose' in observability) {
    (observability as any).dispose();
  }
  
  console.log('Logging example completed');
}

// Run the example if this file is executed directly
if (require.main === module) {
  runLoggingExample()
    .then(() => console.log('Example finished successfully'))
    .catch(err => console.error('Example failed:', err));
}

export { runLoggingExample };