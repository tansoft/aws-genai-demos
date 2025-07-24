/**
 * Anthropic protocol adapter for AWS AgentCore
 */
import { CompletionRequest, CompletionResponse, Message } from '../models/provider';
import { ProtocolAdapter, ProtocolAdapterConfig, ProtocolRequest, ProtocolResponse } from '../models/protocol';

/**
 * Anthropic protocol adapter configuration
 */
export interface AnthropicProtocolConfig extends ProtocolAdapterConfig {
  protocol: 'anthropic';
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

/**
 * Anthropic protocol adapter implementation
 */
export class AnthropicProtocolAdapter implements ProtocolAdapter {
  private config: AnthropicProtocolConfig;

  constructor(config: AnthropicProtocolConfig) {
    this.config = config;
  }

  getName(): string {
    return 'anthropic';
  }

  convertRequest(request: CompletionRequest): ProtocolRequest {
    const anthropicRequest: ProtocolRequest = {
      model: request.parameters?.model,
      temperature: request.parameters?.temperature ?? this.config.parameters?.temperature ?? 0.7,
      max_tokens: request.parameters?.maxTokens ?? this.config.parameters?.maxTokens ?? 1000,
      top_p: request.parameters?.topP ?? this.config.parameters?.topP ?? 1,
      stop_sequences: request.parameters?.stop ?? this.config.parameters?.stopSequences,
    };

    if (request.messages && request.messages.length > 0) {
      anthropicRequest.messages = this.formatMessages(request.messages);
    } else if (request.prompt) {
      // Convert single prompt to messages format
      anthropicRequest.messages = [
        {
          role: 'user',
          content: request.prompt,
        },
      ];
    }

    return anthropicRequest;
  }

  convertResponse(response: ProtocolResponse): CompletionResponse {
    let text = '';
    let promptTokens = 0;
    let completionTokens = 0;

    if (response.content && response.content.length > 0) {
      text = response.content.map((block: any) => block.text).join('');
    }

    if (response.usage) {
      promptTokens = response.usage.input_tokens || 0;
      completionTokens = response.usage.output_tokens || 0;
    }

    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      metadata: {
        model: response.model,
        id: response.id,
        type: response.type,
      },
    };
  }

  formatMessages(messages: Message[]): any[] {
    return messages.map(message => {
      // Map standard roles to Anthropic roles
      let role = message.role;
      if (role === 'assistant') {
        role = 'assistant';
      } else if (role === 'system') {
        role = 'system';
      } else {
        role = 'user';
      }

      const formattedMessage: any = {
        role,
        content: message.content,
      };

      // Anthropic doesn't support tool calls in the same way as OpenAI
      // For now, we'll just include the content

      return formattedMessage;
    });
  }
}