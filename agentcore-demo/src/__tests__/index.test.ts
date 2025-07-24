import { config } from '../common';

describe('Project Setup', () => {
  test('Configuration is loaded correctly', () => {
    expect(config).toBeDefined();
    expect(config.id).toBeDefined();
    expect(config.name).toBeDefined();
    expect(config.runtime).toBeDefined();
    expect(config.memory).toBeDefined();
    expect(config.identity).toBeDefined();
    expect(config.codeInterpreter).toBeDefined();
    expect(config.browser).toBeDefined();
    expect(config.observability).toBeDefined();
  });
});