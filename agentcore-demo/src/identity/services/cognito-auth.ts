/**
 * Cognito authentication provider for AWS AgentCore
 */
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../../common';
import { AuthCredentials, AuthProvider, AuthResult, AuthTokens, User } from '../models';

/**
 * Configuration for Cognito authentication provider
 */
export interface CognitoAuthConfig {
  userPoolId: string;
  clientId: string;
  region?: string;
  endpoint?: string;
  adminMode?: boolean;
}

/**
 * Cognito authentication provider implementation
 */
export class CognitoAuthProvider implements AuthProvider {
  private client: CognitoIdentityProviderClient;
  private config: CognitoAuthConfig;
  private currentUser: User | null = null;
  private currentTokens: AuthTokens | null = null;
  
  constructor(config: CognitoAuthConfig) {
    this.config = {
      adminMode: false,
      ...config,
    };
    
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      endpoint: config.endpoint,
    });
    
    logger.info('Cognito authentication provider initialized', {
      userPoolId: config.userPoolId,
      clientId: config.clientId,
      adminMode: this.config.adminMode,
    });
  }
  
  /**
   * Parse user attributes from Cognito response
   * @param attributes The user attributes from Cognito
   */
  private parseUserAttributes(attributes: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const attr of attributes) {
      if (attr.Name && attr.Value) {
        result[attr.Name] = attr.Value;
      }
    }
    
    return result;
  }
  
  /**
   * Parse user from Cognito response
   * @param userData The user data from Cognito
   */
  private parseUser(userData: any): User {
    const attributes = this.parseUserAttributes(userData.UserAttributes || []);
    
    return {
      id: attributes.sub || '',
      username: userData.Username || '',
      email: attributes.email || '',
      roles: (attributes['custom:roles'] || '').split(',').filter(Boolean),
      groups: (attributes['custom:groups'] || '').split(',').filter(Boolean),
      attributes,
      createdAt: userData.UserCreateDate ? new Date(userData.UserCreateDate).toISOString() : new Date().toISOString(),
      updatedAt: userData.UserLastModifiedDate ? new Date(userData.UserLastModifiedDate).toISOString() : new Date().toISOString(),
    };
  }
  
  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      logger.debug('Signing in user', { username: credentials.username });
      
      let authResponse;
      
      if (this.config.adminMode) {
        // Use admin auth flow
        const command = new AdminInitiateAuthCommand({
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: credentials.username,
            PASSWORD: credentials.password,
          },
        });
        
        authResponse = await this.client.send(command);
        
        // Handle auth challenges if needed
        if (authResponse.ChallengeName) {
          logger.debug('Auth challenge required', { challengeName: authResponse.ChallengeName });
          
          // For now, we only handle NEW_PASSWORD_REQUIRED challenge
          if (authResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
            const challengeCommand = new AdminRespondToAuthChallengeCommand({
              UserPoolId: this.config.userPoolId,
              ClientId: this.config.clientId,
              ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
              ChallengeResponses: {
                USERNAME: credentials.username,
                NEW_PASSWORD: credentials.password,
              },
              Session: authResponse.Session,
            });
            
            authResponse = await this.client.send(challengeCommand);
          }
        }
      } else {
        // Use standard auth flow
        const command = new InitiateAuthCommand({
          ClientId: this.config.clientId,
          AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: credentials.username,
            PASSWORD: credentials.password,
          },
        });
        
        authResponse = await this.client.send(command);
      }
      
      if (!authResponse.AuthenticationResult) {
        throw new Error('Authentication failed: No authentication result');
      }
      
      // Store tokens
      this.currentTokens = {
        accessToken: authResponse.AuthenticationResult.AccessToken || '',
        idToken: authResponse.AuthenticationResult.IdToken,
        refreshToken: authResponse.AuthenticationResult.RefreshToken,
        expiresIn: authResponse.AuthenticationResult.ExpiresIn || 3600,
      };
      
      // Get user details
      const userCommand = new GetUserCommand({
        AccessToken: this.currentTokens.accessToken,
      });
      
      const userResponse = await this.client.send(userCommand);
      
      // Parse user
      this.currentUser = this.parseUser(userResponse);
      
      logger.debug('User signed in successfully', { username: this.currentUser.username });
      
      return {
        user: this.currentUser,
        tokens: this.currentTokens,
        authenticated: true,
        expiresAt: Date.now() + this.currentTokens.expiresIn * 1000,
      };
    } catch (error) {
      logger.error('Error signing in user', { error });
      throw error;
    }
  }
  
  async signOut(): Promise<void> {
    try {
      if (!this.currentTokens?.accessToken) {
        logger.debug('No user is signed in');
        return;
      }
      
      logger.debug('Signing out user');
      
      const command = new GlobalSignOutCommand({
        AccessToken: this.currentTokens.accessToken,
      });
      
      await this.client.send(command);
      
      // Clear current user and tokens
      this.currentUser = null;
      this.currentTokens = null;
      
      logger.debug('User signed out successfully');
    } catch (error) {
      logger.error('Error signing out user', { error });
      throw error;
    }
  }
  
  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.currentTokens?.accessToken) {
        return null;
      }
      
      // If we already have the user, return it
      if (this.currentUser) {
        return this.currentUser;
      }
      
      // Otherwise, get the user details
      const command = new GetUserCommand({
        AccessToken: this.currentTokens.accessToken,
      });
      
      const response = await this.client.send(command);
      
      // Parse user
      this.currentUser = this.parseUser(response);
      
      return this.currentUser;
    } catch (error) {
      logger.error('Error getting current user', { error });
      return null;
    }
  }
  
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      logger.error('Error checking authentication', { error });
      return false;
    }
  }
  
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      logger.debug('Refreshing tokens');
      
      let authResponse;
      
      if (this.config.adminMode) {
        // Use admin auth flow
        const command = new AdminInitiateAuthCommand({
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        });
        
        authResponse = await this.client.send(command);
      } else {
        // Use standard auth flow
        const command = new InitiateAuthCommand({
          ClientId: this.config.clientId,
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        });
        
        authResponse = await this.client.send(command);
      }
      
      if (!authResponse.AuthenticationResult) {
        throw new Error('Token refresh failed: No authentication result');
      }
      
      // Update tokens
      this.currentTokens = {
        accessToken: authResponse.AuthenticationResult.AccessToken || '',
        idToken: authResponse.AuthenticationResult.IdToken,
        refreshToken: authResponse.AuthenticationResult.RefreshToken || refreshToken,
        expiresIn: authResponse.AuthenticationResult.ExpiresIn || 3600,
      };
      
      logger.debug('Tokens refreshed successfully');
      
      return this.currentTokens;
    } catch (error) {
      logger.error('Error refreshing tokens', { error });
      throw error;
    }
  }
  
  async getTokens(): Promise<AuthTokens | null> {
    return this.currentTokens;
  }
  
  /**
   * Get user by username (admin only)
   * @param username The username to look up
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      if (!this.config.adminMode) {
        throw new Error('Admin mode is required to get user by username');
      }
      
      logger.debug('Getting user by username', { username });
      
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
      });
      
      const response = await this.client.send(command);
      
      // Parse user
      return this.parseUser(response);
    } catch (error) {
      logger.error('Error getting user by username', { error, username });
      return null;
    }
  }
}