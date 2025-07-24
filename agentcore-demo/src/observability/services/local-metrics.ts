/**
 * Local Metrics implementation for AWS AgentCore
 * Provides metrics collection for local development
 */

import { MetricsCollector, MetricDataPoint, MetricUnit, ObservabilityConfig } from '../models/observability';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local Metrics implementation
 */
export class LocalMetrics implements MetricsCollector {
  private buffer: MetricDataPoint[] = [];
  private flushInterval: NodeJS.Timeout;
  private defaultDimensions: Record<string, string>;
  private metricsFilePath?: string;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    this.defaultDimensions = config.defaultDimensions || {
      Service: config.serviceName || 'aws-agentcore'
    };
    
    // Set up flush interval (every 60 seconds)
    this.flushInterval = setInterval(() => this.flush(), 60000);
    
    // Set up metrics file if specified
    if (process.env.LOCAL_METRICS_FILE) {
      this.metricsFilePath = path.resolve(process.env.LOCAL_METRICS_FILE);
      
      // Ensure directory exists
      const metricsDir = path.dirname(this.metricsFilePath);
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }
    }
  }

  /**
   * Put a metric data point
   * @param name Metric name
   * @param value Metric value
   * @param unit Metric unit
   * @param dimensions Additional dimensions
   */
  public putMetric(name: string, value: number, unit: MetricUnit, dimensions?: Record<string, string>): void {
    const timestamp = new Date();
    
    const metricDataPoint: MetricDataPoint = {
      name,
      value,
      unit,
      timestamp: timestamp.toISOString(),
      dimensions: { ...this.defaultDimensions, ...(dimensions || {}) }
    };
    
    this.buffer.push(metricDataPoint);
    
    // Log metric to console
    console.log(`[METRIC] ${name} = ${value} ${unit}`, dimensions || {});
    
    // Flush if buffer gets too large
    if (this.buffer.length >= 20) {
      this.flush();
    }
  }

  /**
   * Flush buffered metrics
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // Write to file if configured
    if (this.metricsFilePath) {
      try {
        const metrics = this.buffer.map(point => ({
          timestamp: point.timestamp,
          name: point.name,
          value: point.value,
          unit: point.unit,
          dimensions: point.dimensions
        }));
        
        const metricsData = metrics.map(m => JSON.stringify(m)).join('\n') + '\n';
        fs.appendFileSync(this.metricsFilePath, metricsData);
      } catch (error) {
        console.error('Error writing metrics to file:', error);
      }
    }

    // Clear buffer
    this.buffer = [];
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    clearInterval(this.flushInterval);
    this.flush().catch(err => console.error('Error flushing metrics during disposal:', err));
  }
}