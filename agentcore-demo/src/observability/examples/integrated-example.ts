/**
 * Example demonstrating integrated AWS AgentCore observability capabilities
 * This example shows how to use logging, metrics, and tracing together
 */

import { createObservabilityManager, LogLevel, MetricUnit } from '../index';

/**
 * Run the integrated observability example
 */
async function runIntegratedExample() {
  console.log('Running AWS AgentCore Integrated Observability Example');
  
  // Create observability manager with all features enabled
  const observability = createObservabilityManager({
    logLevel: LogLevel.INFO,
    logGroupName: 'aws-agentcore-example',
    metricNamespace: 'AWS/AgentCore/Examples',
    serviceName: 'integrated-example',
    tracingEnabled: true,
    defaultDimensions: {
      Environment: 'development',
      Service: 'ExampleService'
    }
  });
  
  // Get components
  const logger = observability.getLogger();
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a root trace segment for the entire operation
  const rootSegment = tracer.startSegment('ProcessRequest', {
    requestType: 'example'
  });
  
  try {
    // Set common context for logging
    logger.setContext({
      requestId: 'req-789',
      traceId: rootSegment.id
    });
    
    logger.info('Starting request processing');
    
    // Record request received metric
    metrics.putMetric('RequestReceived', 1, MetricUnit.COUNT);
    
    // Process the request with observability
    await processRequest(observability);
    
    // Record successful completion
    metrics.putMetric('RequestSucceeded', 1, MetricUnit.COUNT);
    logger.info('Request processing completed successfully');
    
  } catch (error) {
    // Record failure metric
    metrics.putMetric('RequestFailed', 1, MetricUnit.COUNT);
    
    // Log the error
    logger.error('Request processing failed', error as Error);
    
    // Add error to trace
    tracer.addError(rootSegment, error as Error);
    
    throw error;
  } finally {
    // End the root segment
    tracer.endSegment(rootSegment);
    
    // Flush metrics
    await metrics.flush();
    
    // Clean up
    if ('dispose' in observability) {
      (observability as any).dispose();
    }
  }
  
  console.log('Integrated example completed');
}

/**
 * Process a request with full observability
 * @param observability ObservabilityManager instance
 */
async function processRequest(observability: any) {
  const logger = observability.getLogger('processor');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('ProcessData');
  
  try {
    logger.info('Processing data');
    
    // Record start time for metrics
    const startTime = Date.now();
    
    // First step: validate
    await validateData(observability);
    
    // Second step: transform
    await transformData(observability);
    
    // Third step: store
    await storeData(observability);
    
    // Calculate and record processing time
    const duration = Date.now() - startTime;
    metrics.putMetric('ProcessingTime', duration, MetricUnit.MILLISECONDS);
    
    logger.info('Data processing completed', { durationMs: duration });
    
  } catch (error) {
    logger.error('Data processing failed', error as Error);
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    tracer.endSegment(segment);
  }
}

/**
 * Validate data with observability
 * @param observability ObservabilityManager instance
 */
async function validateData(observability: any) {
  const logger = observability.getLogger('validator');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('ValidateData');
  
  try {
    logger.debug('Validating data');
    
    // Simulate validation work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Record validation metric
    metrics.putMetric('DataValidated', 1, MetricUnit.COUNT);
    
    logger.debug('Data validation successful');
    
  } catch (error) {
    logger.error('Data validation failed', error as Error);
    metrics.putMetric('ValidationErrors', 1, MetricUnit.COUNT);
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    tracer.endSegment(segment);
  }
}

/**
 * Transform data with observability
 * @param observability ObservabilityManager instance
 */
async function transformData(observability: any) {
  const logger = observability.getLogger('transformer');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('TransformData');
  
  try {
    logger.debug('Transforming data');
    
    // Simulate transformation work
    await new Promise(resolve => setTimeout(resolve, 75));
    
    // Record transformation metrics
    metrics.putMetric('DataTransformed', 1, MetricUnit.COUNT);
    metrics.putMetric('TransformationSize', 1024, MetricUnit.BYTES);
    
    logger.debug('Data transformation successful');
    
  } catch (error) {
    logger.error('Data transformation failed', error as Error);
    metrics.putMetric('TransformationErrors', 1, MetricUnit.COUNT);
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    tracer.endSegment(segment);
  }
}

/**
 * Store data with observability
 * @param observability ObservabilityManager instance
 */
async function storeData(observability: any) {
  const logger = observability.getLogger('storage');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('StoreData');
  
  try {
    logger.debug('Storing data');
    
    // Simulate storage work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Record storage metrics
    metrics.putMetric('DataStored', 1, MetricUnit.COUNT);
    metrics.putMetric('StorageSize', 2048, MetricUnit.BYTES);
    
    logger.debug('Data storage successful');
    
  } catch (error) {
    logger.error('Data storage failed', error as Error);
    metrics.putMetric('StorageErrors', 1, MetricUnit.COUNT);
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    tracer.endSegment(segment);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runIntegratedExample()
    .then(() => console.log('Example finished successfully'))
    .catch(err => console.error('Example failed:', err));
}

export { runIntegratedExample };