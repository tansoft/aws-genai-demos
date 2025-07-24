/**
 * Tests for Tracer implementations
 */

import { LocalTracer, ObservabilityConfig } from '../index';

// Mock aws-xray-sdk
jest.mock('aws-xray-sdk', () => {
  const mockSegment = {
    id: 'mock-segment-id',
    name: 'mock-segment',
    start_time: Date.now() / 1000,
    addNewSubsegment: jest.fn().mockImplementation((name) => ({
      id: `mock-subsegment-id-${name}`,
      name,
      start_time: Date.now() / 1000,
      addAnnotation: jest.fn(),
      addMetadata: jest.fn(),
      addError: jest.fn(),
      close: jest.fn()
    })),
    addAnnotation: jest.fn(),
    addMetadata: jest.fn(),
    addError: jest.fn(),
    close: jest.fn()
  };
  
  return {
    setContextMissingStrategy: jest.fn(),
    setDaemonAddress: jest.fn(),
    express: {
      openSegment: jest.fn()
    },
    Segment: jest.fn().mockImplementation(() => mockSegment)
  };
});

describe('Tracer', () => {
  describe('LocalTracer', () => {
    let tracer: LocalTracer;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create tracer
      const config: ObservabilityConfig = {
        serviceName: 'test-service',
        tracingEnabled: true
      };
      
      tracer = new LocalTracer(config);
    });

    test('should start and end segments', () => {
      // Spy on console
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Start segment
      const segment = tracer.startSegment('TestSegment', { test: 'annotation' });
      
      // Check segment
      expect(segment).toBeDefined();
      expect(segment.name).toBe('TestSegment');
      expect(segment.annotations).toEqual({ test: 'annotation' });
      
      // End segment
      tracer.endSegment(segment);
      
      // Check console output
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      // Restore
      consoleSpy.mockRestore();
    });

    test('should add annotations and metadata', () => {
      // Start segment
      const segment = tracer.startSegment('TestSegment');
      
      // Add annotation and metadata
      tracer.addAnnotation(segment, 'testKey', 'testValue');
      tracer.addMetadata(segment, 'metaKey', { value: 'metaValue' });
      
      // Check segment
      const storedSegment = (tracer as any).segments.get(segment.id);
      expect(storedSegment.annotations.testKey).toBe('testValue');
      expect(storedSegment.metadata.metaKey).toEqual({ value: 'metaValue' });
      
      // End segment
      tracer.endSegment(segment);
    });

    test('should handle errors', () => {
      // Spy on console
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Start segment
      const segment = tracer.startSegment('TestSegment');
      
      // Add error
      const error = new Error('Test error');
      tracer.addError(segment, error);
      
      // Check segment
      const storedSegment = (tracer as any).segments.get(segment.id);
      expect(storedSegment.error).toBe(true);
      expect(storedSegment.cause.message).toBe('Test error');
      
      // Check console output
      expect(consoleSpy).toHaveBeenCalled();
      
      // End segment
      tracer.endSegment(segment);
      
      // Restore
      consoleSpy.mockRestore();
    });

    test('should get current segment', () => {
      // Start segment
      const segment = tracer.startSegment('TestSegment');
      
      // Get current segment
      const currentSegment = tracer.getCurrentSegment();
      
      // Check segment
      expect(currentSegment).toBeDefined();
      expect(currentSegment!.id).toBe(segment.id);
      
      // End segment
      tracer.endSegment(segment);
    });

    test('should handle subsegments', () => {
      // Start parent segment
      const parentSegment = tracer.startSegment('ParentSegment');
      
      // Start child segment
      const childSegment = tracer.startSegment('ChildSegment');
      
      // Check parent segment
      const storedParentSegment = (tracer as any).segments.get(parentSegment.id);
      expect(storedParentSegment.subsegments).toContainEqual(
        expect.objectContaining({ name: 'ChildSegment' })
      );
      
      // End segments
      tracer.endSegment(childSegment);
      tracer.endSegment(parentSegment);
    });
  });
});