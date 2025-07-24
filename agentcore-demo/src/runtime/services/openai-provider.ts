/**
 * OpenAI provider implementation for AWS AgentCore
 */
import OpenAI from 'openai';
import { CompletionRequest, CompletionResponse, ModelProvider, ModelProviderConfig } from '../models/provider';
import { OpenAIProtocolAdapter } from './openai-protocol';
import { logger } from '../../common';

/**
 * OpenAI provider configuration
 */
export interface OpenAIProviderConfig extends ModelProviderConfig {
  apiKey?: string;
  organization?: string;
  baseURL?: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements ModelProvider {
  private client: OpenAI;
  private config: OpenAIProviderConfig;
  private protocolAdapter: OpenAIProtocolAdapter;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    
    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      organization: config.organization || process.env.OPENAI_ORGANIZATION,
      baseURL: config.baseURL,
    });

    // Initialize protocol adapter
    this.protocolAdapter = new OpenAIProtocolAdapter({
      protocol: 'openai',
      parameters: config.parameters,
    });
  }

  getName(): string {
    return 'openai';
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-1106-preview',
      'gpt-4-vision-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'text-davinci-003',
      'text-davinci-002',
    ];
  }

  getSupportedProtocols(): string[] {
    return ['openai'];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      logger.debug('OpenAI provider completing request', { request });
      
      const openaiRequest = this.protocolAdapter.convertRequest(request);
      let response;

      if (openaiRequest.messages) {
        // Use chat completion API
        response = await this.client.chat.completions.create({
          model: openaiRequest.model || this.config.model,
          messages: openaiRequest.messages,
          temperature: openaiRequest.temperature,
          max_tokens: openaiRequest.max_tokens,
          top_p: openaiRequest.top_p,
          frequency_penalty: openaiRequest.frequency_penalty,
          presence_penalty: openaiRequest.presence_penalty,
          stop: openaiRequest.stop,
        });
      } else {
        // Use completion API
        response = await this.client.completions.create({
          model: openaiRequest.model || this.config.model,
          prompt: openaiRequest.prompt,
          temperature: openaiRequest.temperature,
          max_tokens: openaiRequest.max_tokens,
          top_p: openaiRequest.top_p,
          frequency_penalty: openaiRequest.frequency_penalty,
          presence_penalty: openaiRequest.presence_penalty,
          stop: openaiRequest.stop,
        });
      }

      logger.debug('OpenAI provider received response', { response });
      return this.protocolAdapter.convertResponse(response as any);
    } catch (error) {
      logger.error('Error in OpenAI provider complete', { error });
      throw error;
    }
  }

  async streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void> {
    try {
      logger.debug('OpenAI provider stream completing request', { request });
      
      const openaiRequest = this.protocolAdapter.convertRequest(request);
      let stream;

      if (openaiRequest.messages) {
        // Use chat completion API with streaming
        stream = await this.client.chat.completions.create({
          model: openaiRequest.model || this.config.model,
          messages: openaiRequest.messages,
          temperature: openaiRequest.temperature,
          max_tokens: openaiRequest.max_tokens,
          top_p: openaiRequest.top_p,
          frequency_penalty: openaiRequest.frequency_penalty,
          presence_penalty: openaiRequest.presence_penalty,
          stop: openaiRequest.stop,
          stream: true,
        });
      } else {
        // Use completion API with streaming
        stream = await this.client.completions.create({
          model: openaiRequest.model || this.config.model,
          prompt: openaiRequest.prompt,
          temperature: openaiRequest.temperature,
          max_tokens: openaiRequest.max_tokens,
          top_p: openaiRequest.top_p,
          frequency_penalty: openaiRequest.frequency_penalty,
          presence_penalty: openaiRequest.presence_penalty,
          stop: openaiRequest.stop,
          stream: true,
        });
      }

      let accumulatedText = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const part of stream) {
        try {
          let content = '';
          
          if ('choices' in part && part.choices.length > 0) {
            if (part.choices[0].delta?.content) {
              content = part.choices[0].delta.content;
            } else if (part.choices[0].text) {
              content = part.choices[0].text;
            }
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
              model: part.model,
              object: part.object,
              id: part.id,
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
      logger.error('Error in OpenAI provider streamComplete', { error });
      callback(null, error as Error);
    }
  }
}