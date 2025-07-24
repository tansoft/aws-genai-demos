import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { config, logger } from '../common';
import { RuntimeService } from './services';
import { CompletionRequest } from './models';

// Initialize the runtime service
const runtimeService = new RuntimeService(config.runtime);

/**
 * Lambda handler for the runtime service
 * @param event API Gateway event
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Runtime Lambda invoked', { event });
    
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const request: CompletionRequest = {
      prompt: body.prompt,
      messages: body.messages,
      parameters: body.parameters,
    };
    
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
        },
        body: 'Streaming not supported in this example',
        isBase64Encoded: false,
      };
    } else {
      // For non-streaming, we can just return the completion response
      const response = await runtimeService.complete(request);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
        isBase64Encoded: false,
      };
    }
  } catch (error) {
    logger.error('Error in runtime Lambda', { error });
    
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
  }
}