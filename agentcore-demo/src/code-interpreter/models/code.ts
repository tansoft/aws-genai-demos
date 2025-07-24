/**
 * Code interpreter models for AWS AgentCore
 */

/**
 * Supported programming languages
 */
export enum ProgrammingLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  SHELL = 'shell',
  R = 'r',
}

/**
 * Code execution request
 */
export interface CodeExecutionRequest {
  code: string;
  language: ProgrammingLanguage;
  timeout?: number;
  maxMemory?: number;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
}

/**
 * Code execution response
 */
export interface CodeExecutionResponse {
  output: string;
  error?: string;
  executionTime?: number;
  memoryUsage?: number;
  metadata?: Record<string, any>;
}

/**
 * Code interpreter interface
 */
export interface CodeInterpreter {
  /**
   * Execute code
   * @param request The code execution request
   */
  executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse>;
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): ProgrammingLanguage[];
  
  /**
   * Check if a language is supported
   * @param language The language to check
   */
  isLanguageSupported(language: string): boolean;
}

/**
 * Sandbox manager interface
 */
export interface SandboxManager {
  /**
   * Initialize the sandbox
   */
  initialize(): Promise<void>;
  
  /**
   * Execute code in the sandbox
   * @param code The code to execute
   * @param language The programming language
   * @param options Execution options
   */
  executeCode(
    code: string, 
    language: ProgrammingLanguage, 
    options?: {
      timeout?: number;
      maxMemory?: number;
      context?: Record<string, any>;
    }
  ): Promise<{
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage: number;
  }>;
  
  /**
   * Clean up the sandbox
   */
  cleanup(): Promise<void>;
  
  /**
   * Check if the sandbox is ready
   */
  isReady(): boolean;
}

/**
 * Output capture interface
 */
export interface OutputCapture {
  /**
   * Start capturing output
   */
  startCapture(): void;
  
  /**
   * Stop capturing output
   */
  stopCapture(): string;
  
  /**
   * Get the captured output
   */
  getOutput(): string;
  
  /**
   * Clear the captured output
   */
  clearOutput(): void;
}