/**
 * CloudWatch Metrics implementation for AWS AgentCore
 * Provides metrics collection with CloudWatch integration
 */

import * as AWS from 'aws-sdk';
import { MetricsCollector, MetricDataPoint, MetricUnit, ObservabilityConfig } from '../models/observability';

/**
 * CloudWatch Metrics implementation
 */
export class CloudWatchMetrics implements MetricsCollector {
  private cloudwatch: AWS.CloudWatch;
  private namespace: string;
  private buffer: MetricDataPoint[] = [];
  private flushInterval: NodeJS.Timeout;
  private defaultDimensions: Record<string, string>;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    this.cloudwatch = new AWS.CloudWatch();
    this.namespace = config.metricNamespace || 'AWS/AgentCore';
    this.defaultDimensions = config.defaultDimensions || {
      Service: config.serviceName || 'aws-agentcore'
    };
    
    // Set up flush interval (every 60 seconds)
    this.flushInterval = setInterval(() => this.flush(), 60000);
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
    
    // Flush if buffer gets too large
    if (this.buffer.length >= 20) {
      this.flush();
    }
  }

  /**
   * Flush buffered metrics to CloudWatch
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const metricData = this.buffer.map(point => {
      return {
        MetricName: point.name,
        Value: point.value,
        Unit: point.unit,
        Timestamp: new Date(point.timestamp || new Date()),
        Dimensions: Object.entries(point.dimensions || {}).map(([name, value]) => ({
          Name: name,
          Value: value
        }))
      };
    });

    this.buffer = [];

    try {
      // CloudWatch allows a maximum of 20 metrics per request
      const chunks: AWS.CloudWatch.MetricDatum[][] = [];
      for (let i = 0; i < metricData.length; i += 20) {
        chunks.push(metricData.slice(i, i + 20));
      }

      await Promise.all(chunks.map(chunk => {
        return this.cloudwatch.putMetricData({
          Namespace: this.namespace,
          MetricData: chunk
        }).promise();
      }));
    } catch (error) {
      console.error('Error flushing metrics to CloudWatch:', error);
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    clearInterval(this.flushInterval);
    this.flush().catch(err => console.error('Error flushing metrics during disposal:', err));
  }
}