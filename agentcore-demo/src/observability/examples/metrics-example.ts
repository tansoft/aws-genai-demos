/**
 * Example demonstrating AWS AgentCore metrics capabilities
 */

import { createObservabilityManager, MetricUnit } from '../index';

/**
 * Run the metrics example
 */
async function runMetricsExample() {
  console.log('Running AWS AgentCore Metrics Example');
  
  // Create observability manager with custom configuration
  const observability = createObservabilityManager({
    metricNamespace: 'AWS/AgentCore/Examples',
    serviceName: 'metrics-example',
    defaultDimensions: {
      Environment: 'development',
      Region: 'us-west-2'
    }
  });
  
  // Get metrics collector
  const metrics = observability.getMetricsCollector();
  
  // Record simple count metrics
  metrics.putMetric('ExampleCount', 1, MetricUnit.COUNT);
  metrics.putMetric('RequestCount', 5, MetricUnit.COUNT);
  
  // Record timing metrics
  metrics.putMetric('ResponseTime', 120, MetricUnit.MILLISECONDS);
  metrics.putMetric('ProcessingTime', 50, MetricUnit.MILLISECONDS);
  
  // Record metrics with custom dimensions
  metrics.putMetric('ApiCallCount', 10, MetricUnit.COUNT, {
    ApiName: 'GetUser',
    Method: 'GET'
  });
  
  // Record size metrics
  metrics.putMetric('PayloadSize', 2048, MetricUnit.BYTES);
  metrics.putMetric('ResultSize', 512, MetricUnit.KILOBYTES);
  
  // Simulate a function call with timing
  await simulateFunctionWithTiming(metrics);
  
  // Manually flush metrics (normally this happens automatically)
  await metrics.flush();
  
  // Clean up
  if ('dispose' in observability) {
    (observability as any).dispose();
  }
  
  console.log('Metrics example completed');
}

/**
 * Simulate a function call with timing metrics
 * @param metrics Metrics collector
 */
async function simulateFunctionWithTiming(metrics: any) {
  console.log('Simulating function call with timing metrics...');
  
  // Record start time
  const startTime = Date.now();
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Record end time and calculate duration
  const duration = Date.now() - startTime;
  
  // Record the timing metric
  metrics.putMetric('FunctionDuration', duration, MetricUnit.MILLISECONDS, {
    FunctionName: 'simulateFunction'
  });
  
  console.log(`Function took ${duration}ms to execute`);
}

// Run the example if this file is executed directly
if (require.main === module) {
  runMetricsExample()
    .then(() => console.log('Example finished successfully'))
    .catch(err => console.error('Example failed:', err));
}

export { runMetricsExample };