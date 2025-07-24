/**
 * Common types used across the AgentCore demos
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  runtime: RuntimeConfig;
  memory: MemoryConfig;
  identity: IdentityConfig;
  gateway?: GatewayConfig;
  tools: ToolConfig[];
  codeInterpreter: CodeInterpreterConfig;
  browser: BrowserConfig;
  observability: ObservabilityConfig;
}

export interface RuntimeConfig {
  provider: string;
  model: string;
  protocol: string;
  parameters: Record<string, any>;
}

export interface MemoryConfig {
  shortTerm: {
    enabled: boolean;
    maxMessages: number;
  };
  longTerm: {
    enabled: boolean;
    tableName: string;
  };
}

export interface IdentityConfig {
  authProvider: string;
  userPoolId?: string;
  clientId?: string;
  permissionProvider?: string;
  iam?: {
    adminRoleArn?: string;
    userRoleArn?: string;
    guestRoleArn?: string;
    lambdaRoleArn?: string;
  };
}

export interface GatewayConfig {
  providerType: string;
  lambdaFunctionName?: string;
  maxRetries?: number;
}

export interface ToolConfig {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: ToolReturn;
  function: string;
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolReturn {
  type: string;
  description: string;
}

export interface CodeInterpreterConfig {
  enabled: boolean;
  languages: string[];
  timeout: number;
  maxMemory: number;
}

export interface BrowserConfig {
  enabled: boolean;
  headless: boolean;
  timeout: number;
}

export interface ObservabilityConfig {
  logging: {
    level: string;
    destination: string;
  };
  metrics: {
    enabled: boolean;
    namespace: string;
  };
  tracing: {
    enabled: boolean;
  };
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ConversationMemory {
  conversationId: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentMemory {
  key: string;
  value: any;
  tags: string[];
  ttl?: number;
  createdAt: string;
  updatedAt: string;
}