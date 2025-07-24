/**
 * Example of a web server using the AWS AgentCore Runtime
 */
import express from 'express';
import { config, logger } from '../../common';
import { RuntimeService } from '../services';
import { CompletionRequest } from '../models';

/**
 * Run the server example
 */
async function runServerExample() {
  // Initialize the runtime service
  const runtimeService = new RuntimeService(config.runtime);
  
  // Create Express app
  const app = express();
  app.use(express.json());
  
  // Define routes
  app.post('/complete', async (req, res) => {
    try {
      const request: CompletionRequest = {
        prompt: req.body.prompt,
        messages: req.body.messages,
        parameters: req.body.parameters,
      };
      
      logger.info('Received completion request', { request });
      
      // Check if streaming is requested
      const isStreaming = req.body.stream === true;
      
      if (isStreaming) {
        // Set up streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Stream the completion
        await runtimeService.streamComplete(request, (chunk, error) => {
          if (error) {
            logger.error('Streaming error', { error });
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            return;
          }
          
          if (chunk) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          } else {
            // End of stream
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });
      } else {
        // Non-streaming response
        const response = await runtimeService.complete(request);
        logger.info('Sending completion response', { response });
        res.json(response);
      }
    } catch (error) {
      logger.error('Error handling completion request', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        message: (error as Error).message,
      });
    }
  });
  
  // Start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}

// Run the example if this file is executed directly
if (require.main === module) {
  runServerExample();
}

export default runServerExample;