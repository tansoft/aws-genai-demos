/**
 * Authentication service for AWS AgentCore
 */
import { logger } from '../../common';
import { AuthCredentials, AuthProvider, AuthResult, AuthTokens, User } from '../models';
import { CognitoAuthProvider } from './cognito-auth';
import { LocalAuthProvider } from './local-auth';

/**
 * Authentication provider type
 */
export enum AuthProviderType {
  COGNITO = 'cognito',
  LOCAL = 'local',
}

/**
 * Authentication service configuration
 */
export interface AuthServiceConfig {
  providerType: AuthProviderType;
  cognito?: {
    userPoolId: string;
    clientId: string;
    region?: string;
    endpoint?: string;
    adminMode?: boolean;
  };
  local?: {
    users?: User[];
    tokenExpirySeconds?: number;
  };
  tokenStorage?: {
    enabled: boolean;
    storageKey?: string;
  };
}

/**
 * Authentication service
 */
export class AuthService {
  private provider: AuthProvider;
  private config: AuthServiceConfig;
  
  constructor(config: AuthServiceConfig) {
    this.config = {
      ...config,
      tokenStorage: {
        enabled: true,
        storageKey: 'agentcore_auth_tokens',
        ...config.tokenStorage,
      },
    };
    
    // Create the appropriate provider
    switch (config.providerType) {
      case AuthProviderType.COGNITO:
        if (!config.cognito?.userPoolId || !config.cognito?.clientId) {
          throw new Error('Cognito user pool ID and client ID are required');
        }
        
        this.provider = new CognitoAuthProvider({
          userPoolId: config.cognito.userPoolId,
          clientId: config.cognito.clientId,
          region: config.cognito.region,
          endpoint: config.cognito.endpoint,
          adminMode: config.cognito.adminMode,
        });
        break;
        
      case AuthProviderType.LOCAL:
        this.provider = new LocalAuthProvider(config.local);
        break;
        
      default:
        throw new Error(`Unsupported auth provider type: ${config.providerType}`);
    }
    
    logger.info('Authentication service initialized', {
      providerType: config.providerType,
      tokenStorageEnabled: this.config.tokenStorage?.enabled,
    });
    
    // Load tokens from storage if enabled
    if (this.config.tokenStorage?.enabled) {
      this.loadTokens();
    }
  }
  
  /**
   * Save tokens to storage
   * @param tokens The tokens to save
   */
  private saveTokens(tokens: AuthTokens): void {
    if (!this.config.tokenStorage?.enabled) {
      return;
    }
    
    try {
      const storageKey = this.config.tokenStorage?.storageKey || 'agentcore_auth_tokens';
      
      // In a browser environment, use localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(tokens));
      }
      // In a Node.js environment, we could use the file system
      // but for now, we'll just log a message
      else {
        logger.debug('Token storage not available in this environment');
      }
    } catch (error) {
      logger.error('Error saving tokens to storage', { error });
    }
  }
  
  /**
   * Load tokens from storage
   */
  private loadTokens(): void {
    if (!this.config.tokenStorage?.enabled) {
      return;
    }
    
    try {
      const storageKey = this.config.tokenStorage?.storageKey || 'agentcore_auth_tokens';
      
      // In a browser environment, use localStorage
      if (typeof localStorage !== 'undefined') {
        const tokensJson = localStorage.getItem(storageKey);
        
        if (tokensJson) {
          const tokens = JSON.parse(tokensJson) as AuthTokens;
          
          // Refresh the tokens
          this.refreshTokens(tokens.refreshToken || '').catch(error => {
            logger.error('Error refreshing tokens from storage', { error });
          });
        }
      }
      // In a Node.js environment, we could use the file system
      // but for now, we'll just log a message
      else {
        logger.debug('Token storage not available in this environment');
      }
    } catch (error) {
      logger.error('Error loading tokens from storage', { error });
    }
  }
  
  /**
   * Clear tokens from storage
   */
  private clearTokens(): void {
    if (!this.config.tokenStorage?.enabled) {
      return;
    }
    
    try {
      const storageKey = this.config.tokenStorage?.storageKey || 'agentcore_auth_tokens';
      
      // In a browser environment, use localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      // In a Node.js environment, we could use the file system
      // but for now, we'll just log a message
      else {
        logger.debug('Token storage not available in this environment');
      }
    } catch (error) {
      logger.error('Error clearing tokens from storage', { error });
    }
  }
  
  /**
   * Sign in a user
   * @param credentials The user credentials
   */
  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    const result = await this.provider.signIn(credentials);
    
    // Save tokens if enabled
    if (this.config.tokenStorage?.enabled && result.tokens) {
      this.saveTokens(result.tokens);
    }
    
    return result;
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    await this.provider.signOut();
    
    // Clear tokens if enabled
    if (this.config.tokenStorage?.enabled) {
      this.clearTokens();
    }
  }
  
  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    return this.provider.getCurrentUser();
  }
  
  /**
   * Check if a user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.provider.isAuthenticated();
  }
  
  /**
   * Refresh the authentication tokens
   * @param refreshToken The refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokens = await this.provider.refreshTokens(refreshToken);
    
    // Save tokens if enabled
    if (this.config.tokenStorage?.enabled && tokens) {
      this.saveTokens(tokens);
    }
    
    return tokens;
  }
  
  /**
   * Get the current authentication tokens
   */
  async getTokens(): Promise<AuthTokens | null> {
    return this.provider.getTokens();
  }
  
  /**
   * Get the authentication provider
   */
  getProvider(): AuthProvider {
    return this.provider;
  }
}