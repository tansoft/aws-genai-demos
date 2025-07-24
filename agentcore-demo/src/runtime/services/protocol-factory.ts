/**
 * Protocol factory for AWS AgentCore
 */
import { logger } from '../../common';
import { ProtocolAdapter, ProtocolAdapterConfig } from '../models';
import { OpenAIProtocolAdapter, OpenAIProtocolConfig } from './openai-protocol';
import { AnthropicProtocolAdapter, AnthropicProtocolConfig } from './anthropic-protocol';

/**
 * Factory for creating protocol adapters
 */
export class ProtocolFactory {
  /**
   * Create a protocol adapter based on the protocol name
   * @param protocolName The name of the protocol
   * @param config The protocol configuration
   */
  static createProtocolAdapter(protocolName: string, config: ProtocolAdapterConfig): ProtocolAdapter {
    logger.debug('Creating protocol adapter', { protocolName, config });
    
    switch (protocolName.toLowerCase()) {
      case 'openai':
        return new OpenAIProtocolAdapter(config as OpenAIProtocolConfig);
      case 'anthropic':
        return new AnthropicProtocolAdapter(config as AnthropicProtocolConfig);
      default:
        throw new Error(`Unsupported protocol: ${protocolName}`);
    }
  }

  /**
   * Get all available protocol adapters
   * @param config The protocol configuration
   */
  static getAllProtocolAdapters(config: ProtocolAdapterConfig): ProtocolAdapter[] {
    const adapters: ProtocolAdapter[] = [];
    
    try {
      adapters.push(new OpenAIProtocolAdapter({
        protocol: 'openai',
        parameters: config.parameters,
      }));
    } catch (error) {
      logger.warn('Failed to initialize OpenAI protocol adapter', { error });
    }
    
    try {
      adapters.push(new AnthropicProtocolAdapter({
        protocol: 'anthropic',
        parameters: config.parameters,
      }));
    } catch (error) {
      logger.warn('Failed to initialize Anthropic protocol adapter', { error });
    }
    
    return adapters;
  }
}