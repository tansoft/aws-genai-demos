import { LocalAuthProvider } from '../services';
import { User } from '../models';

describe('LocalAuthProvider', () => {
  let authProvider: LocalAuthProvider;
  
  beforeEach(() => {
    authProvider = new LocalAuthProvider();
  });
  
  test('should sign in with valid credentials', async () => {
    const result = await authProvider.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    expect(result.authenticated).toBe(true);
    expect(result.user.username).toBe('admin');
    expect(result.user.roles).toContain('admin');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });
  
  test('should reject invalid credentials', async () => {
    await expect(authProvider.signIn({
      username: 'admin',
      password: 'wrong',
    })).rejects.toThrow('Invalid password');
    
    await expect(authProvider.signIn({
      username: 'nonexistent',
      password: 'password',
    })).rejects.toThrow('User not found');
  });
  
  test('should get current user after sign in', async () => {
    await authProvider.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    const user = await authProvider.getCurrentUser();
    expect(user).toBeDefined();
    expect(user?.username).toBe('admin');
  });
  
  test('should return null for current user when not signed in', async () => {
    const user = await authProvider.getCurrentUser();
    expect(user).toBeNull();
  });
  
  test('should sign out successfully', async () => {
    await authProvider.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    await authProvider.signOut();
    
    const user = await authProvider.getCurrentUser();
    expect(user).toBeNull();
    
    const tokens = await authProvider.getTokens();
    expect(tokens).toBeNull();
  });
  
  test('should refresh tokens', async () => {
    const signInResult = await authProvider.signIn({
      username: 'admin',
      password: 'admin',
    });
    
    const originalTokens = signInResult.tokens;
    
    const refreshedTokens = await authProvider.refreshTokens(originalTokens.refreshToken!);
    
    expect(refreshedTokens.accessToken).toBeDefined();
    expect(refreshedTokens.accessToken).not.toBe(originalTokens.accessToken);
    expect(refreshedTokens.refreshToken).toBeDefined();
    expect(refreshedTokens.refreshToken).not.toBe(originalTokens.refreshToken);
  });
  
  test('should add and retrieve users', async () => {
    const newUser: User = {
      id: '3',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    authProvider.addUser(newUser, 'testpassword');
    
    const result = await authProvider.signIn({
      username: 'testuser',
      password: 'testpassword',
    });
    
    expect(result.authenticated).toBe(true);
    expect(result.user.username).toBe('testuser');
    
    const retrievedUser = await authProvider.getUserByUsername('testuser');
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.username).toBe('testuser');
  });
});