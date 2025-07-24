/**
 * Docker sandbox manager for AWS AgentCore
 * This implementation uses Docker to create sandboxed environments for code execution
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { ProgrammingLanguage, SandboxManager } from '../models/code';

/**
 * Docker sandbox configuration
 */
export interface DockerSandboxConfig {
  workDir?: string;
  pythonImage?: string;
  nodeImage?: string;
  rImage?: string;
  timeoutBuffer?: number;
  memoryOverhead?: number;
  networkDisabled?: boolean;
  readOnlyFilesystem?: boolean;
  securityOpts?: string[];
}

/**
 * Docker sandbox manager implementation
 */
export class DockerSandboxManager implements SandboxManager {
  private config: DockerSandboxConfig;
  private ready: boolean;
  private containerIds: Map<string, string>;
  
  constructor(config: DockerSandboxConfig = {}) {
    this.config = {
      workDir: config.workDir || os.tmpdir(),
      pythonImage: config.pythonImage || 'python:3.9-slim',
      nodeImage: config.nodeImage || 'node:16-alpine',
      rImage: config.rImage || 'r-base:latest',
      timeoutBuffer: config.timeoutBuffer || 1000,
      memoryOverhead: config.memoryOverhead || 50,
      networkDisabled: config.networkDisabled !== false,
      readOnlyFilesystem: config.readOnlyFilesystem !== false,
      securityOpts: config.securityOpts || ['no-new-privileges'],
    };
    this.ready = false;
    this.containerIds = new Map();
    
    logger.info('Docker sandbox manager initialized', {
      workDir: this.config.workDir,
      pythonImage: this.config.pythonImage,
      nodeImage: this.config.nodeImage,
      rImage: this.config.rImage,
      networkDisabled: this.config.networkDisabled,
      readOnlyFilesystem: this.config.readOnlyFilesystem,
    });
  }
  
  /**
   * Initialize the sandbox
   */
  async initialize(): Promise<void> {
    try {
      // Check if Docker is installed and running
      await this.runCommand('docker', ['info']);
      
      // Pull the Docker images
      await this.pullImage(this.config.pythonImage!);
      await this.pullImage(this.config.nodeImage!);
      await this.pullImage(this.config.rImage!);
      
      this.ready = true;
      logger.info('Docker sandbox initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Docker sandbox', { error });
      throw new Error(`Failed to initialize Docker sandbox: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Execute code in the sandbox
   * @param code The code to execute
   * @param language The programming language
   * @param options Execution options
   */
  async executeCode(
    code: string, 
    language: ProgrammingLanguage, 
    options: {
      timeout?: number;
      maxMemory?: number;
      context?: Record<string, any>;
    } = {}
  ): Promise<{
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage: number;
  }> {
    if (!this.ready) {
      throw new Error('Docker sandbox is not initialized');
    }
    
    const startTime = Date.now();
    const executionId = uuidv4();
    const timeout = options.timeout || 30000;
    const maxMemory = options.maxMemory || 512;
    
    try {
      // Create a temporary directory for the code
      const tempDir = path.join(this.config.workDir!, `agentcore-${executionId}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Write the code to a file
      const codeFile = this.getCodeFilename(language);
      const codeFilePath = path.join(tempDir, codeFile);
      fs.writeFileSync(codeFilePath, code);
      
      // Write context to a file if provided
      if (options.context) {
        const contextFile = 'context.json';
        const contextFilePath = path.join(tempDir, contextFile);
        fs.writeFileSync(contextFilePath, JSON.stringify(options.context));
      }
      
      // Get the Docker image for the language
      const image = this.getDockerImage(language);
      
      // Get the command to run the code
      const command = this.getExecutionCommand(language, codeFile);
      
      // Run the code in a Docker container
      const containerId = await this.runContainer(
        image,
        command,
        tempDir,
        timeout + this.config.timeoutBuffer!,
        maxMemory + this.config.memoryOverhead!
      );
      
      // Store the container ID
      this.containerIds.set(executionId, containerId);
      
      // Get the container logs
      const logs = await this.getContainerLogs(containerId);
      
      // Get container stats
      const stats = await this.getContainerStats(containerId);
      
      // Remove the container
      await this.removeContainer(containerId);
      
      // Remove the container ID from the map
      this.containerIds.delete(executionId);
      
      // Clean up the temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      const executionTime = Date.now() - startTime;
      
      return {
        output: logs.stdout,
        error: logs.stderr || undefined,
        executionTime,
        memoryUsage: stats.memoryUsage,
      };
    } catch (error) {
      logger.error('Error executing code in Docker sandbox', { error, language, executionId });
      
      // Clean up any containers that might be left
      if (this.containerIds.has(executionId)) {
        const containerId = this.containerIds.get(executionId)!;
        try {
          await this.removeContainer(containerId);
        } catch (cleanupError) {
          logger.error('Error cleaning up container', { cleanupError, containerId });
        }
        this.containerIds.delete(executionId);
      }
      
      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
      };
    }
  }
  
  /**
   * Clean up the sandbox
   */
  async cleanup(): Promise<void> {
    try {
      // Stop and remove all containers
      for (const [executionId, containerId] of this.containerIds.entries()) {
        try {
          await this.removeContainer(containerId);
          logger.debug('Removed container', { containerId });
        } catch (error) {
          logger.error('Error removing container', { error, containerId });
        }
      }
      
      this.containerIds.clear();
      this.ready = false;
      
      logger.info('Docker sandbox cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Docker sandbox', { error });
      throw error;
    }
  }
  
