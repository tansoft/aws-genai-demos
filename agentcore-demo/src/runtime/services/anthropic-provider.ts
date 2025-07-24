/**
 * Anthropic provider implementation for AWS AgentCore
 */
import { Anthropic } from '@anthropic-ai/sdk';
import { CompletionRequest, CompletionResponse, ModelProvider, ModelProviderConfig } from '../models/provider';
import { AnthropicProtocolAdapter } from './anthropic-protocol';
import { logger } from '../../common';

/**
 * Anthropic provider configuration
 */
export interface AnthropicProviderConfig extends ModelProviderConfig {
  apiKey?: string;
  baseURL?: string;
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements ModelProvider {
  private client: Anthropic;
  private config: AnthropicProviderConfig;
  private protocolAdapter: AnthropicProtocolAdapter;

  constructor(config: AnthropicProviderConfig) {
    this.config = config;
    
    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      baseURL: config.baseURL,
    });

    // Initialize protocol adapter
    this.protocolAdapter = new AnthropicProtocolAdapter({
      protocol: 'anthropic',
      parameters: config.parameters,
    });
  }

  getName(): string {
    return 'anthropic';
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  getSupportedProtocols(): string[] {
    return ['anthropic'];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      logger.debug('Anthropic provider completing request', { request });
      
      const anthropicRequest = this.protocolAdapter.convertRequest(request);
      
      // Use messages API
      const response = await this.client.messages.create({
        model: anthropicRequest.model || this.config.model,
        messages: anthropicRequest.messages,
        max_tokens: anthropicRequest.max_tokens,
        temperature: anthropicRequest.temperature,
        top_p: anthropicRequest.top_p,
        stop_sequences: anthropicRequest.stop_sequences,
      });

      logger.debug('Anthropic provider received response', { response });
      return this.protocolAdapter.convertResponse(response as any);
    } catch (error) {
      logger.error('Error in Anthropic provider complete', { error });
      throw error;
    }
  }

  async streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void> {
    try {
      logger.debug('Anthropic provider stream completing request', { request });
      
      const anthropicRequest = this.protocolAdapter.convertRequest(request);
      
      // Use messages API with streaming
      const stream = await this.client.messages.create({
        model: anthropicRequest.model || this.config.model,
        messages: anthropicRequest.messages,
        max_tokens: anthropicRequest.max_tokens,
        temperature: anthropicRequest.temperature,
        top_p: anthropicRequest.top_p,
        stop_sequences: anthropicRequest.stop_sequences,
        stream: true,
      });

      let accumulatedText = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const part of stream) {
        try {
          let content = '';
          
          if (part.type === 'content_block_delta' && part.delta?.text) {
            content = part.delta.text;
          }

          accumulatedText += content;
          completionTokens += content.length / 4; // Rough estimate

          const chunk: CompletionResponse = {
            text: content,
            usage: {
              promptTokens,
              completionTokens: Math.ceil(completionTokens),
              totalTokens: promptTokens + Math.ceil(completionTokens),
            },
            metadata: {
              model: anthropicRequest.model || this.config.model,
              id: part.message_id,
            },
          };

          callback(chunk);
        } catch (error) {
          logger.error('Error processing stream chunk', { error });
          callback(null, error as Error);
        }
      }

      // Send final null chunk to indicate completion
      callback(null);
    } catch (error) {
      logger.error('Error in Anthropic provider streamComplete', { error });
      callback(null, error as Error);
    }
  }
}