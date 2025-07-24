import { RuntimeService } from '../services';
import { RuntimeConfig } from '../models';

// Mock the providers and protocol adapters
jest.mock('../services/openai-provider');
jest.mock('../services/openai-protocol');
jest.mock('../services/anthropic-provider');
jest.mock('../services/anthropic-protocol');

describe('RuntimeService', () => {
  let runtimeConfig: RuntimeConfig;
  
  beforeEach(() => {
    // Reset the config before each test
    runtimeConfig = {
      provider: 'openai',
      model: 'gpt-4',
      protocol: 'openai',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
      },
    };
  });
  
  test('should initialize with the provided configuration', () => {
    const runtimeService = new RuntimeService(runtimeConfig);
    expect(runtimeService).toBeDefined();
  });
  
  test('should return available providers', () => {
    const runtimeService = new RuntimeService(runtimeConfig);
    const providers = runtimeService.getProviders();
    expect(providers.length).toBeGreaterThan(0);
  });
  
  test('should return available protocol adapters', () => {
    const runtimeService = new RuntimeService(runtimeConfig);
    const protocols = runtimeService.getProtocolAdapters();
    expect(protocols.length).toBeGreaterThan(0);
  });
  
  test('should get a provider by name', () => {
    const runtimeService = new RuntimeService(runtimeConfig);
    const provider = runtimeService.getProvider('openai');
    expect(provider).toBeDefined();
  });
  
  test('should get a protocol adapter by name', () => {
    const runtimeService = new RuntimeService(runtimeConfig);
    const protocol = runtimeService.getProtocolAdapter('openai');
    expect(protocol).toBeDefined();
  });
});