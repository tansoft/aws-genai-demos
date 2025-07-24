import { PermissionProviderType, PermissionService } from '../services';

describe('PermissionService', () => {
  let permissionService: PermissionService;
  
  beforeEach(() => {
    permissionService = new PermissionService({
      providerType: PermissionProviderType.LOCAL,
    });
  });
  
  test('should initialize with local provider', () => {
    expect(permissionService).toBeDefined();
    expect(permissionService.getManager()).toBeDefined();
  });
  
  test('should check permission for admin user', async () => {
    const response = await permissionService.checkPermission({
      userId: '1', // Admin user
      resource: 'user',
      action: 'read',
    });
    
    expect(response.allowed).toBe(true);
  });
  
  test('should check permission for regular user', async () => {
    const response = await permissionService.checkPermission({
      userId: '2', // Regular user
      resource: 'conversation',
      action: 'create',
    });
    
    expect(response.allowed).toBe(true);
  });
  
  test('should get user permissions', async () => {
    const adminPermissions = await permissionService.getUserPermissions('1');
    expect(adminPermissions.length).toBeGreaterThan(0);
    
    const userPermissions = await permissionService.getUserPermissions('2');
    expect(userPermissions.length).toBeGreaterThan(0);
  });
  
  test('should get user roles', async () => {
    const adminRoles = await permissionService.getUserRoles('1');
    expect(adminRoles.length).toBe(1);
    expect(adminRoles[0].id).toBe('admin');
    
    const userRoles = await permissionService.getUserRoles('2');
    expect(userRoles.length).toBe(1);
    expect(userRoles[0].id).toBe('user');
  });
  
  test('should create and get role', async () => {
    const newRole = await permissionService.createRole({
      name: 'Test Role',
      description: 'Test role description',
      permissions: ['user:read', 'conversation:read'],
    });
    
    expect(newRole.id).toBeDefined();
    
    const retrievedRole = await permissionService.getRole(newRole.id);
    expect(retrievedRole).toBeDefined();
    expect(retrievedRole?.name).toBe('Test Role');
  });
  
  test('should create and get permission', async () => {
    const newPermission = await permissionService.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'test',
      action: 'read',
    });
    
    expect(newPermission.id).toBeDefined();
    
    const retrievedPermission = await permissionService.getPermission(newPermission.id);
    expect(retrievedPermission).toBeDefined();
    expect(retrievedPermission?.name).toBe('Test Permission');
  });
});