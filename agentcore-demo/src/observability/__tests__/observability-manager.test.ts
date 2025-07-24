/**
 * Tests for ObservabilityManager
 */

import { 
  createObservabilityManager, 
  ObservabilityManager, 
  LogLevel, 
  MetricUnit 
} from '../index';

describe('ObservabilityManager', () => {
  let observabilityManager: ObservabilityManager;

  beforeEach(() => {
    // Create a new instance for each test
    observabilityManager = createObservabilityManager({
      logLevel: LogLevel.DEBUG,
      serviceName: 'test-service',
      tracingEnabled: true
    });
  });

  afterEach(() => {
    // Clean up if needed
    if ('dispose' in observabilityManager) {
      (observabilityManager as any).dispose();
    }
  });

  test('should create a logger', () => {
    const logger = observabilityManager.getLogger();
    expect(logger).toBeDefined();
    
    // Test logging methods
    expect(() => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
    }).not.toThrow();
  });

  test('should create a context-specific logger', () => {
    const logger = observabilityManager.getLogger('test-context');
    expect(logger).toBeDefined();
    
    // Test logging with context
    expect(() => {
      logger.info('Info with context', { key: 'value' });
    }).not.toThrow();
  });

  test('should create a metrics collector', () => {
    const metricsCollector = observabilityManager.getMetricsCollector();
    expect(metricsCollector).toBeDefined();
    
    // Test metrics methods
    expect(() => {
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      metricsCollector.putMetric('ResponseTime', 100, MetricUnit.MILLISECONDS, {
        Operation: 'TestOperation'
      });
    }).not.toThrow();
  });

  test('should create a tracer', () => {
    const tracer = observabilityManager.getTracer();
    expect(tracer).toBeDefined();
    
    // Test tracing methods
    const segment = tracer.startSegment('TestSegment', { test: 'annotation' });
    expect(segment).toBeDefined();
    expect(segment.name).toBe('TestSegment');
    
    tracer.addMetadata(segment, 'testKey', 'testValue');
    tracer.endSegment(segment);
  });

  test('should return the configuration', () => {
    const config = observabilityManager.getConfig();
    expect(config).toBeDefined();
    expect(config.logLevel).toBe(LogLevel.DEBUG);
    expect(config.serviceName).toBe('test-service');
    expect(config.tracingEnabled).toBe(true);
  });
});