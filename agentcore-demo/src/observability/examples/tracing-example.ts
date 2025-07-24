/**
 * Example demonstrating AWS AgentCore tracing capabilities
 */

import { createObservabilityManager } from '../index';

/**
 * Run the tracing example
 */
async function runTracingExample() {
  console.log('Running AWS AgentCore Tracing Example');
  
  // Create observability manager with tracing enabled
  const observability = createObservabilityManager({
    serviceName: 'tracing-example',
    tracingEnabled: true
  });
  
  // Get tracer
  const tracer = observability.getTracer();
  
  // Start a root segment
  const rootSegment = tracer.startSegment('ExampleOperation', {
    example: 'annotation',
    version: '1.0'
  });
  
  try {
    // Add metadata to the segment
    tracer.addMetadata(rootSegment, 'parameters', {
      userId: '123456',
      action: 'example'
    });
    
    // Perform first operation with subsegment
    await performFirstOperation(tracer);
    
    // Perform second operation with subsegment
    await performSecondOperation(tracer);
    
    // Simulate an error in third operation
    try {
      await performErrorOperation(tracer);
    } catch (error) {
      // The error is handled in the operation
    }
    
  } finally {
    // Always end the root segment
    tracer.endSegment(rootSegment);
  }
  
  // Clean up
  if ('dispose' in observability) {
    (observability as any).dispose();
  }
  
  console.log('Tracing example completed');
}

/**
 * Perform first operation with tracing
 * @param tracer Tracer instance
 */
async function performFirstOperation(tracer: any) {
  // Start a subsegment for this operation
  const segment = tracer.startSegment('FirstOperation');
  
  try {
    console.log('Performing first operation...');
    
    // Add annotation
    tracer.addAnnotation(segment, 'operationType', 'query');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Add result metadata
    tracer.addMetadata(segment, 'result', {
      status: 'success',
      itemsProcessed: 5
    });
    
    console.log('First operation completed');
  } catch (error) {
    // Add error to segment
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    // Always end the segment
    tracer.endSegment(segment);
  }
}

/**
 * Perform second operation with tracing
 * @param tracer Tracer instance
 */
async function performSecondOperation(tracer: any) {
  // Start a subsegment for this operation
  const segment = tracer.startSegment('SecondOperation');
  
  try {
    console.log('Performing second operation...');
    
    // Add annotation
    tracer.addAnnotation(segment, 'operationType', 'transform');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Perform nested operation
    await performNestedOperation(tracer);
    
    // Add result metadata
    tracer.addMetadata(segment, 'result', {
      status: 'success',
      transformsApplied: 3
    });
    
    console.log('Second operation completed');
  } catch (error) {
    // Add error to segment
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    // Always end the segment
    tracer.endSegment(segment);
  }
}

/**
 * Perform nested operation with tracing
 * @param tracer Tracer instance
 */
async function performNestedOperation(tracer: any) {
  // Start a subsegment for this operation
  const segment = tracer.startSegment('NestedOperation');
  
  try {
    console.log('Performing nested operation...');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('Nested operation completed');
  } catch (error) {
    // Add error to segment
    tracer.addError(segment, error as Error);
    throw error;
  } finally {
    // Always end the segment
    tracer.endSegment(segment);
  }
}

/**
 * Perform operation that generates an error
 * @param tracer Tracer instance
 */
async function performErrorOperation(tracer: any) {
  // Start a subsegment for this operation
  const segment = tracer.startSegment('ErrorOperation');
  
  try {
    console.log('Performing operation that will fail...');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 75));
    
    // Throw an error
    throw new Error('Simulated error in operation');
  } catch (error) {
    // Add error to segment
    tracer.addError(segment, error as Error);
    console.error('Error operation failed:', (error as Error).message);
    
    // Re-throw the error
    throw error;
  } finally {
    // Always end the segment
    tracer.endSegment(segment);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runTracingExample()
    .then(() => console.log('Example finished successfully'))
    .catch(err => console.error('Example failed:', err));
}

export { runTracingExample };