/**
 * Chatbot service for AWS AgentCore
 * Integrates runtime, memory, and gateway features
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  RuntimeService, 
  ModelProvider, 
  ProtocolAdapter 
} from '../../runtime/models/runtime';
import { 
  ConversationManager 
} from '../../memory/services/conversation-manager';
import { 
  ToolExecutor 
} from '../../gateway/services/tool-executor';
import { 
  ObservabilityManager, 
  LogLevel, 
  MetricUnit 
} from '../../observability/models/observability';
import { 
  ChatbotConfig, 
  ChatbotSession, 
  Message, 
  MessageRole, 
  ToolCall, 
  ToolResult 
} from './models';

/**
 * Chatbot service
 */
export class ChatbotService {
  private config: ChatbotConfig;
  private runtimeService: RuntimeService;
  private conversationManager?: ConversationManager;
  private toolExecutor?: ToolExecutor;
  private observability: ObservabilityManager;
  private logger: any;
  private metrics: any;
  private tracer: any;

  /**
   * Constructor
   * @param config Chatbot configuration
   * @param runtimeService Runtime service
   * @param conversationManager Conversation manager (optional)
   * @param toolExecutor Tool executor (optional)
   * @param observability Observability manager
   */
  constructor(
    config: ChatbotConfig,
    runtimeService: RuntimeService,
    conversationManager?: ConversationManager,
    toolExecutor?: ToolExecutor,
    observability?: ObservabilityManager
  ) {
    this.config = {
      ...config,
      systemPrompt: config.systemPrompt || 'You are a helpful assistant.',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      memoryEnabled: config.memoryEnabled ?? true,
      toolsEnabled: config.toolsEnabled ?? true
    };
    
    this.runtimeService = runtimeService;
    this.conversationManager = conversationManager;
    this.toolExecutor = toolExecutor;
    
    // Set up observability
    this.observability = observability || {
      getLogger: () => console,
      getMetricsCollector: () => ({
        putMetric: () => {},
        flush: async () => {}
      }),
      getTracer: () => ({
        startSegment: () => ({ id: 'mock', name: 'mock', startTime: Date.now() }),
        endSegment: () => {},
        addAnnotation: () => {},
        addMetadata: () => {},
        addError: () => {}
      }),
      getConfig: () => ({})
    };
    
    this.logger = this.observability.getLogger('chatbot');
    this.metrics = this.observability.getMetricsCollector();
    this.tracer = this.observability.getTracer();
    
    this.logger.info('Chatbot service initialized', { config: this.config });
  }

