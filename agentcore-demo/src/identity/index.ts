import { config, logger } from '../common';
import { AuthProviderType, AuthService, PermissionProviderType, PermissionService } from './services';
import { AuthCredentials, Permission, PermissionManager, PermissionRequest, PermissionResponse, Role } from './models';

// Export identity components
export {
  // Auth components
  AuthProviderType,
  AuthService,
  AuthCredentials,
  
  // Permission components
  PermissionProviderType,
  PermissionService,
  Permission,
  PermissionManager,
  PermissionRequest,
  PermissionResponse,
  Role,
};

/**
 * Identity demo for AWS AgentCore
 * Demonstrates authentication and security management
 */
export default async function identityDemo() {
  logger.info('Starting Identity demo');
  
  try {
    // Determine which auth provider to use
    const useCognito = config.identity.authProvider === 'cognito' && 
                      config.identity.userPoolId && 
                      config.identity.clientId;
    
    const providerType = useCognito ? AuthProviderType.COGNITO : AuthProviderType.LOCAL;
    
    logger.info('Identity configuration', {
      authProvider: config.identity.authProvider,
      useCognito,
      providerType,
    });
    
    // Initialize the auth service
    const authService = new AuthService({
      providerType,
      cognito: useCognito ? {
        userPoolId: config.identity.userPoolId!,
        clientId: config.identity.clientId!,
      } : undefined,
      tokenStorage: {
        enabled: false, // Disable token storage for the demo
      },
    });
    
    // Check if already authenticated
    const isAuthenticated = await authService.isAuthenticated();
    logger.info('Authentication status', { isAuthenticated });
    
    if (isAuthenticated) {
      const user = await authService.getCurrentUser();
      logger.info('Already authenticated as', { 
        username: user?.username,
        roles: user?.roles,
      });
      
      // Sign out first
      await authService.signOut();
      logger.info('Signed out current user');
    }
    
    // Sign in as admin
    logger.info('Signing in as admin');
    
    const adminCredentials: AuthCredentials = {
      username: 'admin',
      password: 'admin',
    };
    
    try {
      const adminResult = await authService.signIn(adminCredentials);
      
      logger.info('Admin sign in successful', {
        username: adminResult.user.username,
        roles: adminResult.user.roles,
        expiresAt: new Date(adminResult.expiresAt || 0).toISOString(),
      });
      
      // Get tokens
      const tokens = await authService.getTokens();
      logger.info('Admin tokens', {
        accessToken: tokens?.accessToken.substring(0, 10) + '...',
        hasIdToken: !!tokens?.idToken,
        hasRefreshToken: !!tokens?.refreshToken,
        expiresIn: tokens?.expiresIn,
      });
      
      // Sign out
      await authService.signOut();
      logger.info('Admin signed out');
    } catch (error) {
      logger.error('Admin sign in failed', { error });
    }
    
    // Sign in as regular user
    logger.info('Signing in as regular user');
    
    const userCredentials: AuthCredentials = {
      username: 'user',
      password: 'password',
    };
    
    try {
      const userResult = await authService.signIn(userCredentials);
      
      logger.info('User sign in successful', {
        username: userResult.user.username,
        roles: userResult.user.roles,
        expiresAt: new Date(userResult.expiresAt || 0).toISOString(),
      });
      
      // Refresh tokens
      const tokens = await authService.getTokens();
      
      if (tokens?.refreshToken) {
        logger.info('Refreshing tokens');
        
        const refreshedTokens = await authService.refreshTokens(tokens.refreshToken);
        
        logger.info('Tokens refreshed', {
          accessToken: refreshedTokens.accessToken.substring(0, 10) + '...',
          hasIdToken: !!refreshedTokens.idToken,
          hasRefreshToken: !!refreshedTokens.refreshToken,
          expiresIn: refreshedTokens.expiresIn,
        });
      }
      
      // Sign out
      await authService.signOut();
      logger.info('User signed out');
    } catch (error) {
      logger.error('User sign in failed', { error });
    }
    
    // Try invalid credentials
    logger.info('Trying invalid credentials');
    
    const invalidCredentials: AuthCredentials = {
      username: 'nonexistent',
      password: 'wrong',
    };
    
    try {
      await authService.signIn(invalidCredentials);
      logger.error('Invalid credentials sign in succeeded unexpectedly');
    } catch (error) {
      logger.info('Invalid credentials sign in failed as expected', {
        error: (error as Error).message,
      });
    }
    
    logger.info('Identity demo completed successfully');
  } catch (error) {
    logger.error('Error in identity demo', { error });
  }
}