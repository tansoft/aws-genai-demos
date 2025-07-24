import { LocalPermissionManager } from '../services';
import { Permission, Role } from '../models';

describe('LocalPermissionManager', () => {
  let permissionManager: LocalPermissionManager;
  
  beforeEach(() => {
    permissionManager = new LocalPermissionManager();
  });
  
  test('should check permission for admin user', async () => {
    const response = await permissionManager.checkPermission({
      userId: '1', // Admin user
      resource: 'user',
      action: 'read',
    });
    
    expect(response.allowed).toBe(true);
  });
  
  test('should check permission for regular user', async () => {
    const response = await permissionManager.checkPermission({
      userId: '2', // Regular user
      resource: 'conversation',
      action: 'create',
    });
    
    expect(response.allowed).toBe(true);
  });
  
  test('should check permission with conditions', async () => {
    // User is owner of the resource
    const responseOwner = await permissionManager.checkPermission({
      userId: '2', // Regular user
      resource: 'conversation',
      action: 'update',
      context: {
        userId: '2',
        ownerId: '2',
      },
    });
    
    expect(responseOwner.allowed).toBe(true);
    
    // User is not owner of the resource
    const responseNotOwner = await permissionManager.checkPermission({
      userId: '2', // Regular user
      resource: 'conversation',
      action: 'update',
      context: {
        userId: '2',
        ownerId: '3',
      },
    });
    
    expect(responseNotOwner.allowed).toBe(false);
  });
  
  test('should get user permissions', async () => {
    const adminPermissions = await permissionManager.getUserPermissions('1');
    expect(adminPermissions.length).toBeGreaterThan(0);
    expect(adminPermissions.some(p => p.id === 'admin:*')).toBe(true);
    
    const userPermissions = await permissionManager.getUserPermissions('2');
    expect(userPermissions.length).toBeGreaterThan(0);
    expect(userPermissions.some(p => p.id === 'conversation:create')).toBe(true);
  });
  
  test('should get user roles', async () => {
    const adminRoles = await permissionManager.getUserRoles('1');
    expect(adminRoles.length).toBe(1);
    expect(adminRoles[0].id).toBe('admin');
    
    const userRoles = await permissionManager.getUserRoles('2');
    expect(userRoles.length).toBe(1);
    expect(userRoles[0].id).toBe('user');
  });
  
  test('should add and remove role to user', async () => {
    // Add guest role to user 2
    await permissionManager.addRoleToUser('2', 'guest');
    
    const userRoles = await permissionManager.getUserRoles('2');
    expect(userRoles.length).toBe(2);
    expect(userRoles.some(r => r.id === 'user')).toBe(true);
    expect(userRoles.some(r => r.id === 'guest')).toBe(true);
    
    // Remove guest role from user 2
    await permissionManager.removeRoleFromUser('2', 'guest');
    
    const updatedUserRoles = await permissionManager.getUserRoles('2');
    expect(updatedUserRoles.length).toBe(1);
    expect(updatedUserRoles[0].id).toBe('user');
  });
  
  test('should create, update, and delete role', async () => {
    // Create a new role
    const newRole = await permissionManager.createRole({
      name: 'Test Role',
      description: 'Test role description',
      permissions: ['user:read', 'conversation:read'],
    });
    
    expect(newRole.id).toBeDefined();
    expect(newRole.name).toBe('Test Role');
    expect(newRole.permissions).toEqual(['user:read', 'conversation:read']);
    
    // Update the role
    const updatedRole = await permissionManager.updateRole(newRole.id, {
      name: 'Updated Test Role',
      permissions: ['user:read', 'conversation:read', 'message:read'],
    });
    
    expect(updatedRole.id).toBe(newRole.id);
    expect(updatedRole.name).toBe('Updated Test Role');
    expect(updatedRole.permissions).toEqual(['user:read', 'conversation:read', 'message:read']);
    
    // Get the role
    const retrievedRole = await permissionManager.getRole(newRole.id);
    expect(retrievedRole).toBeDefined();
    expect(retrievedRole?.name).toBe('Updated Test Role');
    
    // Delete the role
    await permissionManager.deleteRole(newRole.id);
    
    const deletedRole = await permissionManager.getRole(newRole.id);
    expect(deletedRole).toBeNull();
  });
  
  test('should create, update, and delete permission', async () => {
    // Create a new permission
    const newPermission = await permissionManager.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'test',
      action: 'read',
    });
    
    expect(newPermission.id).toBeDefined();
    expect(newPermission.name).toBe('Test Permission');
    expect(newPermission.resource).toBe('test');
    expect(newPermission.action).toBe('read');
    
    // Update the permission
    const updatedPermission = await permissionManager.updatePermission(newPermission.id, {
      name: 'Updated Test Permission',
      description: 'Updated test permission description',
    });
    
    expect(updatedPermission.id).toBe(newPermission.id);
    expect(updatedPermission.name).toBe('Updated Test Permission');
    expect(updatedPermission.resource).toBe('test');
    
    // Get the permission
    const retrievedPermission = await permissionManager.getPermission(newPermission.id);
    expect(retrievedPermission).toBeDefined();
    expect(retrievedPermission?.name).toBe('Updated Test Permission');
    
    // Delete the permission
    await permissionManager.deletePermission(newPermission.id);
    
    const deletedPermission = await permissionManager.getPermission(newPermission.id);
    expect(deletedPermission).toBeNull();
  });
  
  test('should get all roles and permissions', async () => {
    const roles = await permissionManager.getAllRoles();
    expect(roles.length).toBeGreaterThanOrEqual(3); // admin, user, guest
    
    const permissions = await permissionManager.getAllPermissions();
    expect(permissions.length).toBeGreaterThan(0);
  });
});