  /**
   * Create a new session
   * @param userId Optional user ID
   * @param metadata Optional metadata
   * @returns New session
   */
  public createSession(userId?: string, metadata?: Record<string, any>): ChatbotSession {
    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const session: ChatbotSession = {
      id: sessionId,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: this.config.systemPrompt || 'You are a helpful assistant.'
        }
      ],
      metadata
    };
    
    this.logger.info('Created new session', { sessionId, userId });
    this.metrics.putMetric('SessionCreated', 1, MetricUnit.COUNT);
    
    // Store session in memory if enabled
    if (this.config.memoryEnabled && this.conversationManager) {
      this.conversationManager.saveConversation(sessionId, {
        messages: session.messages,
        metadata: {
          userId,
          ...metadata
        }
      });
    }
    
    return session;
  }

  /**
   * Send a message to the chatbot
   * @param session Session
   * @param message User message
   * @returns Response message
   */
  public async sendMessage(session: ChatbotSession, message: string): Promise<Message> {
    const segment = this.tracer.startSegment('ChatbotSendMessage');
    
    try {
      this.logger.info('Processing message', { 
        sessionId: session.id, 
        messageLength: message.length 
      });
      this.metrics.putMetric('MessageReceived', 1, MetricUnit.COUNT);
      
      // Add user message to session
      const userMessage: Message = {
        role: MessageRole.USER,
        content: message
      };
      
      session.messages.push(userMessage);
      session.updatedAt = new Date().toISOString();
      
      // Get response from model
      const startTime = Date.now();
      const response = await this.getModelResponse(session);
      const duration = Date.now() - startTime;
      
      this.metrics.putMetric('ResponseTime', duration, MetricUnit.MILLISECONDS);
      this.logger.info('Received model response', { 
        sessionId: session.id, 
        responseLength: response.content.length,
        durationMs: duration
      });
      
      // Handle tool calls if present
      if (response.toolCalls && response.toolCalls.length > 0 && this.config.toolsEnabled && this.toolExecutor) {
        await this.handleToolCalls(session, response);
      }
      
      // Add response to session
      session.messages.push(response);
      session.updatedAt = new Date().toISOString();
      
      // Update session in memory if enabled
      if (this.config.memoryEnabled && this.conversationManager) {
        this.conversationManager.saveConversation(session.id, {
          messages: session.messages,
          metadata: session.metadata || {}
        });
      }
      
      this.metrics.putMetric('MessageProcessed', 1, MetricUnit.COUNT);
      return response;
      
    } catch (error) {
      this.logger.error('Error processing message', error as Error);
      this.metrics.putMetric('MessageErrors', 1, MetricUnit.COUNT);
      this.tracer.addError(segment, error as Error);
      
      // Return error message
      const errorMessage: Message = {
        role: MessageRole.ASSISTANT,
        content: 'I apologize, but I encountered an error processing your request. Please try again.'
      };
      
      session.messages.push(errorMessage);
      return errorMessage;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Get response from model
   * @param session Session
   * @returns Model response
   */
  private async getModelResponse(session: ChatbotSession): Promise<Message> {
    const segment = this.tracer.startSegment('GetModelResponse');
    
    try {
      // Prepare messages for model
      const messages = [...session.messages];
      
      // Call runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tools: this.config.toolsEnabled ? this.getAvailableTools() : undefined
      });
      
      return response;
      
    } catch (error) {
      this.logger.error('Error getting model response', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Handle tool calls
   * @param session Session
   * @param response Response with tool calls
   */
  private async handleToolCalls(session: ChatbotSession, response: Message): Promise<void> {
    const segment = this.tracer.startSegment('HandleToolCalls');
    
    try {
      if (!response.toolCalls || !this.toolExecutor) {
        return;
      }
      
      this.logger.info('Processing tool calls', { 
        sessionId: session.id, 
        toolCallCount: response.toolCalls.length 
      });
      
      // Execute each tool call
      const toolResults: ToolResult[] = [];
      
      for (const toolCall of response.toolCalls) {
        try {
          const result = await this.executeToolCall(toolCall);
          toolResults.push({
            toolCallId: toolCall.id,
            result
          });
          
        } catch (error) {
          this.logger.error('Error executing tool call', error as Error, {
            toolName: toolCall.function.name
          });
          
          toolResults.push({
            toolCallId: toolCall.id,
            result: { error: (error as Error).message }
          });
        }
      }
      
      // Add tool results to session
      for (const result of toolResults) {
        const toolMessage: Message = {
          role: MessageRole.TOOL,
          content: JSON.stringify(result.result),
          toolCallId: result.toolCallId
        };
        
        session.messages.push(toolMessage);
      }
      
      // Get follow-up response if there were tool calls
      if (toolResults.length > 0) {
        const followUpResponse = await this.getModelResponse(session);
        response.content = followUpResponse.content;
      }
      
    } catch (error) {
      this.logger.error('Error handling tool calls', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Execute a tool call
   * @param toolCall Tool call
   * @returns Tool result
   */
  private async executeToolCall(toolCall: ToolCall): Promise<any> {
    const segment = this.tracer.startSegment('ExecuteToolCall', {
      toolName: toolCall.function.name
    });
    
    try {
      if (!this.toolExecutor) {
        throw new Error('Tool executor not available');
      }
      
      this.logger.info('Executing tool call', { 
        toolName: toolCall.function.name
      });
      
      // Parse arguments
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        this.logger.error('Error parsing tool arguments', error as Error);
        throw new Error('Invalid tool arguments');
      }
      
      // Execute tool
      const startTime = Date.now();
      const result = await this.toolExecutor.executeTool(
        toolCall.function.name,
        args
      );
      const duration = Date.now() - startTime;
      
      this.metrics.putMetric('ToolExecutionTime', duration, MetricUnit.MILLISECONDS, {
        toolName: toolCall.function.name
      });
      
      this.logger.info('Tool execution completed', { 
        toolName: toolCall.function.name,
        durationMs: duration
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error executing tool', error as Error);
      this.metrics.putMetric('ToolExecutionErrors', 1, MetricUnit.COUNT, {
        toolName: toolCall.function.name
      });
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Get available tools
   * @returns Available tools
   */
  private getAvailableTools(): any[] {
    if (!this.toolExecutor) {
      return [];
    }
    
    try {
      return this.toolExecutor.getAvailableTools();
    } catch (error) {
      this.logger.error('Error getting available tools', error as Error);
      return [];
    }
  }

  /**
   * Load session from memory
   * @param sessionId Session ID
   * @returns Session or undefined if not found
   */
  public async loadSession(sessionId: string): Promise<ChatbotSession | undefined> {
    if (!this.config.memoryEnabled || !this.conversationManager) {
      this.logger.warn('Memory not enabled, cannot load session');
      return undefined;
    }
    
    try {
      const conversation = await this.conversationManager.getConversation(sessionId);
      
      if (!conversation) {
        return undefined;
      }
      
      const session: ChatbotSession = {
        id: sessionId,
        userId: conversation.metadata?.userId,
        createdAt: conversation.metadata?.createdAt || new Date().toISOString(),
        updatedAt: conversation.metadata?.updatedAt || new Date().toISOString(),
        messages: conversation.messages,
        metadata: conversation.metadata
      };
      
      this.logger.info('Loaded session from memory', { sessionId });
      return session;
      
    } catch (error) {
      this.logger.error('Error loading session', error as Error);
      return undefined;
    }
  }
}