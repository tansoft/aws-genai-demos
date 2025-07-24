/**
 * Enhanced Lambda handler for AWS AgentCore Runtime with caching and monitoring
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import * as crypto from 'crypto';
import { config, logger } from '../../common';
import { RuntimeService } from '../services';
import { CompletionRequest } from '../models';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cloudWatchClient = new CloudWatchClient({});

// Get configuration from environment variables
const enableCaching = process.env.ENABLE_CACHING === 'true';
const cacheTTL = parseInt(process.env.CACHE_TTL || '3600', 10);
const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';
const rateLimit = parseInt(process.env.RATE_LIMIT || '100', 10);
const cacheTableName = process.env.CACHE_TABLE_NAME || 'agentcore-cache';

// Initialize the runtime service
const runtimeService = new RuntimeService(config.runtime);

/**
 * Generate a hash for the request to use as a cache key
 * @param request The completion request
 */
function generateRequestHash(request: CompletionRequest): string {
  const requestString = JSON.stringify({
    prompt: request.prompt,
    messages: request.messages,
    parameters: request.parameters,
    model: config.runtime.model,
    provider: config.runtime.provider,
  });
  
  return crypto.createHash('md5').update(requestString).digest('hex');
}

/**
 * Check if a response is cached and return it if available
 * @param requestHash The hash of the request
 */
async function getFromCache(requestHash: string): Promise<any | null> {
  if (!enableCaching) {
    return null;
  }
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: cacheTableName,
      Key: { requestHash },
    }));
    
    if (result.Item) {
      // Check if the cache entry is still valid
      const now = Math.floor(Date.now() / 1000);
      if (result.Item.ttl && result.Item.ttl > now) {
        logger.info('Cache hit', { requestHash });
        return result.Item.response;
      }
    }
  } catch (error) {
    logger.error('Error getting from cache', { error });
  }
  
  return null;
}

/**
 * Store a response in the cache
 * @param requestHash The hash of the request
 * @param response The response to cache
 */
async function storeInCache(requestHash: string, response: any): Promise<void> {
  if (!enableCaching) {
    return;
  }
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + cacheTTL;
    
    await docClient.send(new PutCommand({
      TableName: cacheTableName,
      Item: {
        requestHash,
        response,
        ttl,
        createdAt: now,
      },
    }));
    
    logger.info('Stored in cache', { requestHash });
  } catch (error) {
    logger.error('Error storing in cache', { error });
  }
}

/**
 * Publish metrics to CloudWatch
 * @param metricName The name of the metric
 * @param value The value of the metric
 * @param dimensions Additional dimensions for the metric
 */
async function publishMetric(metricName: string, value: number, dimensions: Record<string, string> = {}): Promise<void> {
  try {
    const dimensionsArray = Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }));
    
    await cloudWatchClient.send(new PutMetricDataCommand({
      Namespace: 'AgentCore/Runtime',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: 'Count',
          Dimensions: dimensionsArray,
          Timestamp: new Date(),
        },
      ],
    }));
  } catch (error) {
    logger.error('Error publishing metric', { error });
  }
}

/**
 * Lambda handler for the runtime service
 * @param event API Gateway event
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Runtime Lambda invoked', { event });
    
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const request: CompletionRequest = {
      prompt: body.prompt,
      messages: body.messages,
      parameters: body.parameters,
    };
    
    // Generate a hash for the request
    const requestHash = generateRequestHash(request);
    
    // Check if the response is cached
    const cachedResponse = await getFromCache(requestHash);
    if (cachedResponse) {
      await publishMetric('CacheHit', 1);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
        body: JSON.stringify(cachedResponse),
        isBase64Encoded: false,
      };
    }
    
    await publishMetric('CacheMiss', 1);
    
    // Check if streaming is requested
    const isStreaming = body.stream === true;
    
    if (isStreaming) {
      // For streaming, we need to return a response that can be consumed by the client
      // This is a simplified example and would need to be adapted for actual streaming
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Cache': 'MISS',
        },
        body: 'Streaming not supported in this example',
        isBase64Encoded: false,
      };
    } else {
      // For non-streaming, we can just return the completion response
      const response = await runtimeService.complete(request);
      
      // Store the response in the cache
      await storeInCache(requestHash, response);
      
      // Publish metrics
      await publishMetric('Completion', 1, {
        Provider: config.runtime.provider,
        Model: config.runtime.model,
      });
      await publishMetric('TokensUsed', response.usage.totalTokens, {
        Provider: config.runtime.provider,
        Model: config.runtime.model,
      });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
        body: JSON.stringify(response),
        isBase64Encoded: false,
      };
    }
  } catch (error) {
    logger.error('Error in runtime Lambda', { error });
    
    // Publish error metric
    await publishMetric('Error', 1, {
      ErrorType: (error as Error).name || 'Unknown',
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: (error as Error).message,
      }),
      isBase64Encoded: false,
    };
  } finally {
    // Publish latency metric
    const latency = Date.now() - startTime;
    await publishMetric('Latency', latency);
    
    logger.info('Runtime Lambda completed', { latency });
  }
}