/**
 * Output capture implementation for AWS AgentCore
 */
import { OutputCapture } from '../models/code';

/**
 * In-memory output capture implementation
 */
export class InMemoryOutputCapture implements OutputCapture {
  private output: string;
  private capturing: boolean;
  
  constructor() {
    this.output = '';
    this.capturing = false;
  }
  
  /**
   * Start capturing output
   */
  startCapture(): void {
    this.output = '';
    this.capturing = true;
  }
  
  /**
   * Stop capturing output
   */
  stopCapture(): string {
    this.capturing = false;
    return this.output;
  }
  
  /**
   * Get the captured output
   */
  getOutput(): string {
    return this.output;
  }
  
  /**
   * Clear the captured output
   */
  clearOutput(): void {
    this.output = '';
  }
  
  /**
   * Append output
   * @param text The text to append
   */
  appendOutput(text: string): void {
    if (this.capturing) {
      this.output += text;
    }
  }
}

/**
 * Stream output capture implementation
 * Captures output from stdout and stderr
 */
export class StreamOutputCapture implements OutputCapture {
  private originalStdoutWrite: any;
  private originalStderrWrite: any;
  private output: string;
  private capturing: boolean;
  
  constructor() {
    this.output = '';
    this.capturing = false;
    this.originalStdoutWrite = process.stdout.write;
    this.originalStderrWrite = process.stderr.write;
  }
  
  /**
   * Start capturing output
   */
  startCapture(): void {
    this.output = '';
    this.capturing = true;
    
    // Override stdout.write
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      // Capture the output
      if (this.capturing) {
        this.output += chunk.toString();
      }
      
      // Call the original write function
      return this.originalStdoutWrite.apply(process.stdout, [chunk, encoding, callback]);
    };
    
    // Override stderr.write
    process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
      // Capture the output
      if (this.capturing) {
        this.output += chunk.toString();
      }
      
      // Call the original write function
      return this.originalStderrWrite.apply(process.stderr, [chunk, encoding, callback]);
    };
  }
  
  /**
   * Stop capturing output
   */
  stopCapture(): string {
    this.capturing = false;
    
    // Restore original write functions
    process.stdout.write = this.originalStdoutWrite;
    process.stderr.write = this.originalStderrWrite;
    
    return this.output;
  }
  
  /**
   * Get the captured output
   */
  getOutput(): string {
    return this.output;
  }
  
  /**
   * Clear the captured output
   */
  clearOutput(): void {
    this.output = '';
  }
}