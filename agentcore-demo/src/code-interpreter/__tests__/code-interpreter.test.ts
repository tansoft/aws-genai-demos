/**
 * Tests for code interpreter
 */
import { 
  CodeExecutionRequest, 
  CodeExecutionResponse, 
  CodeInterpreterService, 
  ProgrammingLanguage 
} from '../';

// Mock the docker sandbox
jest.mock('../services/docker-sandbox', () => {
  return {
    DockerSandboxManager: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        executeCode: jest.fn().mockImplementation((code, language, options) => {
          // Mock successful execution for Python
          if (language === ProgrammingLanguage.PYTHON && code.includes('print("Hello')) {
            return Promise.resolve({
              output: 'Hello from Python!',
              executionTime: 100,
              memoryUsage: 10,
            });
          }
          
          // Mock successful execution for JavaScript
          if (language === ProgrammingLanguage.JAVASCRIPT && code.includes('console.log("Hello')) {
            return Promise.resolve({
              output: 'Hello from JavaScript!',
              executionTime: 120,
              memoryUsage: 15,
            });
          }
          
          // Mock error execution
          if (code.includes('error') || code.includes('/ 0')) {
            return Promise.resolve({
              output: 'Error occurred',
              error: 'Division by zero',
              executionTime: 50,
              memoryUsage: 5,
            });
          }
          
          // Mock timeout
          if (code.includes('timeout') || code.includes('sleep')) {
            return Promise.resolve({
              output: 'Execution timed out',
              error: 'Timed out after 30000ms',
              executionTime: 30000,
              memoryUsage: 20,
            });
          }
          
          // Default mock response
          return Promise.resolve({
            output: `Executed ${language} code`,
            executionTime: 100,
            memoryUsage: 10,
          });
        }),
        cleanup: jest.fn().mockResolvedValue(undefined),
        isReady: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

describe('CodeInterpreterService', () => {
  let interpreter: CodeInterpreterService;
  
  beforeEach(async () => {
    interpreter = new CodeInterpreterService({
      supportedLanguages: [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
      ],
    });
    
    await interpreter.initialize();
  });
  
  it('should initialize successfully', () => {
    expect(interpreter).toBeDefined();
  });
  
  it('should return supported languages', () => {
    const languages = interpreter.getSupportedLanguages();
    expect(languages).toContain(ProgrammingLanguage.PYTHON);
    expect(languages).toContain(ProgrammingLanguage.JAVASCRIPT);
    expect(languages).not.toContain(ProgrammingLanguage.R);
  });
  
  it('should check if a language is supported', () => {
    expect(interpreter.isLanguageSupported(ProgrammingLanguage.PYTHON)).toBe(true);
    expect(interpreter.isLanguageSupported(ProgrammingLanguage.JAVASCRIPT)).toBe(true);
    expect(interpreter.isLanguageSupported(ProgrammingLanguage.R)).toBe(false);
    expect(interpreter.isLanguageSupported('invalid' as ProgrammingLanguage)).toBe(false);
  });
  
  it('should execute Python code', async () => {
    const request: CodeExecutionRequest = {
      code: 'print("Hello from Python!")',
      language: ProgrammingLanguage.PYTHON,
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.output).toBe('Hello from Python!');
    expect(response.error).toBeUndefined();
    expect(response.executionTime).toBe(100);
    expect(response.memoryUsage).toBe(10);
    expect(response.metadata).toBeDefined();
    expect(response.metadata?.language).toBe(ProgrammingLanguage.PYTHON);
  });
  
  it('should execute JavaScript code', async () => {
    const request: CodeExecutionRequest = {
      code: 'console.log("Hello from JavaScript!")',
      language: ProgrammingLanguage.JAVASCRIPT,
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.output).toBe('Hello from JavaScript!');
    expect(response.error).toBeUndefined();
    expect(response.executionTime).toBe(120);
    expect(response.memoryUsage).toBe(15);
    expect(response.metadata).toBeDefined();
    expect(response.metadata?.language).toBe(ProgrammingLanguage.JAVASCRIPT);
  });
  
  it('should handle code with errors', async () => {
    const request: CodeExecutionRequest = {
      code: 'print(10 / 0)',
      language: ProgrammingLanguage.PYTHON,
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.output).toBe('Error occurred');
    expect(response.error).toBe('Division by zero');
    expect(response.executionTime).toBe(50);
    expect(response.memoryUsage).toBe(5);
  });
  
  it('should handle timeouts', async () => {
    const request: CodeExecutionRequest = {
      code: 'import time; time.sleep(60)',
      language: ProgrammingLanguage.PYTHON,
      timeout: 5000,
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.output).toBe('Execution timed out');
    expect(response.error).toBe('Timed out after 30000ms');
    expect(response.executionTime).toBe(30000);
    expect(response.memoryUsage).toBe(20);
  });
  
  it('should handle unsupported languages', async () => {
    const request: CodeExecutionRequest = {
      code: 'print("Hello")',
      language: ProgrammingLanguage.R,
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.output).toBe('');
    expect(response.error).toBe('Unsupported language: r');
  });
  
  it('should include request ID in metadata if provided', async () => {
    const request: CodeExecutionRequest = {
      code: 'print("Hello")',
      language: ProgrammingLanguage.PYTHON,
      requestId: 'test-123',
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.metadata?.requestId).toBe('test-123');
  });
  
  it('should include user ID in metadata if provided', async () => {
    const request: CodeExecutionRequest = {
      code: 'print("Hello")',
      language: ProgrammingLanguage.PYTHON,
      userId: 'user-456',
    };
    
    const response = await interpreter.executeCode(request);
    
    expect(response.metadata?.userId).toBe('user-456');
  });
});