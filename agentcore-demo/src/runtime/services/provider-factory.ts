/**
 * Provider factory for AWS AgentCore
 */
import { logger } from '../../common';
import { ModelProvider, ModelProviderConfig } from '../models';
import { OpenAIProvider, OpenAIProviderConfig } from './openai-provider';
import { AnthropicProvider, AnthropicProviderConfig } from './anthropic-provider';

/**
 * Factory for creating model providers
 */
export class ProviderFactory {
  /**
   * Create a model provider based on the provider name
   * @param providerName The name of the provider
   * @param config The provider configuration
   */
  static createProvider(providerName: string, config: ModelProviderConfig): ModelProvider {
    logger.debug('Creating provider', { providerName, config });
    
    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config as OpenAIProviderConfig);
      case 'anthropic':
        return new AnthropicProvider(config as AnthropicProviderConfig);
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Get all available providers
   * @param config The provider configuration
   */
  static getAllProviders(config: ModelProviderConfig): ModelProvider[] {
    const providers: ModelProvider[] = [];
    
    try {
      providers.push(new OpenAIProvider({
        ...config,
        model: config.model || 'gpt-4',
      }));
    } catch (error) {
      logger.warn('Failed to initialize OpenAI provider', { error });
    }
    
    try {
      providers.push(new AnthropicProvider({
        ...config,
        model: config.model || 'claude-3-opus-20240229',
      }));
    } catch (error) {
      logger.warn('Failed to initialize Anthropic provider', { error });
    }
    
    return providers;
  }
}