  /**
   * Check if the sandbox is ready
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * Run a command
   * @param command The command to run
   * @param args The command arguments
   */
  private async runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Pull a Docker image
   * @param image The image to pull
   */
  private async pullImage(image: string): Promise<void> {
    try {
      logger.debug(`Pulling Docker image: ${image}`);
      await this.runCommand('docker', ['pull', image]);
      logger.debug(`Successfully pulled Docker image: ${image}`);
    } catch (error) {
      logger.error(`Failed to pull Docker image: ${image}`, { error });
      throw error;
    }
  }
  
  /**
   * Run a Docker container
   * @param image The Docker image
   * @param command The command to run
   * @param volumePath The path to mount as a volume
   * @param timeout The timeout in milliseconds
   * @param maxMemory The maximum memory in MB
   */
  private async runContainer(
    image: string,
    command: string[],
    volumePath: string,
    timeout: number,
    maxMemory: number
  ): Promise<string> {
    try {
      // Convert timeout to seconds
      const timeoutSeconds = Math.ceil(timeout / 1000);
      
      // Build the Docker run command
      const args = [
        'run',
        '--detach',
        '--rm',
        `--memory=${maxMemory}m`,
        `--memory-swap=${maxMemory}m`,
        `--cpus=1`,
        `--timeout=${timeoutSeconds}s`,
        '--cap-drop=ALL',
      ];
      
      // Add security options
      for (const opt of this.config.securityOpts!) {
        args.push('--security-opt', opt);
      }
      
      // Disable network if configured
      if (this.config.networkDisabled) {
        args.push('--network=none');
      }
      
      // Use read-only filesystem if configured
      if (this.config.readOnlyFilesystem) {
        args.push('--read-only');
      }
      
      // Mount the volume
      args.push('-v', `${volumePath}:/workspace`);
      
      // Set the working directory
      args.push('-w', '/workspace');
      
      // Add the image
      args.push(image);
      
      // Add the command
      args.push(...command);
      
      // Run the container
      const { stdout } = await this.runCommand('docker', args);
      
      // Return the container ID
      return stdout.trim();
    } catch (error) {
      logger.error('Error running Docker container', { error, image, command });
      throw error;
    }
  }
  
  /**
   * Get the logs from a Docker container
   * @param containerId The container ID
   */
  private async getContainerLogs(containerId: string): Promise<{ stdout: string; stderr: string }> {
    try {
      // Wait for the container to finish
      await this.runCommand('docker', ['wait', containerId]);
      
      // Get the container logs
      const stdout = await this.runCommand('docker', ['logs', '--stdout', containerId]);
      const stderr = await this.runCommand('docker', ['logs', '--stderr', containerId]);
      
      return {
        stdout: stdout.stdout,
        stderr: stderr.stdout,
      };
    } catch (error) {
      logger.error('Error getting Docker container logs', { error, containerId });
      throw error;
    }
  }
  
  /**
   * Get the stats from a Docker container
   * @param containerId The container ID
   */
  private async getContainerStats(containerId: string): Promise<{ memoryUsage: number }> {
    try {
      // Get the container stats
      const { stdout } = await this.runCommand('docker', [
        'stats',
        '--no-stream',
        '--format',
        '{{.MemUsage}}',
        containerId,
      ]);
      
      // Parse the memory usage
      const memoryUsageMatch = stdout.match(/(\d+(\.\d+)?)\s*MiB/);
      const memoryUsage = memoryUsageMatch ? parseFloat(memoryUsageMatch[1]) : 0;
      
      return { memoryUsage };
    } catch (error) {
      logger.error('Error getting Docker container stats', { error, containerId });
      return { memoryUsage: 0 };
    }
  }
  
  /**
   * Remove a Docker container
   * @param containerId The container ID
   */
  private async removeContainer(containerId: string): Promise<void> {
    try {
      // Stop the container if it's still running
      await this.runCommand('docker', ['stop', '--time=0', containerId]);
      
      // Remove the container
      await this.runCommand('docker', ['rm', '--force', containerId]);
    } catch (error) {
      logger.error('Error removing Docker container', { error, containerId });
      throw error;
    }
  }
  
  /**
   * Get the Docker image for a language
   * @param language The programming language
   */
  private getDockerImage(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.PYTHON:
        return this.config.pythonImage!;
      case ProgrammingLanguage.JAVASCRIPT:
      case ProgrammingLanguage.TYPESCRIPT:
        return this.config.nodeImage!;
      case ProgrammingLanguage.R:
        return this.config.rImage!;
      case ProgrammingLanguage.SHELL:
        return 'alpine:latest';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
  
  /**
   * Get the filename for the code
   * @param language The programming language
   */
  private getCodeFilename(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.PYTHON:
        return 'code.py';
      case ProgrammingLanguage.JAVASCRIPT:
        return 'code.js';
      case ProgrammingLanguage.TYPESCRIPT:
        return 'code.ts';
      case ProgrammingLanguage.SHELL:
        return 'code.sh';
      case ProgrammingLanguage.R:
        return 'code.R';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
  
  /**
   * Get the command to execute the code
   * @param language The programming language
   * @param filename The code filename
   */
  private getExecutionCommand(language: ProgrammingLanguage, filename: string): string[] {
    switch (language) {
      case ProgrammingLanguage.PYTHON:
        return ['python', filename];
      case ProgrammingLanguage.JAVASCRIPT:
        return ['node', filename];
      case ProgrammingLanguage.TYPESCRIPT:
        return ['npx', 'ts-node', filename];
      case ProgrammingLanguage.SHELL:
        return ['sh', filename];
      case ProgrammingLanguage.R:
        return ['Rscript', filename];
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}