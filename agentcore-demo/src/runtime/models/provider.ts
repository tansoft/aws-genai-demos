/**
 * Interfaces for model providers in AWS AgentCore
 */

/**
 * Base interface for model provider configuration
 */
export interface ModelProviderConfig {
  model: string;
  protocol: string;
  parameters: Record<string, any>;
}

/**
 * Interface for model completion request
 */
export interface CompletionRequest {
  prompt: string;
  messages?: Message[];
  parameters?: Record<string, any>;
}

/**
 * Interface for model completion response
 */
export interface CompletionResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: Record<string, any>;
}

/**
 * Interface for a message in a conversation
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Interface for a tool call
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Interface for model provider
 */
export interface ModelProvider {
  /**
   * Get the name of the provider
   */
  getName(): string;

  /**
   * Get the supported models
   */
  getSupportedModels(): string[];

  /**
   * Get the supported protocols
   */
  getSupportedProtocols(): string[];

  /**
   * Complete a prompt
   * @param request The completion request
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Stream a completion
   * @param request The completion request
   * @param callback The callback for each chunk
   */
  streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void>;
}