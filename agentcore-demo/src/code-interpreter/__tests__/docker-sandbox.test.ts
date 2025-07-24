/**
 * Tests for docker sandbox
 */
import { spawn } from 'child_process';
import { DockerSandboxManager } from '../services/docker-sandbox';
import { ProgrammingLanguage } from '../models/code';

// Mock child_process
jest.mock('child_process', () => {
  return {
    spawn: jest.fn().mockImplementation(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback('mock stdout data');
            }
            return mockProcess.stdout;
          }),
        },
        stderr: {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback('mock stderr data');
            }
            return mockProcess.stderr;
          }),
        },
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
          return mockProcess;
        }),
      };
      return mockProcess;
    }),
  };
});

// Mock fs
jest.mock('fs', () => {
  return {
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    rmSync: jest.fn(),
  };
});

describe('DockerSandboxManager', () => {
  let sandbox: DockerSandboxManager;
  
  beforeEach(() => {
    sandbox = new DockerSandboxManager({
      workDir: '/tmp',
      pythonImage: 'python:test',
      nodeImage: 'node:test',
      rImage: 'r:test',
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  it('should initialize successfully', async () => {
    await sandbox.initialize();
    
    expect(spawn).toHaveBeenCalledWith('docker', ['info']);
    expect(spawn).toHaveBeenCalledWith('docker', ['pull', 'python:test']);
    expect(spawn).toHaveBeenCalledWith('docker', ['pull', 'node:test']);
    expect(spawn).toHaveBeenCalledWith('docker', ['pull', 'r:test']);
    expect(sandbox.isReady()).toBe(true);
  });
  
  it('should execute Python code', async () => {
    await sandbox.initialize();
    
    const result = await sandbox.executeCode(
      'print("Hello")',
      ProgrammingLanguage.PYTHON
    );
    
    expect(result.output).toBe('mock stdout data');
    expect(result.executionTime).toBeGreaterThan(0);
  });
  
  it('should execute JavaScript code', async () => {
    await sandbox.initialize();
    
    const result = await sandbox.executeCode(
      'console.log("Hello")',
      ProgrammingLanguage.JAVASCRIPT
    );
    
    expect(result.output).toBe('mock stdout data');
    expect(result.executionTime).toBeGreaterThan(0);
  });
  
  it('should handle execution errors', async () => {
    await sandbox.initialize();
    
    // Mock spawn to simulate an error
    (spawn as jest.Mock).mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn().mockReturnThis(),
        },
        stderr: {
          on: jest.fn().mockReturnThis(),
        },
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            callback(1);
          } else if (event === 'error') {
            callback(new Error('Mock error'));
          }
          return mockProcess;
        }),
      };
      return mockProcess;
    });
    
    try {
      await sandbox.executeCode(
        'invalid code',
        ProgrammingLanguage.PYTHON
      );
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
  
  it('should clean up resources', async () => {
    await sandbox.initialize();
    
    // Mock the containerIds map
    (sandbox as any).containerIds.set('test-id', 'container-123');
    
    await sandbox.cleanup();
    
    expect(spawn).toHaveBeenCalledWith('docker', ['stop', '--time=0', 'container-123']);
    expect(spawn).toHaveBeenCalledWith('docker', ['rm', '--force', 'container-123']);
    expect(sandbox.isReady()).toBe(false);
  });
  
  it('should throw if not initialized', async () => {
    try {
      await sandbox.executeCode(
        'print("Hello")',
        ProgrammingLanguage.PYTHON
      );
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('not initialized');
    }
  });
});