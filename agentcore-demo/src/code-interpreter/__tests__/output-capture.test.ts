/**
 * Tests for output capture
 */
import { InMemoryOutputCapture, StreamOutputCapture } from '../services/output-capture';

describe('InMemoryOutputCapture', () => {
  let capture: InMemoryOutputCapture;
  
  beforeEach(() => {
    capture = new InMemoryOutputCapture();
  });
  
  it('should start with empty output', () => {
    expect(capture.getOutput()).toBe('');
  });
  
  it('should capture output', () => {
    capture.startCapture();
    capture.appendOutput('Hello');
    capture.appendOutput(' World');
    
    expect(capture.getOutput()).toBe('Hello World');
  });
  
  it('should stop capturing output', () => {
    capture.startCapture();
    capture.appendOutput('Hello');
    
    const output = capture.stopCapture();
    
    expect(output).toBe('Hello');
    
    // Should not capture after stopping
    capture.appendOutput(' World');
    expect(capture.getOutput()).toBe('Hello');
  });
  
  it('should clear output', () => {
    capture.startCapture();
    capture.appendOutput('Hello');
    capture.clearOutput();
    
    expect(capture.getOutput()).toBe('');
  });
});

describe('StreamOutputCapture', () => {
  let capture: StreamOutputCapture;
  let originalStdoutWrite: any;
  let originalStderrWrite: any;
  
  beforeEach(() => {
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    
    // Mock stdout and stderr
    process.stdout.write = jest.fn().mockReturnValue(true);
    process.stderr.write = jest.fn().mockReturnValue(true);
    
    capture = new StreamOutputCapture();
  });
  
  afterEach(() => {
    // Restore stdout and stderr
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });
  
  it('should start with empty output', () => {
    expect(capture.getOutput()).toBe('');
  });
  
  it('should capture stdout', () => {
    capture.startCapture();
    
    process.stdout.write('Hello');
    process.stdout.write(' World');
    
    expect(capture.getOutput()).toBe('Hello World');
  });
  
  it('should capture stderr', () => {
    capture.startCapture();
    
    process.stderr.write('Error');
    
    expect(capture.getOutput()).toBe('Error');
  });
  
  it('should stop capturing output', () => {
    capture.startCapture();
    process.stdout.write('Hello');
    
    const output = capture.stopCapture();
    
    expect(output).toBe('Hello');
    
    // Should not capture after stopping
    process.stdout.write(' World');
    expect(capture.getOutput()).toBe('Hello');
    
    // Original functions should be restored
    expect(process.stdout.write).toBe(originalStdoutWrite);
    expect(process.stderr.write).toBe(originalStderrWrite);
  });
  
  it('should clear output', () => {
    capture.startCapture();
    process.stdout.write('Hello');
    capture.clearOutput();
    
    expect(capture.getOutput()).toBe('');
  });
});