import { AuthProviderType, AuthService } from '../services';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService({
      providerType: AuthProviderType.LOCAL,
      tokenStorage: {
        enabled: false, // Disable token storage for tests
      },
    });
  });
  
  test('should initialize with local provider', () => {
    expect(authService).toBeDefined();
    expect(authService.getProvider()).toBeDefined();
  });
  
  test('should sign in with valid credentials', async () => {
    const result = await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    expect(result.authenticated).toBe(true);
    expect(result.user.username).toBe('admin');
    expect(result.tokens.accessToken).toBeDefined();
  });
  
  test('should reject invalid credentials', async () => {
    await expect(authService.signIn({
      username: 'admin',
      password: 'wrong',
    })).rejects.toThrow('Invalid password');
  });
  
  test('should get current user after sign in', async () => {
    await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    const user = await authService.getCurrentUser();
    expect(user).toBeDefined();
    expect(user?.username).toBe('admin');
  });
  
  test('should check authentication status', async () => {
    expect(await authService.isAuthenticated()).toBe(false);
    
    await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    expect(await authService.isAuthenticated()).toBe(true);
  });
  
  test('should sign out successfully', async () => {
    await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    await authService.signOut();
    
    expect(await authService.isAuthenticated()).toBe(false);
    expect(await authService.getCurrentUser()).toBeNull();
  });
  
  test('should refresh tokens', async () => {
    const signInResult = await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    const originalTokens = signInResult.tokens;
    
    const refreshedTokens = await authService.refreshTokens(originalTokens.refreshToken!);
    
    expect(refreshedTokens.accessToken).toBeDefined();
    expect(refreshedTokens.accessToken).not.toBe(originalTokens.accessToken);
  });
  
  test('should get tokens', async () => {
    expect(await authService.getTokens()).toBeNull();
    
    await authService.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    const tokens = await authService.getTokens();
    expect(tokens).toBeDefined();
    expect(tokens?.accessToken).toBeDefined();
  });
});