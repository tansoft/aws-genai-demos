/**
 * CloudWatch Logger implementation for AWS AgentCore
 * Provides structured logging with CloudWatch integration
 */

import * as AWS from 'aws-sdk';
import { LogEntry, LogLevel, Logger, ObservabilityConfig } from '../models/observability';

/**
 * CloudWatch Logger implementation
 */
export class CloudWatchLogger implements Logger {
  private cloudwatch: AWS.CloudWatchLogs;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;
  private context: Record<string, any> = {};
  private defaultLogLevel: LogLevel;
  private serviceName: string;
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;
  private initialized = false;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    this.cloudwatch = new AWS.CloudWatchLogs();
    this.logGroupName = config.logGroupName || 'aws-agentcore-logs';
    this.logStreamName = `${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 10)}`;
    this.defaultLogLevel = config.logLevel || LogLevel.INFO;
    this.serviceName = config.serviceName || 'aws-agentcore';
    
    // Set up flush interval (every 5 seconds)
    this.flushInterval = setInterval(() => this.flush(), 5000);
    
    // Initialize log group and stream
    this.initialize();
  }

  /**
   * Initialize log group and stream
   */
  private async initialize(): Promise<void> {
    try {
      // Create log group if it doesn't exist
      try {
        await this.cloudwatch.createLogGroup({
          logGroupName: this.logGroupName
        }).promise();
      } catch (error) {
        // Ignore if log group already exists
        if (error.code !== 'ResourceAlreadyExistsException') {
          console.error('Error creating log group:', error);
        }
      }

      // Create log stream
      try {
        await this.cloudwatch.createLogStream({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName
        }).promise();
      } catch (error) {
        console.error('Error creating log stream:', error);
        return;
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing CloudWatch logger:', error);
    }
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param context Additional context
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param context Additional context
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param context Additional context
   */
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param error Error object
   * @param context Additional context
   */
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : context;
    
    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Set context for all subsequent logs
   * @param context Context object
   */
  public setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Log a message with the specified level
   * @param level Log level
   * @param message Message to log
   * @param context Additional context
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Skip if log level is below configured level
    if (this.getLevelValue(level) < this.getLevelValue(this.defaultLogLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context: { ...this.context, ...(context || {}) },
      service: this.serviceName,
      requestId: this.context.requestId
    };

    // Add to buffer
    this.buffer.push(logEntry);

    // Also log to console for local development
    this.logToConsole(logEntry);

    // Flush immediately for errors
    if (level === LogLevel.ERROR) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to CloudWatch
   */
  public async flush(): Promise<void> {
    if (!this.initialized || this.buffer.length === 0) {
      return;
    }

    const logEvents = this.buffer.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      message: JSON.stringify(entry)
    }));

    this.buffer = [];

    try {
      const params: AWS.CloudWatchLogs.PutLogEventsRequest = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents
      };

      if (this.sequenceToken) {
        params.sequenceToken = this.sequenceToken;
      }

      const response = await this.cloudwatch.putLogEvents(params).promise();
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      if (error.code === 'InvalidSequenceTokenException') {
        // Get the correct sequence token and retry
        try {
          const streams = await this.cloudwatch.describeLogStreams({
            logGroupName: this.logGroupName,
            logStreamNamePrefix: this.logStreamName
          }).promise();
          
          const stream = streams.logStreams?.find(s => s.logStreamName === this.logStreamName);
          if (stream && stream.uploadSequenceToken) {
            this.sequenceToken = stream.uploadSequenceToken;
            await this.flush();
          }
        } catch (describeError) {
          console.error('Error getting sequence token:', describeError);
        }
      } else {
        console.error('Error flushing logs to CloudWatch:', error);
      }
    }
  }

  /**
   * Log to console for local development
   * @param entry Log entry
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context } = entry;
    let consoleMethod: 'log' | 'info' | 'warn' | 'error';
    
    switch (level) {
      case LogLevel.DEBUG:
        consoleMethod = 'log';
        break;
      case LogLevel.INFO:
        consoleMethod = 'info';
        break;
      case LogLevel.WARN:
        consoleMethod = 'warn';
        break;
      case LogLevel.ERROR:
        consoleMethod = 'error';
        break;
      default:
        consoleMethod = 'log';
    }

    console[consoleMethod](`[${timestamp}] [${level}] ${message}`, context ? context : '');
  }

  /**
   * Get numeric value for log level for comparison
   * @param level Log level
   * @returns Numeric value
   */
  private getLevelValue(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG:
        return 0;
      case LogLevel.INFO:
        return 1;
      case LogLevel.WARN:
        return 2;
      case LogLevel.ERROR:
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    clearInterval(this.flushInterval);
    this.flush().catch(err => console.error('Error flushing logs during disposal:', err));
  }
}