/**
 * Runtime service implementation for AWS AgentCore
 */
import { logger } from '../../common';
import { 
  AgentCoreRuntime, 
  CompletionRequest, 
  CompletionResponse, 
  ModelProvider, 
  ProtocolAdapter, 
  RuntimeConfig 
} from '../models';
import { ProviderFactory } from './provider-factory';
import { ProtocolFactory } from './protocol-factory';

/**
 * Runtime service implementation
 */
export class RuntimeService implements AgentCoreRuntime {
  private config: RuntimeConfig;
  private providers: Map<string, ModelProvider>;
  private protocolAdapters: Map<string, ProtocolAdapter>;
  private activeProvider: ModelProvider | undefined;
  private activeProtocolAdapter: ProtocolAdapter | undefined;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.providers = new Map();
    this.protocolAdapters = new Map();

    // Initialize providers and protocol adapters
    this.initializeProviders();
    this.initializeProtocolAdapters();

    // Set active provider and protocol adapter based on config
    this.setActiveProvider(config.provider);
    this.setActiveProtocolAdapter(config.protocol);

    logger.info('Runtime service initialized', {
      provider: this.activeProvider?.getName(),
      protocol: this.activeProtocolAdapter?.getName(),
      model: config.model,
    });
  }

  private initializeProviders(): void {
    // Use the provider factory to get all available providers
    const providers = ProviderFactory.getAllProviders({
      model: this.config.model,
      protocol: this.config.protocol,
      parameters: this.config.parameters,
    });
    
    // Register all providers
    providers.forEach(provider => {
      this.registerProvider(provider);
    });
  }

  private initializeProtocolAdapters(): void {
    // Use the protocol factory to get all available protocol adapters
    const adapters = ProtocolFactory.getAllProtocolAdapters({
      protocol: this.config.protocol,
      parameters: this.config.parameters,
    });
    
    // Register all protocol adapters
    adapters.forEach(adapter => {
      this.registerProtocolAdapter(adapter);
    });
  }

  private registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.getName(), provider);
    logger.debug('Registered provider', { provider: provider.getName() });
  }

  private registerProtocolAdapter(adapter: ProtocolAdapter): void {
    this.protocolAdapters.set(adapter.getName(), adapter);
    logger.debug('Registered protocol adapter', { adapter: adapter.getName() });
  }

  private setActiveProvider(providerName: string): void {
    const provider = this.getProvider(providerName);
    if (provider) {
      this.activeProvider = provider;
      logger.debug('Set active provider', { provider: providerName });
    } else {
      throw new Error(`Provider not found: ${providerName}`);
    }
  }

  private setActiveProtocolAdapter(protocolName: string): void {
    const adapter = this.getProtocolAdapter(protocolName);
    if (adapter) {
      this.activeProtocolAdapter = adapter;
      logger.debug('Set active protocol adapter', { protocol: protocolName });
    } else {
      throw new Error(`Protocol adapter not found: ${protocolName}`);
    }
  }

  getProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  getProtocolAdapters(): ProtocolAdapter[] {
    return Array.from(this.protocolAdapters.values());
  }

  getProvider(name: string): ModelProvider | undefined {
    return this.providers.get(name);
  }

  getProtocolAdapter(name: string): ProtocolAdapter | undefined {
    return this.protocolAdapters.get(name);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    logger.debug('Runtime service completing request', { request });
    return this.activeProvider.complete(request);
  }

  async streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void> {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    logger.debug('Runtime service stream completing request', { request });
    return this.activeProvider.streamComplete(request, callback);
  }
}