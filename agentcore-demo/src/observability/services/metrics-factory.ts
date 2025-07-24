/**
 * Metrics Factory for AWS AgentCore
 * Creates appropriate metrics collector instances based on environment
 */

import { MetricsCollector, ObservabilityConfig } from '../models/observability';
import { CloudWatchMetrics } from './cloudwatch-metrics';
import { LocalMetrics } from './local-metrics';

/**
 * Metrics Factory
 */
export class MetricsFactory {
  /**
   * Create a metrics collector instance
   * @param config Observability configuration
   * @returns MetricsCollector instance
   */
  public static createMetricsCollector(config: ObservabilityConfig): MetricsCollector {
    // Determine if we're running in AWS environment
    const isAws = process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // Create appropriate metrics collector
    if (isAws && process.env.NODE_ENV !== 'test') {
      return new CloudWatchMetrics(config);
    } else {
      return new LocalMetrics(config);
    }
  }
}