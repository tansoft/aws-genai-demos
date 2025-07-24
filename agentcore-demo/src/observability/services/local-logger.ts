/**
 * Local Logger implementation for AWS AgentCore
 * Provides structured logging for local development
 */

import { LogLevel, Logger, ObservabilityConfig } from '../models/observability';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local Logger implementation
 */
export class LocalLogger implements Logger {
  private logLevel: LogLevel;
  private context: Record<string, any> = {};
  private serviceName: string;
  private logFilePath?: string;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    this.logLevel = config.logLevel || LogLevel.DEBUG;
    this.serviceName = config.serviceName || 'aws-agentcore';
    
    // Set up log file if specified
    if (process.env.LOCAL_LOG_FILE) {
      this.logFilePath = path.resolve(process.env.LOCAL_LOG_FILE);
      
      // Ensure directory exists
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
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
    if (this.getLevelValue(level) < this.getLevelValue(this.logLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context: { ...this.context, ...(context || {}) },
      service: this.serviceName,
      requestId: this.context.requestId
    };

    // Log to console
    this.logToConsole(logEntry);

    // Log to file if configured
    if (this.logFilePath) {
      this.logToFile(logEntry);
    }
  }

  /**
   * Log to console
   * @param entry Log entry
   */
  private logToConsole(entry: any): void {
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
   * Log to file
   * @param entry Log entry
   */
  private logToFile(entry: any): void {
    if (!this.logFilePath) return;

    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
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
}