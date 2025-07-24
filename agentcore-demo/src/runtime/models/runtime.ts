/**
 * Interfaces for AWS AgentCore runtime
 */
import { CompletionRequest, CompletionResponse, ModelProvider } from './provider';
import { ProtocolAdapter } from './protocol';

/**
 * Interface for runtime configuration
 */
export interface RuntimeConfig {
  provider: string;
  model: string;
  protocol: string;
  parameters: Record<string, any>;
}

/**
 * Interface for AWS AgentCore runtime
 */
export interface AgentCoreRuntime {
  /**
   * Get the available model providers
   */
  getProviders(): ModelProvider[];

  /**
   * Get the available protocol adapters
   */
  getProtocolAdapters(): ProtocolAdapter[];

  /**
   * Get a model provider by name
   * @param name The name of the provider
   */
  getProvider(name: string): ModelProvider | undefined;

  /**
   * Get a protocol adapter by name
   * @param name The name of the protocol
   */
  getProtocolAdapter(name: string): ProtocolAdapter | undefined;

  /**
   * Complete a prompt using the configured provider and protocol
   * @param request The completion request
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Stream a completion using the configured provider and protocol
   * @param request The completion request
   * @param callback The callback for each chunk
   */
  streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void>;
}