/**
 * Example of error handling and output capture in the code interpreter
 */
import { 
  CodeExecutionRequest, 
  CodeInterpreterService, 
  ProgrammingLanguage,
  StreamOutputCapture
} from '../';

/**
 * Run the error handling example
 */
async function runErrorHandlingExample() {
  try {
    console.log('Starting error handling example...');
    
    // Initialize the code interpreter
    const interpreter = new CodeInterpreterService({
      supportedLanguages: [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
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
    
    // Create an output capture
    const outputCapture = new StreamOutputCapture();
    
    // Start capturing output
    outputCapture.startCapture();
    
    console.log('Starting output capture...');
    
    // Execute code with syntax error
    console.log('\nExecuting code with syntax error...');
    
    const syntaxErrorRequest: CodeExecutionRequest = {
      code: `
# This code has a syntax error
print("Starting execution...")
if True
    print("This line has a syntax error")
print("This line will not be executed")
`,
      language: ProgrammingLanguage.PYTHON,
    };
    
    const syntaxErrorResponse = await interpreter.executeCode(syntaxErrorRequest);
    
    console.log('Syntax error execution result:');
    console.log('Output:');
    console.log(syntaxErrorResponse.output);
    
    console.log('Error:');
    console.log(syntaxErrorResponse.error);
    
    // Execute code with runtime error
    console.log('\nExecuting code with runtime error...');
    
    const runtimeErrorRequest: CodeExecutionRequest = {
      code: `
// This code has a runtime error
console.log("Starting execution...");
const arr = [1, 2, 3];
console.log(arr[10].toString());  // Index out of bounds
console.log("This line will not be executed");
`,
      language: ProgrammingLanguage.JAVASCRIPT,
    };
    
    const runtimeErrorResponse = await interpreter.executeCode(runtimeErrorRequest);
    
    console.log('Runtime error execution result:');
    console.log('Output:');
    console.log(runtimeErrorResponse.output);
    
    console.log('Error:');
    console.log(runtimeErrorResponse.error);
    
    // Execute code with memory limit exceeded
    console.log('\nExecuting code with memory limit exceeded...');
    
    const memoryErrorRequest: CodeExecutionRequest = {
      code: `
# This code will try to allocate too much memory
print("Starting execution...")
data = []
for i in range(1000000):
    data.append("x" * 1000)  # Allocate a lot of memory
    if i % 10000 == 0:
        print(f"Allocated {i * 1000} bytes")
print("This line will not be executed")
`,
      language: ProgrammingLanguage.PYTHON,
      maxMemory: 10,  // Only 10MB of memory
    };
    
    const memoryErrorResponse = await interpreter.executeCode(memoryErrorRequest);
    
    console.log('Memory error execution result:');
    console.log('Output:');
    console.log(memoryErrorResponse.output);
    
    console.log('Error:');
    console.log(memoryErrorResponse.error);
    
    // Execute code with timeout
    console.log('\nExecuting code with timeout...');
    
    const timeoutRequest: CodeExecutionRequest = {
      code: `
# This code will timeout
print("Starting execution...")
import time
for i in range(100):
    print(f"Iteration {i+1}")
    time.sleep(1)  # Sleep for 1 second
print("This line will not be executed")
`,
      language: ProgrammingLanguage.PYTHON,
      timeout: 3000,  // 3 seconds timeout
    };
    
    const timeoutResponse = await interpreter.executeCode(timeoutRequest);
    
    console.log('Timeout execution result:');
    console.log('Output:');
    console.log(timeoutResponse.output);
    
    console.log('Error:');
    console.log(timeoutResponse.error);
    
    // Execute code with security violation attempt
    console.log('\nExecuting code with security violation attempt...');
    
    const securityViolationRequest: CodeExecutionRequest = {
      code: `
# This code will try to access the file system outside the sandbox
print("Starting execution...")
import os
print("Current directory:", os.getcwd())
print("Files in current directory:", os.listdir())
print("Trying to access /etc/passwd...")
try:
    with open("/etc/passwd", "r") as f:
        print(f.read())
except Exception as e:
    print(f"Error: {e}")
print("Execution completed")
`,
      language: ProgrammingLanguage.PYTHON,
    };
    
    const securityViolationResponse = await interpreter.executeCode(securityViolationRequest);
    
    console.log('Security violation execution result:');
    console.log('Output:');
    console.log(securityViolationResponse.output);
    
    console.log('Error:');
    console.log(securityViolationResponse.error);
    
    // Execute code with network access attempt
    console.log('\nExecuting code with network access attempt...');
    
    const networkAccessRequest: CodeExecutionRequest = {
      code: `
# This code will try to access the network
print("Starting execution...")
import urllib.request
try:
    print("Trying to access google.com...")
    response = urllib.request.urlopen("http://www.google.com")
    print(f"Response status: {response.status}")
except Exception as e:
    print(f"Error: {e}")
print("Execution completed")
`,
      language: ProgrammingLanguage.PYTHON,
    };
    
    const networkAccessResponse = await interpreter.executeCode(networkAccessRequest);
    
    console.log('Network access execution result:');
    console.log('Output:');
    console.log(networkAccessResponse.output);
    
    console.log('Error:');
    console.log(networkAccessResponse.error);
    
    // Stop capturing output
    const capturedOutput = outputCapture.stopCapture();
    
    console.log('\nAll captured output:');
    console.log('-------------------');
    console.log(capturedOutput);
    console.log('-------------------');
    
    // Clean up
    console.log('\nCleaning up code interpreter...');
    await interpreter.cleanup();
    
    console.log('\nError handling example completed successfully');
  } catch (error) {
    console.error('Error in error handling example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runErrorHandlingExample();
}

export default runErrorHandlingExample;