/**
 * OpenAI protocol adapter for AWS AgentCore
 */
import { CompletionRequest, CompletionResponse, Message } from '../models/provider';
import { ProtocolAdapter, ProtocolAdapterConfig, ProtocolRequest, ProtocolResponse } from '../models/protocol';

/**
 * OpenAI protocol adapter configuration
 */
export interface OpenAIProtocolConfig extends ProtocolAdapterConfig {
  protocol: 'openai';
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };
}

/**
 * OpenAI protocol adapter implementation
 */
export class OpenAIProtocolAdapter implements ProtocolAdapter {
  private config: OpenAIProtocolConfig;

  constructor(config: OpenAIProtocolConfig) {
    this.config = config;
  }

  getName(): string {
    return 'openai';
  }

  convertRequest(request: CompletionRequest): ProtocolRequest {
    const openaiRequest: ProtocolRequest = {
      model: request.parameters?.model,
      temperature: request.parameters?.temperature ?? this.config.parameters?.temperature ?? 0.7,
      max_tokens: request.parameters?.maxTokens ?? this.config.parameters?.maxTokens ?? 1000,
      top_p: request.parameters?.topP ?? this.config.parameters?.topP ?? 1,
      frequency_penalty: request.parameters?.frequencyPenalty ?? this.config.parameters?.frequencyPenalty ?? 0,
      presence_penalty: request.parameters?.presencePenalty ?? this.config.parameters?.presencePenalty ?? 0,
      stop: request.parameters?.stop ?? this.config.parameters?.stop,
    };

    if (request.messages && request.messages.length > 0) {
      openaiRequest.messages = this.formatMessages(request.messages);
    } else if (request.prompt) {
      openaiRequest.prompt = request.prompt;
    }

    return openaiRequest;
  }

  convertResponse(response: ProtocolResponse): CompletionResponse {
    let text = '';
    let promptTokens = 0;
    let completionTokens = 0;

    if (response.choices && response.choices.length > 0) {
      if (response.choices[0].message) {
        text = response.choices[0].message.content || '';
      } else if (response.choices[0].text) {
        text = response.choices[0].text || '';
      }
    }

    if (response.usage) {
      promptTokens = response.usage.prompt_tokens || 0;
      completionTokens = response.usage.completion_tokens || 0;
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
        object: response.object,
        id: response.id,
      },
    };
  }

  formatMessages(messages: Message[]): any[] {
    return messages.map(message => {
      const formattedMessage: any = {
        role: message.role,
        content: message.content,
      };

      if (message.name) {
        formattedMessage.name = message.name;
      }

      if (message.toolCalls) {
        formattedMessage.tool_calls = message.toolCalls.map(toolCall => ({
          id: toolCall.id,
          type: toolCall.type,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          },
        }));
      }

      if (message.toolCallId) {
        formattedMessage.tool_call_id = message.toolCallId;
      }

      return formattedMessage;
    });
  }
}