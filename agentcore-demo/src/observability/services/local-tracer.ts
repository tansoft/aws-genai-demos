/**
 * Local Tracer implementation for AWS AgentCore
 * Provides tracing capabilities for local development
 */

import { Tracer, TraceSegment, ObservabilityConfig } from '../models/observability';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local Tracer implementation
 */
export class LocalTracer implements Tracer {
  private segments: Map<string, TraceSegment> = new Map();
  private currentSegmentId?: string;
  private parentSegmentId?: string;
  private traceFilePath?: string;

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    // Set up trace file if specified
    if (process.env.LOCAL_TRACE_FILE) {
      this.traceFilePath = path.resolve(process.env.LOCAL_TRACE_FILE);
      
      // Ensure directory exists
      const traceDir = path.dirname(this.traceFilePath);
      if (!fs.existsSync(traceDir)) {
        fs.mkdirSync(traceDir, { recursive: true });
      }
    }
  }

  /**
   * Start a new segment
   * @param name Segment name
   * @param annotations Optional annotations
   * @param metadata Optional metadata
   * @returns TraceSegment
   */
  public startSegment(name: string, annotations?: Record<string, string>, metadata?: Record<string, any>): TraceSegment {
    const id = this.generateId();
    const startTime = Date.now();
    
    const segment: TraceSegment = {
      id,
      name,
      startTime,
      annotations: annotations || {},
      metadata: metadata || {},
      subsegments: []
    };
    
    // Store segment
    this.segments.set(id, segment);
    
    // Set as current segment if no current segment
    if (!this.currentSegmentId) {
      this.currentSegmentId = id;
    } else {
      // Add as subsegment to current segment
      const parentSegment = this.segments.get(this.currentSegmentId);
      if (parentSegment) {
        parentSegment.subsegments = [...(parentSegment.subsegments || []), segment];
      }
    }
    
    // Log segment start
    console.log(`[TRACE] Started segment: ${name} (${id})`);
    
    return segment;
  }

  /**
   * End a segment
   * @param segment Segment to end
   */
  public endSegment(segment: TraceSegment): void {
    const storedSegment = this.segments.get(segment.id);
    
    if (storedSegment) {
      storedSegment.endTime = Date.now();
      
      // Log segment end
      console.log(`[TRACE] Ended segment: ${storedSegment.name} (${storedSegment.id}) - Duration: ${storedSegment.endTime - storedSegment.startTime}ms`);
      
      // Write to file if it's a root segment and file path is configured
      if (this.currentSegmentId === segment.id && this.traceFilePath) {
        this.writeSegmentToFile(storedSegment);
      }
      
      // Reset current segment if it's the one being ended
      if (this.currentSegmentId === segment.id) {
        this.currentSegmentId = undefined;
      }
    }
  }

  /**
   * Add an annotation to a segment
   * @param segment Segment to annotate
   * @param key Annotation key
   * @param value Annotation value
   */
  public addAnnotation(segment: TraceSegment, key: string, value: string): void {
    const storedSegment = this.segments.get(segment.id);
    
    if (storedSegment) {
      storedSegment.annotations = { ...storedSegment.annotations, [key]: value };
      console.log(`[TRACE] Added annotation to ${storedSegment.name}: ${key}=${value}`);
    }
  }

  /**
   * Add metadata to a segment
   * @param segment Segment to add metadata to
   * @param key Metadata key
   * @param value Metadata value
   */
  public addMetadata(segment: TraceSegment, key: string, value: any): void {
    const storedSegment = this.segments.get(segment.id);
    
    if (storedSegment) {
      storedSegment.metadata = { ...storedSegment.metadata, [key]: value };
      console.log(`[TRACE] Added metadata to ${storedSegment.name}: ${key}`);
    }
  }

  /**
   * Add error information to a segment
   * @param segment Segment to add error to
   * @param error Error object
   */
  public addError(segment: TraceSegment, error: Error): void {
    const storedSegment = this.segments.get(segment.id);
    
    if (storedSegment) {
      storedSegment.error = true;
      storedSegment.cause = {
        message: error.message,
        stack: error.stack
      };
      
      console.error(`[TRACE] Error in segment ${storedSegment.name}:`, error);
    }
  }

  /**
   * Get the current segment
   * @returns Current segment or undefined
   */
  public getCurrentSegment(): TraceSegment | undefined {
    if (!this.currentSegmentId) {
      return undefined;
    }
    
    return this.segments.get(this.currentSegmentId);
  }

  /**
   * Set the parent segment
   * @param segment Parent segment
   */
  public setParentSegment(segment: TraceSegment): void {
    this.parentSegmentId = segment.id;
  }

  /**
   * Generate a unique ID
   * @returns Unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Write segment to file
   * @param segment Segment to write
   */
  private writeSegmentToFile(segment: TraceSegment): void {
    if (!this.traceFilePath) return;

    try {
      const traceLine = JSON.stringify(segment) + '\n';
      fs.appendFileSync(this.traceFilePath, traceLine);
    } catch (error) {
      console.error('Error writing trace to file:', error);
    }
  }
}