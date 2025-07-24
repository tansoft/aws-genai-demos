/**
 * Observability module for AWS AgentCore
 * Provides logging, metrics, and tracing capabilities
 */

// Export models
export * from './models/observability';

// Export services
export * from './services/observability-manager';
export * from './services/cloudwatch-logger';
export * from './services/local-logger';
export * from './services/logger-factory';
export * from './services/cloudwatch-metrics';
export * from './services/local-metrics';
export * from './services/metrics-factory';
export * from './services/xray-tracer';
export * from './services/local-tracer';
export * from './services/tracer-factory';

// Export examples
export * from './examples/logging-example';
export * from './examples/metrics-example';
export * from './examples/tracing-example';
export * from './examples/integrated-example';
export * from './examples/dashboard-example';
export * from './examples/lambda-integration-example';

// Export demo
import runObservabilityDemo from './demo';
export default runObservabilityDemo;

// Export factory function
import { ObservabilityConfig, ObservabilityManager } from './models/observability';
import { ObservabilityManagerImpl } from './services/observability-manager';

/**
 * Create an observability manager
 * @param config Observability configuration
 * @returns ObservabilityManager instance
 */
export function createObservabilityManager(config: ObservabilityConfig = {}): ObservabilityManager {
  return new ObservabilityManagerImpl(config);
}