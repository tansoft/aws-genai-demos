/**
 * Tests for CloudWatchLogger
 */

import { CloudWatchLogger, LogLevel, ObservabilityConfig } from '../index';
import * as AWS from 'aws-sdk';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockCloudWatchLogs = {
    createLogGroup: jest.fn().mockReturnThis(),
    createLogStream: jest.fn().mockReturnThis(),
    putLogEvents: jest.fn().mockReturnThis(),
    describeLogStreams: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      nextSequenceToken: 'mock-sequence-token',
      logStreams: [
        {
          logStreamName: 'mock-stream',
          uploadSequenceToken: 'mock-sequence-token'
        }
      ]
    })
  };
  
  return {
    CloudWatchLogs: jest.fn(() => mockCloudWatchLogs)
  };
});

describe('CloudWatchLogger', () => {
  let logger: CloudWatchLogger;
  let mockCloudWatchLogs: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mock instance
    mockCloudWatchLogs = new AWS.CloudWatchLogs();
    
    // Create logger
    const config: ObservabilityConfig = {
      logLevel: LogLevel.DEBUG,
      logGroupName: 'test-log-group',
      serviceName: 'test-service'
    };
    
    logger = new CloudWatchLogger(config);
  });
  
  afterEach(() => {
    // Clean up
    if (logger && 'dispose' in logger) {
      logger.dispose();
    }
  });

  test('should initialize log group and stream', async () => {
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockCloudWatchLogs.createLogGroup).toHaveBeenCalled();
    expect(mockCloudWatchLogs.createLogStream).toHaveBeenCalled();
  });

  test('should log messages at different levels', () => {
    // Spy on console methods
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Log messages
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Check console output
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Restore console
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should handle context in logs', () => {
    // Set context
    logger.setContext({ requestId: 'test-request-id' });
    
    // Spy on internal log method
    const logSpy = jest.spyOn(logger as any, 'log');
    
    // Log with additional context
    logger.info('Info with context', { key: 'value' });
    
    // Check context
    expect(logSpy).toHaveBeenCalledWith(
      LogLevel.INFO,
      'Info with context',
      { key: 'value' }
    );
    
    // Restore spy
    logSpy.mockRestore();
  });

  test('should flush logs to CloudWatch', async () => {
    // Log some messages
    logger.info('Test message 1');
    logger.info('Test message 2');
    
    // Flush logs
    await (logger as any).flush();
    
    // Check if putLogEvents was called
    expect(mockCloudWatchLogs.putLogEvents).toHaveBeenCalled();
    expect(mockCloudWatchLogs.putLogEvents.mock.calls[0][0].logEvents.length).toBeGreaterThan(0);
  });

  test('should handle errors when flushing logs', async () => {
    // Mock error
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockCloudWatchLogs.putLogEvents.mockImplementation(() => {
      return {
        promise: jest.fn().mockRejectedValue({ code: 'SomeError' })
      };
    });
    
    // Log and flush
    logger.info('Test message');
    await (logger as any).flush();
    
    // Check error handling
    expect(errorSpy).toHaveBeenCalled();
    
    // Restore
    errorSpy.mockRestore();
  });

  test('should handle InvalidSequenceTokenException', async () => {
    // Mock sequence token error
    mockCloudWatchLogs.putLogEvents.mockImplementationOnce(() => {
      return {
        promise: jest.fn().mockRejectedValue({ code: 'InvalidSequenceTokenException' })
      };
    }).mockImplementationOnce(() => {
      return {
        promise: jest.fn().mockResolvedValue({ nextSequenceToken: 'new-token' })
      };
    });
    
    // Log and flush
    logger.info('Test message');
    await (logger as any).flush();
    
    // Check if describeLogStreams was called
    expect(mockCloudWatchLogs.describeLogStreams).toHaveBeenCalled();
  });
});