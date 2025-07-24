/**
 * Interfaces for protocol adapters in AWS AgentCore
 */
import { CompletionRequest, CompletionResponse, Message } from './provider';

/**
 * Interface for protocol adapter configuration
 */
export interface ProtocolAdapterConfig {
  protocol: string;
  parameters?: Record<string, any>;
}

/**
 * Interface for protocol-specific request
 */
export interface ProtocolRequest {
  [key: string]: any;
}

/**
 * Interface for protocol-specific response
 */
export interface ProtocolResponse {
  [key: string]: any;
}

/**
 * Interface for protocol adapter
 */
export interface ProtocolAdapter {
  /**
   * Get the name of the protocol
   */
  getName(): string;

  /**
   * Convert a generic completion request to a protocol-specific request
   * @param request The generic completion request
   */
  convertRequest(request: CompletionRequest): ProtocolRequest;

  /**
   * Convert a protocol-specific response to a generic completion response
   * @param response The protocol-specific response
   */
  convertResponse(response: ProtocolResponse): CompletionResponse;

  /**
   * Format messages for the protocol
   * @param messages The messages to format
   */
  formatMessages(messages: Message[]): any;
}