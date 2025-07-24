/**
 * X-Ray Tracer implementation for AWS AgentCore
 * Provides distributed tracing with AWS X-Ray integration
 */

import * as AWSXRay from 'aws-xray-sdk';
import { Tracer, TraceSegment, ObservabilityConfig } from '../models/observability';

/**
 * X-Ray Tracer implementation
 */
export class XRayTracer implements Tracer {
  private currentSegment?: AWSXRay.Segment;
  private parentSegment?: AWSXRay.Segment;
  private segmentMap: Map<string, AWSXRay.Segment | AWSXRay.Subsegment> = new Map();

  /**
   * Constructor
   * @param config Observability configuration
   */
  constructor(private config: ObservabilityConfig) {
    // Configure X-Ray
    AWSXRay.setContextMissingStrategy('LOG_ERROR');
    
    if (config.serviceName) {
      AWSXRay.setDaemonAddress('127.0.0.1:2000');
      AWSXRay.express.openSegment(config.serviceName);
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
    let segment: AWSXRay.Segment | AWSXRay.Subsegment;
    
    // Create segment or subsegment
    if (this.currentSegment) {
      segment = this.currentSegment.addNewSubsegment(name);
    } else if (this.parentSegment) {
      segment = this.parentSegment.addNewSubsegment(name);
    } else {
      segment = new AWSXRay.Segment(name);
      this.currentSegment = segment as AWSXRay.Segment;
    }
    
    // Add annotations
    if (annotations) {
      Object.entries(annotations).forEach(([key, value]) => {
        segment.addAnnotation(key, value);
      });
    }
    
    // Add metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        segment.addMetadata(key, value);
      });
    }
    
    // Create trace segment
    const traceSegment: TraceSegment = {
      id: segment.id,
      name: segment.name,
      startTime: segment.start_time * 1000, // Convert to milliseconds
      annotations: annotations || {},
      metadata: metadata || {},
      subsegments: []
    };
    
    // Store segment
    this.segmentMap.set(traceSegment.id, segment);
    
    return traceSegment;
  }

  /**
   * End a segment
   * @param segment Segment to end
   */
  public endSegment(segment: TraceSegment): void {
    const xraySegment = this.segmentMap.get(segment.id);
    
    if (xraySegment) {
      xraySegment.close();
      this.segmentMap.delete(segment.id);
      
      // Reset current segment if it's the one being ended
      if (this.currentSegment && this.currentSegment.id === segment.id) {
        this.currentSegment = undefined;
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
    const xraySegment = this.segmentMap.get(segment.id);
    
    if (xraySegment) {
      xraySegment.addAnnotation(key, value);
      segment.annotations = { ...segment.annotations, [key]: value };
    }
  }

  /**
   * Add metadata to a segment
   * @param segment Segment to add metadata to
   * @param key Metadata key
   * @param value Metadata value
   */
  public addMetadata(segment: TraceSegment, key: string, value: any): void {
    const xraySegment = this.segmentMap.get(segment.id);
    
    if (xraySegment) {
      xraySegment.addMetadata(key, value);
      segment.metadata = { ...segment.metadata, [key]: value };
    }
  }

  /**
   * Add error information to a segment
   * @param segment Segment to add error to
   * @param error Error object
   */
  public addError(segment: TraceSegment, error: Error): void {
    const xraySegment = this.segmentMap.get(segment.id);
    
    if (xraySegment) {
      xraySegment.addError(error);
      
      segment.error = true;
      segment.cause = {
        message: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Get the current segment
   * @returns Current segment or undefined
   */
  public getCurrentSegment(): TraceSegment | undefined {
    if (!this.currentSegment) {
      return undefined;
    }
    
    return {
      id: this.currentSegment.id,
      name: this.currentSegment.name,
      startTime: this.currentSegment.start_time * 1000,
      annotations: {},
      metadata: {},
      subsegments: []
    };
  }

  /**
   * Set the parent segment
   * @param segment Parent segment
   */
  public setParentSegment(segment: TraceSegment): void {
    const xraySegment = this.segmentMap.get(segment.id);
    
    if (xraySegment && xraySegment instanceof AWSXRay.Segment) {
      this.parentSegment = xraySegment;
    }
  }
}