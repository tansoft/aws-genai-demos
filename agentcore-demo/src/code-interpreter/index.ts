/**
 * Code interpreter module for AWS AgentCore
 * Provides sandboxed code execution capabilities
 */
import { config, logger } from '../common';
import { CodeExecutionRequest, ProgrammingLanguage } from './models/code';
import { CodeInterpreterService } from './services/code-interpreter';

// Export models and services
export * from './models/code';
export * from './services/code-interpreter';
export * from './services/docker-sandbox';
export * from './services/output-capture';

// Parse supported languages from config
const getSupportedLanguages = (): ProgrammingLanguage[] => {
  if (!config.codeInterpreter.languages || !config.codeInterpreter.languages.length) {
    return [ProgrammingLanguage.PYTHON, ProgrammingLanguage.JAVASCRIPT];
  }
  
  return config.codeInterpreter.languages
    .map(lang => lang.toLowerCase())
    .filter(lang => Object.values(ProgrammingLanguage).includes(lang as ProgrammingLanguage))
    .map(lang => lang as ProgrammingLanguage);
};

/**
 * Code interpreter demo for AWS AgentCore
 * Demonstrates sandboxed code execution capabilities
 */
export default async function codeInterpreterDemo() {
  logger.info('Starting Code Interpreter demo');
  
  try {
    // Check if code interpreter is enabled
    if (!config.codeInterpreter.enabled) {
      logger.info('Code interpreter is disabled in config');
      return;
    }
    
    // Initialize the code interpreter
    const interpreter = new CodeInterpreterService({
      supportedLanguages: getSupportedLanguages(),
      defaultTimeout: config.codeInterpreter.timeout,
      defaultMaxMemory: config.codeInterpreter.maxMemory,
      sandbox: {
        type: 'docker',
      },
    });
    
    // Initialize the interpreter
    logger.info('Initializing code interpreter...');
    await interpreter.initialize();
    
    // Get supported languages
    const supportedLanguages = interpreter.getSupportedLanguages();
    logger.info(`Supported languages: ${supportedLanguages.join(', ')}`);
    
    // Execute Python code
    if (interpreter.isLanguageSupported(ProgrammingLanguage.PYTHON)) {
      logger.info('Executing Python code...');
      
      const pythonRequest: CodeExecutionRequest = {
        code: `
import sys
import platform

print("Hello from Python!")
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")

# Simple calculation
result = 0
for i in range(1, 11):
    result += i
    
print(f"Sum of numbers from 1 to 10: {result}")
`,
        language: ProgrammingLanguage.PYTHON,
      };
      
      const pythonResponse = await interpreter.executeCode(pythonRequest);
      
      logger.info('Python execution result:', {
        output: pythonResponse.output,
        error: pythonResponse.error,
        executionTime: pythonResponse.executionTime,
        memoryUsage: pythonResponse.memoryUsage,
      });
    }
    
    // Execute JavaScript code
    if (interpreter.isLanguageSupported(ProgrammingLanguage.JAVASCRIPT)) {
      logger.info('Executing JavaScript code...');
      
      const jsRequest: CodeExecutionRequest = {
        code: `
console.log("Hello from JavaScript!");
console.log(\`Node.js version: \${process.version}\`);
console.log(\`Platform: \${process.platform}\`);

// Simple calculation
let result = 0;
for (let i = 1; i <= 10; i++) {
    result += i;
}

console.log(\`Sum of numbers from 1 to 10: \${result}\`);
`,
        language: ProgrammingLanguage.JAVASCRIPT,
      };
      
      const jsResponse = await interpreter.executeCode(jsRequest);
      
      logger.info('JavaScript execution result:', {
        output: jsResponse.output,
        error: jsResponse.error,
        executionTime: jsResponse.executionTime,
        memoryUsage: jsResponse.memoryUsage,
      });
    }
    
    // Execute code with an error
    logger.info('Executing code with an error...');
    
    const errorRequest: CodeExecutionRequest = {
      code: `
# This code will raise an error
print("Starting execution...")
print(10 / 0)  # Division by zero
print("This line will not be executed")
`,
      language: ProgrammingLanguage.PYTHON,
    };
    
    const errorResponse = await interpreter.executeCode(errorRequest);
    
    logger.info('Error execution result:', {
      output: errorResponse.output,
      error: errorResponse.error,
      executionTime: errorResponse.executionTime,
      memoryUsage: errorResponse.memoryUsage,
    });
    
    // Clean up
    logger.info('Cleaning up code interpreter...');
    await interpreter.cleanup();
    
    logger.info('Code interpreter demo completed successfully');
  } catch (error) {
    logger.error('Error in code interpreter demo', { error });
  }
}