/**
 * Tests for MetricsCollector implementations
 */

import { 
  CloudWatchMetrics, 
  LocalMetrics, 
  MetricUnit, 
  ObservabilityConfig 
} from '../index';
import * as AWS from 'aws-sdk';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockCloudWatch = {
    putMetricData: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({})
  };
  
  return {
    CloudWatch: jest.fn(() => mockCloudWatch)
  };
});

describe('MetricsCollector', () => {
  describe('CloudWatchMetrics', () => {
    let metricsCollector: CloudWatchMetrics;
    let mockCloudWatch: any;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Get mock instance
      mockCloudWatch = new AWS.CloudWatch();
      
      // Create metrics collector
      const config: ObservabilityConfig = {
        metricNamespace: 'test-namespace',
        serviceName: 'test-service',
        defaultDimensions: {
          Environment: 'test'
        }
      };
      
      metricsCollector = new CloudWatchMetrics(config);
    });
    
    afterEach(() => {
      // Clean up
      if (metricsCollector && 'dispose' in metricsCollector) {
        metricsCollector.dispose();
      }
    });

    test('should put metrics', () => {
      // Put metrics
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      metricsCollector.putMetric('ResponseTime', 100, MetricUnit.MILLISECONDS, {
        Operation: 'TestOperation'
      });
      
      // Check buffer
      expect((metricsCollector as any).buffer.length).toBe(2);
    });

    test('should flush metrics to CloudWatch', async () => {
      // Put metrics
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      
      // Flush metrics
      await metricsCollector.flush();
      
      // Check if putMetricData was called
      expect(mockCloudWatch.putMetricData).toHaveBeenCalled();
      expect(mockCloudWatch.putMetricData.mock.calls[0][0].Namespace).toBe('test-namespace');
      expect(mockCloudWatch.putMetricData.mock.calls[0][0].MetricData.length).toBe(1);
    });

    test('should handle errors when flushing metrics', async () => {
      // Mock error
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCloudWatch.promise.mockRejectedValueOnce(new Error('Test error'));
      
      // Put and flush
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      await metricsCollector.flush();
      
      // Check error handling
      expect(errorSpy).toHaveBeenCalled();
      
      // Restore
      errorSpy.mockRestore();
    });

    test('should handle large batches of metrics', async () => {
      // Put more than 20 metrics
      for (let i = 0; i < 25; i++) {
        metricsCollector.putMetric(`TestMetric${i}`, i, MetricUnit.COUNT);
      }
      
      // Flush metrics
      await metricsCollector.flush();
      
      // Check if putMetricData was called multiple times
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledTimes(2);
    });
  });

  describe('LocalMetrics', () => {
    let metricsCollector: LocalMetrics;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create metrics collector
      const config: ObservabilityConfig = {
        serviceName: 'test-service',
        defaultDimensions: {
          Environment: 'test'
        }
      };
      
      metricsCollector = new LocalMetrics(config);
    });
    
    afterEach(() => {
      // Clean up
      if (metricsCollector && 'dispose' in metricsCollector) {
        metricsCollector.dispose();
      }
    });

    test('should put metrics', () => {
      // Spy on console
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Put metrics
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      metricsCollector.putMetric('ResponseTime', 100, MetricUnit.MILLISECONDS, {
        Operation: 'TestOperation'
      });
      
      // Check console output
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      // Check buffer
      expect((metricsCollector as any).buffer.length).toBe(2);
      
      // Restore
      consoleSpy.mockRestore();
    });

    test('should flush metrics', async () => {
      // Put metrics
      metricsCollector.putMetric('TestMetric', 1, MetricUnit.COUNT);
      
      // Flush metrics
      await metricsCollector.flush();
      
      // Check buffer is cleared
      expect((metricsCollector as any).buffer.length).toBe(0);
    });
  });
});