/**
 * Observability models for AWS AgentCore
 * Provides interfaces for logging, metrics, and tracing
 */

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  service?: string;
  requestId?: string;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  setContext(context: Record<string, any>): void;
}

/**
 * Metric data point interface
 */
export interface MetricDataPoint {
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp?: string;
  dimensions?: Record<string, string>;
}

/**
 * Metric unit enum
 */
export enum MetricUnit {
  MILLISECONDS = 'Milliseconds',
  MICROSECONDS = 'Microseconds',
  SECONDS = 'Seconds',
  COUNT = 'Count',
  BYTES = 'Bytes',
  KILOBYTES = 'Kilobytes',
  MEGABYTES = 'Megabytes',
  GIGABYTES = 'Gigabytes',
  PERCENT = 'Percent'
}

/**
 * Metrics collector interface
 */
export interface MetricsCollector {
  putMetric(name: string, value: number, unit: MetricUnit, dimensions?: Record<string, string>): void;
  flush(): Promise<void>;
}

/**
 * Trace segment interface
 */
export interface TraceSegment {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  annotations?: Record<string, string>;
  metadata?: Record<string, any>;
  subsegments?: TraceSegment[];
  error?: boolean;
  fault?: boolean;
  cause?: {
    message: string;
    stack?: string;
  };
}

/**
 * Tracer interface
 */
export interface Tracer {
  startSegment(name: string, annotations?: Record<string, string>, metadata?: Record<string, any>): TraceSegment;
  endSegment(segment: TraceSegment): void;
  addAnnotation(segment: TraceSegment, key: string, value: string): void;
  addMetadata(segment: TraceSegment, key: string, value: any): void;
  addError(segment: TraceSegment, error: Error): void;
  getCurrentSegment(): TraceSegment | undefined;
  setParentSegment(segment: TraceSegment): void;
}

/**
 * Observability configuration interface
 */
export interface ObservabilityConfig {
  logLevel?: LogLevel;
  logGroupName?: string;
  metricNamespace?: string;
  tracingEnabled?: boolean;
  serviceName?: string;
  defaultDimensions?: Record<string, string>;
}

/**
 * Observability manager interface
 */
export interface ObservabilityManager {
  getLogger(context?: string): Logger;
  getMetricsCollector(): MetricsCollector;
  getTracer(): Tracer;
  getConfig(): ObservabilityConfig;
}