/**
 * Local authentication provider for AWS AgentCore
 * This is for testing purposes only and should not be used in production
 */
import { logger } from '../../common';
import { AuthCredentials, AuthProvider, AuthResult, AuthTokens, User } from '../models';

/**
 * Configuration for local authentication provider
 */
export interface LocalAuthConfig {
  users?: User[];
  tokenExpirySeconds?: number;
}

/**
 * Local authentication provider implementation
 */
export class LocalAuthProvider implements AuthProvider {
  private users: Map<string, { user: User; password: string }>;
  private currentUser: User | null = null;
  private currentTokens: AuthTokens | null = null;
  private tokenExpirySeconds: number;
  
  constructor(config: LocalAuthConfig = {}) {
    this.users = new Map();
    this.tokenExpirySeconds = config.tokenExpirySeconds || 3600; // 1 hour
    
    // Add default users if provided
    if (config.users) {
      for (const user of config.users) {
        this.addUser(user, 'password');
      }
    }
    
    // Add a default admin user
    this.addUser({
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['admin'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 'admin');
    
    // Add a default user
    this.addUser({
      id: '2',
      username: 'user',
      email: 'user@example.com',
      roles: ['user'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 'password');
    
    logger.info('Local authentication provider initialized', {
      userCount: this.users.size,
    });
  }
  
  /**
   * Add a user to the local store
   * @param user The user to add
   * @param password The user's password
   */
  addUser(user: User, password: string): void {
    this.users.set(user.username, { user, password });
    logger.debug('Added user', { username: user.username });
  }
  
  /**
   * Generate a random token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      logger.debug('Signing in user', { username: credentials.username });
      
      const userEntry = this.users.get(credentials.username);
      
      if (!userEntry) {
        throw new Error('User not found');
      }
      
      if (userEntry.password !== credentials.password) {
        throw new Error('Invalid password');
      }
      
      // Store user
      this.currentUser = userEntry.user;
      
      // Generate tokens
      this.currentTokens = {
        accessToken: this.generateToken(),
        idToken: this.generateToken(),
        refreshToken: this.generateToken(),
        expiresIn: this.tokenExpirySeconds,
      };
      
      logger.debug('User signed in successfully', { username: this.currentUser.username });
      
      return {
        user: this.currentUser,
        tokens: this.currentTokens,
        authenticated: true,
        expiresAt: Date.now() + this.tokenExpirySeconds * 1000,
      };
    } catch (error) {
      logger.error('Error signing in user', { error });
      throw error;
    }
  }
  
  async signOut(): Promise<void> {
    try {
      if (!this.currentUser) {
        logger.debug('No user is signed in');
        return;
      }
      
      logger.debug('Signing out user', { username: this.currentUser.username });
      
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
    return this.currentUser;
  }
  
  async isAuthenticated(): Promise<boolean> {
    return !!this.currentUser;
  }
  
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      logger.debug('Refreshing tokens');
      
      if (!this.currentUser) {
        throw new Error('No user is signed in');
      }
      
      if (!this.currentTokens || this.currentTokens.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      this.currentTokens = {
        accessToken: this.generateToken(),
        idToken: this.generateToken(),
        refreshToken: this.generateToken(),
        expiresIn: this.tokenExpirySeconds,
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
   * Get user by username
   * @param username The username to look up
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const userEntry = this.users.get(username);
    return userEntry ? userEntry.user : null;
  }
  
  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(entry => entry.user);
  }
}