/**
 * Example demonstrating AWS AgentCore observability integration with Lambda
 * This example shows how to set up observability in a Lambda function
 */

import { createObservabilityManager, LogLevel, MetricUnit } from '../index';
import * as AWSXRay from 'aws-xray-sdk';

// Wrap AWS SDK with X-Ray
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

/**
 * Example Lambda handler with observability integration
 * @param event Lambda event
 * @param context Lambda context
 * @returns Lambda response
 */
export async function handler(event: any, context: any) {
  // Create observability manager
  const observability = createObservabilityManager({
    logLevel: LogLevel.INFO,
    logGroupName: process.env.LOG_GROUP_NAME,
    metricNamespace: process.env.METRIC_NAMESPACE || 'AWS/AgentCore',
    serviceName: process.env.SERVICE_NAME || 'lambda-example',
    tracingEnabled: true,
    defaultDimensions: {
      Environment: process.env.ENVIRONMENT || 'dev',
      Service: process.env.SERVICE_NAME || 'lambda-example',
      FunctionName: context.functionName
    }
  });
  
  // Get components
  const logger = observability.getLogger();
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Set common context for logging
  logger.setContext({
    requestId: context.awsRequestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion
  });
  
  // Start request processing
  logger.info('Lambda invocation started', { event });
  metrics.putMetric('Invocations', 1, MetricUnit.COUNT);
  
  try {
    // Process the request
    const startTime = Date.now();
    
    // Get the current X-Ray segment
    const segment = AWSXRay.getSegment();
    if (segment) {
      // Add annotations to the segment
      segment.addAnnotation('eventSource', event.source || 'unknown');
      segment.addAnnotation('eventType', event.type || 'unknown');
    }
    
    // Process the request based on the event type
    let result;
    if (event.type === 'query') {
      result = await handleQuery(event, observability);
    } else if (event.type === 'command') {
      result = await handleCommand(event, observability);
    } else {
      result = await handleDefault(event, observability);
    }
    
    // Record processing time
    const duration = Date.now() - startTime;
    metrics.putMetric('ProcessingTime', duration, MetricUnit.MILLISECONDS);
    
    // Log success
    logger.info('Lambda invocation completed successfully', { 
      durationMs: duration,
      result
    });
    
    // Return result
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    // Record error
    metrics.putMetric('Errors', 1, MetricUnit.COUNT);
    
    // Log error
    logger.error('Lambda invocation failed', error as Error, {
      errorName: (error as Error).name,
      stackTrace: (error as Error).stack
    });
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        requestId: context.awsRequestId
      })
    };
    
  } finally {
    // Flush metrics before Lambda freezes
    try {
      await metrics.flush();
    } catch (error) {
      logger.error('Failed to flush metrics', error as Error);
    }
  }
}

/**
 * Handle query event
 * @param event Event data
 * @param observability ObservabilityManager instance
 * @returns Query result
 */
async function handleQuery(event: any, observability: any) {
  const logger = observability.getLogger('query');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('HandleQuery');
  
  try {
    logger.info('Processing query', { queryParams: event.params });
    
    // Record query metric
    metrics.putMetric('QueryCount', 1, MetricUnit.COUNT, {
      QueryType: event.params?.type || 'unknown'
    });
    
    // Simulate query processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate database query using X-Ray subsegment
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const queryResult = await dynamodb.query({
      TableName: process.env.TABLE_NAME || 'ExampleTable',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': event.params?.id || 'default'
      }
    }).promise();
    
    // Record result size
    const resultSize = JSON.stringify(queryResult).length;
    metrics.putMetric('QueryResultSize', resultSize, MetricUnit.BYTES);
    
    logger.info('Query processed successfully', { 
      itemCount: queryResult.Items?.length || 0
    });
    
    return {
      success: true,
      data: queryResult.Items || [],
      count: queryResult.Count || 0
    };
    
  } catch (error) {
    // Record error
    metrics.putMetric('QueryErrors', 1, MetricUnit.COUNT);
    
    // Log error
    logger.error('Query processing failed', error as Error);
    
    // Add error to trace
    tracer.addError(segment, error as Error);
    
    throw error;
  } finally {
    // End the segment
    tracer.endSegment(segment);
  }
}

/**
 * Handle command event
 * @param event Event data
 * @param observability ObservabilityManager instance
 * @returns Command result
 */
async function handleCommand(event: any, observability: any) {
  const logger = observability.getLogger('command');
  const metrics = observability.getMetricsCollector();
  const tracer = observability.getTracer();
  
  // Start a segment for this operation
  const segment = tracer.startSegment('HandleCommand');
  
  try {
    logger.info('Processing command', { 
      commandType: event.command,
      payload: event.payload
    });
    
    // Record command metric
    metrics.putMetric('CommandCount', 1, MetricUnit.COUNT, {
      CommandType: event.command || 'unknown'
    });
    
    // Simulate command processing
    await new Promise(resolve => setTimeout(resolve, 75));
    
    // Simulate database update using X-Ray subsegment
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const updateResult = await dynamodb.update({
      TableName: process.env.TABLE_NAME || 'ExampleTable',
      Key: { id: event.payload?.id || 'default' },
      UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': event.payload?.status || 'processed',
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    logger.info('Command processed successfully');
    
    return {
      success: true,
      data: updateResult.Attributes
    };
    
  } catch (error) {
    // Record error
    metrics.putMetric('CommandErrors', 1, MetricUnit.COUNT);
    
    // Log error
    logger.error('Command processing failed', error as Error);
    
    // Add error to trace
    tracer.addError(segment, error as Error);
    
    throw error;
  } finally {
    // End the segment
    tracer.endSegment(segment);
  }
}

/**
 * Handle default event
 * @param event Event data
 * @param observability ObservabilityManager instance
 * @returns Default result
 */
async function handleDefault(event: any, observability: any) {
  const logger = observability.getLogger('default');
  const metrics = observability.getMetricsCollector();
  
  logger.info('Processing default event');
  metrics.putMetric('DefaultEventCount', 1, MetricUnit.COUNT);
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 30));
  
  return {
    success: true,
    message: 'Event processed with default handler',
    timestamp: new Date().toISOString()
  };
}