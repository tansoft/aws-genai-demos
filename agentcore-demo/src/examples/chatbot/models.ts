/**
 * Models for the chatbot example
 */

/**
 * Message role enum
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

/**
 * Message interface
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool result interface
 */
export interface ToolResult {
  toolCallId: string;
  result: any;
}

/**
 * Chatbot configuration interface
 */
export interface ChatbotConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  modelProvider: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  memoryEnabled?: boolean;
  toolsEnabled?: boolean;
}

/**
 * Chatbot session interface
 */
export interface ChatbotSession {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  metadata?: Record<string, any>;
}