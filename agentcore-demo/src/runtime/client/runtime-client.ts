/**
 * Client library for AWS AgentCore Runtime
 */
import axios, { AxiosInstance } from 'axios';
import { CompletionRequest, CompletionResponse } from '../models';

/**
 * Runtime client configuration
 */
export interface RuntimeClientConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Client for AWS AgentCore Runtime
 */
export class RuntimeClient {
  private client: AxiosInstance;
  private config: RuntimeClientConfig;

  constructor(config: RuntimeClientConfig) {
    this.config = config;
    
    // Initialize Axios client
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
      },
    });
  }

  /**
   * Complete a prompt
   * @param request The completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.post('', request);
      return response.data as CompletionResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Runtime API error: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Stream a completion
   * @param request The completion request
   * @param callback The callback for each chunk
   */
  async streamComplete(
    request: CompletionRequest,
    callback: (chunk: CompletionResponse | null, error?: Error) => void
  ): Promise<void> {
    try {
      const response = await this.client.post('', {
        ...request,
        stream: true,
      }, {
        responseType: 'stream',
      });

      const stream = response.data;
      
      stream.on('data', (chunk: Buffer) => {
        try {
          const data = JSON.parse(chunk.toString());
          callback(data);
        } catch (error) {
          callback(null, error as Error);
        }
      });

      stream.on('end', () => {
        callback(null);
      });

      stream.on('error', (error: Error) => {
        callback(null, error);
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        callback(null, new Error(`Runtime API error: ${error.response.status} ${error.response.statusText}`));
      } else {
        callback(null, error as Error);
      }
    }
  }
}