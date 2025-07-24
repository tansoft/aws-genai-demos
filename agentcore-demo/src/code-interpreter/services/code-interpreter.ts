/**
 * Code interpreter implementation for AWS AgentCore
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { 
  CodeExecutionRequest, 
  CodeExecutionResponse, 
  CodeInterpreter, 
  ProgrammingLanguage, 
  SandboxManager 
} from '../models/code';
import { DockerSandboxManager } from './docker-sandbox';

/**
 * Code interpreter configuration
 */
export interface CodeInterpreterConfig {
  supportedLanguages?: ProgrammingLanguage[];
  defaultTimeout?: number;
  defaultMaxMemory?: number;
  sandbox?: {
    type: 'docker';
    config?: any;
  };
}

/**
 * Code interpreter implementation
 */
export class CodeInterpreterService implements CodeInterpreter {
  private config: CodeInterpreterConfig;
  private sandbox: SandboxManager;
  private supportedLanguages: Set<ProgrammingLanguage>;
  
  constructor(config: CodeInterpreterConfig = {}) {
    this.config = {
      supportedLanguages: config.supportedLanguages || [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
        ProgrammingLanguage.TYPESCRIPT,
        ProgrammingLanguage.SHELL,
      ],
      defaultTimeout: config.defaultTimeout || 30000,
      defaultMaxMemory: config.defaultMaxMemory || 512,
      sandbox: config.sandbox || {
        type: 'docker',
      },
    };
    
    // Create the sandbox manager
    if (this.config.sandbox?.type === 'docker') {
      this.sandbox = new DockerSandboxManager(this.config.sandbox.config);
    } else {
      throw new Error(`Unsupported sandbox type: ${this.config.sandbox?.type}`);
    }
    
    // Set up supported languages
    this.supportedLanguages = new Set(this.config.supportedLanguages);
    
    logger.info('Code interpreter initialized', {
      supportedLanguages: Array.from(this.supportedLanguages),
      defaultTimeout: this.config.defaultTimeout,
      defaultMaxMemory: this.config.defaultMaxMemory,
      sandboxType: this.config.sandbox?.type,
    });
  }
  
  /**
   * Initialize the code interpreter
   */
  async initialize(): Promise<void> {
    try {
      await this.sandbox.initialize();
      logger.info('Code interpreter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize code interpreter', { error });
      throw error;
    }
  }
  
  /**
   * Execute code
   * @param request The code execution request
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    try {
      logger.debug('Executing code', { request });
      
      // Generate request ID if not provided
      const requestId = request.requestId || uuidv4();
      
      // Check if the language is supported
      if (!this.isLanguageSupported(request.language)) {
        logger.error('Unsupported language', { language: request.language });
        return {
          output: '',
          error: `Unsupported language: ${request.language}`,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }
      
      // Check if the sandbox is ready
      if (!this.sandbox.isReady()) {
        logger.error('Sandbox is not ready');
        return {
          output: '',
          error: 'Sandbox is not ready',
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }
      
      // Set default timeout and memory if not provided
      const timeout = request.timeout || this.config.defaultTimeout;
      const maxMemory = request.maxMemory || this.config.defaultMaxMemory;
      
      // Execute the code in the sandbox
      const result = await this.sandbox.executeCode(request.code, request.language, {
        timeout,
        maxMemory,
        context: request.context,
      });
      
      // Return the response
      return {
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          language: request.language,
          timeout,
          maxMemory,
        },
      };
    } catch (error) {
      logger.error('Error executing code', { error });
      
      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): ProgrammingLanguage[] {
    return Array.from(this.supportedLanguages);
  }
  
  /**
   * Check if a language is supported
   * @param language The language to check
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.has(language as ProgrammingLanguage);
  }
  
  /**
   * Clean up the code interpreter
   */
  async cleanup(): Promise<void> {
    try {
      await this.sandbox.cleanup();
      logger.info('Code interpreter cleaned up');
    } catch (error) {
      logger.error('Error cleaning up code interpreter', { error });
      throw error;
    }
  }
}