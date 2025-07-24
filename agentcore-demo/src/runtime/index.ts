import { config, logger } from '../common';
import { RuntimeService, ProviderFactory, ProtocolFactory } from './services';
import { CompletionRequest } from './models';

/**
 * Runtime demo for AWS AgentCore
 * Demonstrates the serverless runtime capabilities for different models and protocols
 */
export default async function runtimeDemo() {
  logger.info('Starting Runtime demo');
  
  try {
    // Initialize the runtime service
    const runtimeService = new RuntimeService(config.runtime);
    
    // Get available providers and protocols
    const providers = runtimeService.getProviders();
    const protocols = runtimeService.getProtocolAdapters();
    
    logger.info('Available providers', { 
      providers: providers.map(p => p.getName()),
      protocols: protocols.map(p => p.getName())
    });

    // Display supported models for each provider
    providers.forEach(provider => {
      logger.info(`Supported models for ${provider.getName()}`, {
        provider: provider.getName(),
        models: provider.getSupportedModels()
      });
    });

    // Simple completion example with OpenAI
    logger.info('Running simple completion example with OpenAI');
    const openaiConfig = { ...config.runtime, provider: 'openai', model: 'gpt-4' };
    const openaiRuntime = new RuntimeService(openaiConfig);
    
    const simpleRequest: CompletionRequest = {
      prompt: 'Explain what AWS AgentCore is in one paragraph:',
    };
    
    const simpleResponse = await openaiRuntime.complete(simpleRequest);
    logger.info('OpenAI completion result', { 
      text: simpleResponse.text,
      usage: simpleResponse.usage
    });

    // Try with Anthropic if available
    try {
      logger.info('Running simple completion example with Anthropic');
      const anthropicConfig = { ...config.runtime, provider: 'anthropic', model: 'claude-3-sonnet-20240229' };
      const anthropicRuntime = new RuntimeService(anthropicConfig);
      
      const anthropicResponse = await anthropicRuntime.complete(simpleRequest);
      logger.info('Anthropic completion result', { 
        text: anthropicResponse.text,
        usage: anthropicResponse.usage
      });
    } catch (error) {
      logger.warn('Anthropic provider not available or failed', { error });
    }

    // Chat completion example
    logger.info('Running chat completion example');
    const chatRequest: CompletionRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains AWS services concisely.'
        },
        {
          role: 'user',
          content: 'What are the key features of AWS AgentCore?'
        }
      ]
    };
    
    const chatResponse = await runtimeService.complete(chatRequest);
    logger.info('Chat completion result', { 
      text: chatResponse.text,
      usage: chatResponse.usage
    });

    // Streaming example
    logger.info('Running streaming completion example');
    const streamRequest: CompletionRequest = {
      prompt: 'List the seven key features of AWS AgentCore:',
    };
    
    let streamedText = '';
    await runtimeService.streamComplete(streamRequest, (chunk, error) => {
      if (error) {
        logger.error('Streaming error', { error });
        return;
      }
      
      if (chunk) {
        streamedText += chunk.text;
        process.stdout.write(chunk.text);
      } else {
        // End of stream
        logger.info('\nStreaming complete', { 
          totalLength: streamedText.length 
        });
      }
    });

    // Dynamic provider selection example
    logger.info('Running dynamic provider selection example');
    
    // Get provider based on name
    const providerName = process.env.DYNAMIC_PROVIDER || 'openai';
    const modelName = process.env.DYNAMIC_MODEL || 'gpt-4';
    
    const dynamicProvider = ProviderFactory.createProvider(providerName, {
      model: modelName,
      protocol: 'openai',
      parameters: {
        temperature: 0.7,
        maxTokens: 500
      }
    });
    
    logger.info('Dynamically selected provider', {
      provider: dynamicProvider.getName(),
      model: modelName
    });
    
    const dynamicRequest: CompletionRequest = {
      prompt: 'What is AWS AgentCore?',
    };
    
    // Use the provider directly
    const dynamicResponse = await dynamicProvider.complete(dynamicRequest);
    logger.info('Dynamic provider result', {
      text: dynamicResponse.text,
      usage: dynamicResponse.usage
    });

    logger.info('Runtime demo completed successfully');
  } catch (error) {
    logger.error('Error in runtime demo', { error });
  }
}