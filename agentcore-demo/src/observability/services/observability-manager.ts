/**
 * Observability Manager for AWS AgentCore
 * Provides centralized access to logging, metrics, and tracing
 */

import { 
  Logger, 
  MetricsCollector, 
  Tracer, 
  ObservabilityConfig, 
  ObservabilityManager 
} from '../models/observability';
import { LoggerFactory } from './logger-factory';
import { MetricsFactory } from './metrics-factory';
import { TracerFactory } from './tracer-factory';

/**
 * Observability Manager implementation
 */
export class ObservabilityManagerImpl implements ObservabilityManager {
  private config: ObservabilityConfig;
  private loggers: Map<string, Logger> = new Map();
  private metricsCollector: MetricsCollector;
  private tracer: Tracer;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(config: ObservabilityConfig) {
    this.config = {
      logLevel: config.logLevel,
      logGroupName: config.logGroupName || 'aws-agentcore-logs',
      metricNamespace: config.metricNamespace || 'AWS/AgentCore',
      tracingEnabled: config.tracingEnabled !== false,
      serviceName: config.serviceName || 'aws-agentcore',
      defaultDimensions: config.defaultDimensions || {}
    };
    
    // Create default logger
    this.loggers.set('default', LoggerFactory.createLogger(this.config));
    
    // Create metrics collector
    this.metricsCollector = MetricsFactory.createMetricsCollector(this.config);
    
    // Create tracer
    this.tracer = TracerFactory.createTracer(this.config);
  }

  /**
   * Get a logger instance
   * @param context Optional context name
   * @returns Logger instance
   */
  public getLogger(context?: string): Logger {
    const loggerKey = context || 'default';
    
    if (!this.loggers.has(loggerKey)) {
      this.loggers.set(loggerKey, LoggerFactory.createLogger(this.config, context));
    }
    
    return this.loggers.get(loggerKey)!;
  }

  /**
   * Get the metrics collector
   * @returns MetricsCollector instance
   */
  public getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Get the tracer
   * @returns Tracer instance
   */
  public getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Get the configuration
   * @returns ObservabilityConfig
   */
  public getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clean up loggers
    this.loggers.forEach(logger => {
      if ('dispose' in logger && typeof logger.dispose === 'function') {
        logger.dispose();
      }
    });
    
    // Clean up metrics collector
    if ('dispose' in this.metricsCollector && typeof this.metricsCollector.dispose === 'function') {
      this.metricsCollector.dispose();
    }
  }
}