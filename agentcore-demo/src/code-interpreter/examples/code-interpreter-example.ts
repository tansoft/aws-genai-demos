/**
 * Example of using the code interpreter
 */
import { 
  CodeExecutionRequest, 
  CodeInterpreterService, 
  ProgrammingLanguage 
} from '../';

/**
 * Run the code interpreter example
 */
async function runCodeInterpreterExample() {
  try {
    console.log('Starting code interpreter example...');
    
    // Initialize the code interpreter
    const interpreter = new CodeInterpreterService({
      supportedLanguages: [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
        ProgrammingLanguage.SHELL,
      ],
      defaultTimeout: 10000,
      defaultMaxMemory: 256,
      sandbox: {
        type: 'docker',
      },
    });
    
    // Initialize the interpreter
    console.log('Initializing code interpreter...');
    await interpreter.initialize();
    
    // Get supported languages
    const supportedLanguages = interpreter.getSupportedLanguages();
    console.log(`Supported languages: ${supportedLanguages.join(', ')}`);
    
    // Execute Python code
    console.log('\nExecuting Python code...');
    
    const pythonRequest: CodeExecutionRequest = {
      code: `
import sys
import platform
import math

print("Hello from Python!")
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")

# Simple calculation
def calculate_factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * calculate_factorial(n - 1)

for i in range(1, 6):
    print(f"Factorial of {i} is {calculate_factorial(i)}")

# Using math library
print(f"Square root of 16 is {math.sqrt(16)}")
print(f"Pi is approximately {math.pi}")
`,
      language: ProgrammingLanguage.PYTHON,
    };
    
    const pythonResponse = await interpreter.executeCode(pythonRequest);
    
    console.log('Python execution result:');
    console.log('Output:');
    console.log(pythonResponse.output);
    
    if (pythonResponse.error) {
      console.log('Error:');
      console.log(pythonResponse.error);
    }
    
    console.log(`Execution time: ${pythonResponse.executionTime}ms`);
    console.log(`Memory usage: ${pythonResponse.memoryUsage}MB`);
    
    // Execute JavaScript code
    console.log('\nExecuting JavaScript code...');
    
    const jsRequest: CodeExecutionRequest = {
      code: `
console.log("Hello from JavaScript!");
console.log(\`Node.js version: \${process.version}\`);
console.log(\`Platform: \${process.platform}\`);

// Simple calculation
function calculateFactorial(n) {
    if (n === 0 || n === 1) {
        return 1;
    } else {
        return n * calculateFactorial(n - 1);
    }
}

for (let i = 1; i <= 5; i++) {
    console.log(\`Factorial of \${i} is \${calculateFactorial(i)}\`);
}

// Using Math library
console.log(\`Square root of 16 is \${Math.sqrt(16)}\`);
console.log(\`Pi is approximately \${Math.PI}\`);
`,
      language: ProgrammingLanguage.JAVASCRIPT,
    };
    
    const jsResponse = await interpreter.executeCode(jsRequest);
    
    console.log('JavaScript execution result:');
    console.log('Output:');
    console.log(jsResponse.output);
    
    if (jsResponse.error) {
      console.log('Error:');
      console.log(jsResponse.error);
    }
    
    console.log(`Execution time: ${jsResponse.executionTime}ms`);
    console.log(`Memory usage: ${jsResponse.memoryUsage}MB`);
    
    // Execute shell script
    console.log('\nExecuting shell script...');
    
    const shellRequest: CodeExecutionRequest = {
      code: `
#!/bin/sh
echo "Hello from Shell!"
echo "Current date: $(date)"
echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la
echo "System information:"
uname -a
`,
      language: ProgrammingLanguage.SHELL,
    };
    
    const shellResponse = await interpreter.executeCode(shellRequest);
    
    console.log('Shell execution result:');
    console.log('Output:');
    console.log(shellResponse.output);
    
    if (shellResponse.error) {
      console.log('Error:');
      console.log(shellResponse.error);
    }
    
    console.log(`Execution time: ${shellResponse.executionTime}ms`);
    console.log(`Memory usage: ${shellResponse.memoryUsage}MB`);
    
    // Execute code with context
    console.log('\nExecuting code with context...');
    
    const contextRequest: CodeExecutionRequest = {
      code: `
import json
import os

# Load context if available
context = None
if os.path.exists('context.json'):
    with open('context.json', 'r') as f:
        context = json.load(f)

print("Received context:")
print(json.dumps(context, indent=2))

# Use the context data
if context and 'name' in context:
    print(f"Hello, {context['name']}!")

if context and 'numbers' in context:
    print(f"Sum of numbers: {sum(context['numbers'])}")
`,
      language: ProgrammingLanguage.PYTHON,
      context: {
        name: 'Alice',
        numbers: [1, 2, 3, 4, 5],
        settings: {
          debug: true,
          maxIterations: 100,
        },
      },
    };
    
    const contextResponse = await interpreter.executeCode(contextRequest);
    
    console.log('Context execution result:');
    console.log('Output:');
    console.log(contextResponse.output);
    
    if (contextResponse.error) {
      console.log('Error:');
      console.log(contextResponse.error);
    }
    
    // Execute code with an error
    console.log('\nExecuting code with an error...');
    
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
    
    console.log('Error execution result:');
    console.log('Output:');
    console.log(errorResponse.output);
    
    console.log('Error:');
    console.log(errorResponse.error);
    
    console.log(`Execution time: ${errorResponse.executionTime}ms`);
    console.log(`Memory usage: ${errorResponse.memoryUsage}MB`);
    
    // Execute code with a timeout
    console.log('\nExecuting code with a timeout...');
    
    const timeoutRequest: CodeExecutionRequest = {
      code: `
import time

print("Starting long-running task...")
for i in range(10):
    print(f"Iteration {i+1}")
    time.sleep(1)  # Sleep for 1 second
print("Task completed")
`,
      language: ProgrammingLanguage.PYTHON,
      timeout: 3000,  // 3 seconds timeout
    };
    
    const timeoutResponse = await interpreter.executeCode(timeoutRequest);
    
    console.log('Timeout execution result:');
    console.log('Output:');
    console.log(timeoutResponse.output);
    
    if (timeoutResponse.error) {
      console.log('Error:');
      console.log(timeoutResponse.error);
    }
    
    console.log(`Execution time: ${timeoutResponse.executionTime}ms`);
    console.log(`Memory usage: ${timeoutResponse.memoryUsage}MB`);
    
    // Clean up
    console.log('\nCleaning up code interpreter...');
    await interpreter.cleanup();
    
    console.log('\nCode interpreter example completed successfully');
  } catch (error) {
    console.error('Error in code interpreter example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runCodeInterpreterExample();
}

export default runCodeInterpreterExample;