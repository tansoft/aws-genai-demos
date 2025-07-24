/**
 * Logger Factory for AWS AgentCore
 * Creates appropriate logger instances based on environment
 */

import { Logger, ObservabilityConfig } from '../models/observability';
import { CloudWatchLogger } from './cloudwatch-logger';
import { LocalLogger } from './local-logger';

/**
 * Logger Factory
 */
export class LoggerFactory {
  /**
   * Create a logger instance
   * @param config Observability configuration
   * @param context Optional context name
   * @returns Logger instance
   */
  public static createLogger(config: ObservabilityConfig, context?: string): Logger {
    // Determine if we're running in AWS environment
    const isAws = process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // Create context-specific config
    const contextConfig: ObservabilityConfig = {
      ...config,
      serviceName: context ? `${config.serviceName || 'aws-agentcore'}.${context}` : config.serviceName
    };
    
    // Create appropriate logger
    if (isAws && process.env.NODE_ENV !== 'test') {
      return new CloudWatchLogger(contextConfig);
    } else {
      return new LocalLogger(contextConfig);
    }
  }
}