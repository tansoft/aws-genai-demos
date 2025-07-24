import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { AgentConfig } from './types';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables and config files
 */
export function loadConfig(): AgentConfig {
  // Default configuration
  const defaultConfig: AgentConfig = {
    id: process.env.AGENT_ID || 'demo-agent',
    name: process.env.AGENT_NAME || 'Demo Agent',
    description: process.env.AGENT_DESCRIPTION || 'A demo agent for AWS AgentCore',
    runtime: {
      provider: process.env.MODEL_PROVIDER || 'openai',
      model: process.env.MODEL_NAME || 'gpt-4',
      protocol: process.env.MODEL_PROTOCOL || 'openai',
      parameters: {
        temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '1000', 10),
      },
    },
    memory: {
      shortTerm: {
        enabled: process.env.SHORT_TERM_MEMORY_ENABLED !== 'false',
        maxMessages: parseInt(process.env.SHORT_TERM_MEMORY_MAX_MESSAGES || '100', 10),
      },
      longTerm: {
        enabled: process.env.LONG_TERM_MEMORY_ENABLED !== 'false',
        tableName: process.env.MEMORY_TABLE_NAME || 'agentcore-memory',
      },
    },
    identity: {
      authProvider: process.env.AUTH_PROVIDER || 'cognito',
      userPoolId: process.env.USER_POOL_ID,
      clientId: process.env.CLIENT_ID,
      permissionProvider: process.env.PERMISSION_PROVIDER || 'local',
      iam: {
        adminRoleArn: process.env.IAM_ADMIN_ROLE_ARN,
        userRoleArn: process.env.IAM_USER_ROLE_ARN,
        guestRoleArn: process.env.IAM_GUEST_ROLE_ARN,
        lambdaRoleArn: process.env.IAM_LAMBDA_ROLE_ARN,
      },
    },
    gateway: {
      providerType: process.env.GATEWAY_PROVIDER_TYPE || 'local',
      lambdaFunctionName: process.env.GATEWAY_LAMBDA_FUNCTION_NAME || 'agentcore-tool-gateway',
      maxRetries: parseInt(process.env.GATEWAY_MAX_RETRIES || '3', 10),
    },
    tools: [],
    codeInterpreter: {
      enabled: process.env.CODE_INTERPRETER_ENABLED === 'true',
      languages: (process.env.CODE_INTERPRETER_LANGUAGES || 'python,javascript').split(','),
      timeout: parseInt(process.env.CODE_INTERPRETER_TIMEOUT || '30000', 10),
      maxMemory: parseInt(process.env.CODE_INTERPRETER_MAX_MEMORY || '512', 10),
    },
    browser: {
      enabled: process.env.BROWSER_ENABLED === 'true',
      headless: process.env.BROWSER_HEADLESS !== 'false',
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    },
    observability: {
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        destination: process.env.LOG_DESTINATION || 'console',
      },
      metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        namespace: process.env.METRICS_NAMESPACE || 'AgentCore',
      },
      tracing: {
        enabled: process.env.TRACING_ENABLED === 'true',
      },
    },
  };

  // Try to load config from file if it exists
  const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return deepMerge(defaultConfig, fileConfig);
    } catch (error) {
      console.error('Error loading config file:', error);
    }
  }

  return defaultConfig;
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: any): T {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Export the config singleton
export const config = loadConfig();