/**
 * Tracer Factory for AWS AgentCore
 * Creates appropriate tracer instances based on environment
 */

import { Tracer, ObservabilityConfig } from '../models/observability';
import { XRayTracer } from './xray-tracer';
import { LocalTracer } from './local-tracer';

/**
 * Tracer Factory
 */
export class TracerFactory {
  /**
   * Create a tracer instance
   * @param config Observability configuration
   * @returns Tracer instance
   */
  public static createTracer(config: ObservabilityConfig): Tracer {
    // Determine if we're running in AWS environment
    const isAws = process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // Check if tracing is enabled
    if (!config.tracingEnabled) {
      return new LocalTracer({ ...config, serviceName: 'disabled-tracer' });
    }
    
    // Create appropriate tracer
    if (isAws && process.env.NODE_ENV !== 'test') {
      return new XRayTracer(config);
    } else {
      return new LocalTracer(config);
    }
  }
}