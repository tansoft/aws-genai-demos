/**
 * Authentication models for AWS AgentCore
 */

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  groups?: string[];
  attributes?: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: User;
  tokens: AuthTokens;
  authenticated: boolean;
  expiresAt?: number;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Authentication provider interface
 */
export interface AuthProvider {
  /**
   * Sign in a user
   * @param credentials The user credentials
   */
  signIn(credentials: AuthCredentials): Promise<AuthResult>;
  
  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;
  
  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<User | null>;
  
  /**
   * Check if a user is authenticated
   */
  isAuthenticated(): Promise<boolean>;
  
  /**
   * Refresh the authentication tokens
   * @param refreshToken The refresh token
   */
  refreshTokens(refreshToken: string): Promise<AuthTokens>;
  
  /**
   * Get the current authentication tokens
   */
  getTokens(): Promise<AuthTokens | null>;
}