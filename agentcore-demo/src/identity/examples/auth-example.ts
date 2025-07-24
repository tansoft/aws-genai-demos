/**
 * Example of using the authentication service in a web application
 */
import { AuthProviderType, AuthService } from '../services';
import { AuthCredentials } from '../models';

/**
 * Run the authentication example
 */
async function runAuthExample() {
  try {
    console.log('Starting authentication example...');
    
    // Initialize the auth service with local provider
    const authService = new AuthService({
      providerType: AuthProviderType.LOCAL,
      tokenStorage: {
        enabled: true, // Enable token storage for the example
      },
    });
    
    // Check if already authenticated
    const isAuthenticated = await authService.isAuthenticated();
    console.log(`Already authenticated: ${isAuthenticated}`);
    
    if (isAuthenticated) {
      const user = await authService.getCurrentUser();
      console.log(`Authenticated as: ${user?.username}`);
      
      // Sign out first
      await authService.signOut();
      console.log('Signed out current user');
    }
    
    // Sign in as admin
    console.log('\nSigning in as admin...');
    
    const adminCredentials: AuthCredentials = {
      username: 'admin',
      password: 'admin',
    };
    
    try {
      const adminResult = await authService.signIn(adminCredentials);
      
      console.log('Admin sign in successful:');
      console.log(`- Username: ${adminResult.user.username}`);
      console.log(`- Roles: ${adminResult.user.roles.join(', ')}`);
      console.log(`- Expires at: ${new Date(adminResult.expiresAt || 0).toLocaleString()}`);
      
      // Get tokens
      const tokens = await authService.getTokens();
      console.log('\nAdmin tokens:');
      console.log(`- Access token: ${tokens?.accessToken.substring(0, 10)}...`);
      console.log(`- Has ID token: ${!!tokens?.idToken}`);
      console.log(`- Has refresh token: ${!!tokens?.refreshToken}`);
      console.log(`- Expires in: ${tokens?.expiresIn} seconds`);
      
      // Check authentication status
      console.log(`\nAuthenticated: ${await authService.isAuthenticated()}`);
      
      // Sign out
      await authService.signOut();
      console.log('Admin signed out');
      console.log(`Authenticated after sign out: ${await authService.isAuthenticated()}`);
    } catch (error) {
      console.error('Admin sign in failed:', error);
    }
    
    // Sign in as regular user
    console.log('\nSigning in as regular user...');
    
    const userCredentials: AuthCredentials = {
      username: 'user',
      password: 'password',
    };
    
    try {
      const userResult = await authService.signIn(userCredentials);
      
      console.log('User sign in successful:');
      console.log(`- Username: ${userResult.user.username}`);
      console.log(`- Roles: ${userResult.user.roles.join(', ')}`);
      
      // Refresh tokens
      const tokens = await authService.getTokens();
      
      if (tokens?.refreshToken) {
        console.log('\nRefreshing tokens...');
        
        const refreshedTokens = await authService.refreshTokens(tokens.refreshToken);
        
        console.log('Tokens refreshed:');
        console.log(`- Access token: ${refreshedTokens.accessToken.substring(0, 10)}...`);
        console.log(`- Has ID token: ${!!refreshedTokens.idToken}`);
        console.log(`- Has refresh token: ${!!refreshedTokens.refreshToken}`);
      }
      
      // Sign out
      await authService.signOut();
      console.log('User signed out');
    } catch (error) {
      console.error('User sign in failed:', error);
    }
    
    // Try invalid credentials
    console.log('\nTrying invalid credentials...');
    
    const invalidCredentials: AuthCredentials = {
      username: 'nonexistent',
      password: 'wrong',
    };
    
    try {
      await authService.signIn(invalidCredentials);
      console.error('Invalid credentials sign in succeeded unexpectedly');
    } catch (error) {
      console.log(`Invalid credentials sign in failed as expected: ${(error as Error).message}`);
    }
    
    console.log('\nAuthentication example completed successfully');
  } catch (error) {
    console.error('Error in authentication example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAuthExample();
}

export default runAuthExample;