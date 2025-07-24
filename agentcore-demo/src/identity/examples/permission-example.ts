/**
 * Example of using the permission service
 */
import { PermissionProviderType, PermissionService } from '../services';
import { Permission, PermissionRequest, Role } from '../models';

/**
 * Run the permission example
 */
async function runPermissionExample() {
  try {
    console.log('Starting permission example...');
    
    // Initialize the permission service with local provider
    const permissionService = new PermissionService({
      providerType: PermissionProviderType.LOCAL,
    });
    
    // Get all roles
    console.log('\nGetting all roles...');
    const roles = await permissionService.getAllRoles();
    
    console.log(`Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`- ${role.name} (${role.id}): ${role.description}`);
      console.log(`  Permissions: ${role.permissions.join(', ')}`);
    });
    
    // Get all permissions
    console.log('\nGetting all permissions...');
    const permissions = await permissionService.getAllPermissions();
    
    console.log(`Found ${permissions.length} permissions:`);
    permissions.slice(0, 5).forEach(permission => {
      console.log(`- ${permission.name} (${permission.id}): ${permission.description}`);
      console.log(`  Resource: ${permission.resource}, Action: ${permission.action}`);
      if (permission.conditions) {
        console.log(`  Conditions: ${JSON.stringify(permission.conditions)}`);
      }
    });
    
    if (permissions.length > 5) {
      console.log(`  ... and ${permissions.length - 5} more`);
    }
    
    // Get user roles and permissions
    console.log('\nGetting user roles and permissions...');
    
    // Admin user
    const adminRoles = await permissionService.getUserRoles('1');
    const adminPermissions = await permissionService.getUserPermissions('1');
    
    console.log('Admin user:');
    console.log(`- Roles: ${adminRoles.map(r => r.name).join(', ')}`);
    console.log(`- Permissions: ${adminPermissions.length} permissions`);
    
    // Regular user
    const userRoles = await permissionService.getUserRoles('2');
    const userPermissions = await permissionService.getUserPermissions('2');
    
    console.log('Regular user:');
    console.log(`- Roles: ${userRoles.map(r => r.name).join(', ')}`);
    console.log(`- Permissions: ${userPermissions.length} permissions`);
    
    // Check permissions
    console.log('\nChecking permissions...');
    
    // Define some permission requests
    const permissionRequests: PermissionRequest[] = [
      {
        userId: '1', // Admin user
        resource: 'user',
        action: 'read',
      },
      {
        userId: '2', // Regular user
        resource: 'conversation',
        action: 'create',
      },
      {
        userId: '2', // Regular user
        resource: 'conversation',
        action: 'update',
        context: {
          userId: '2',
          ownerId: '2', // User is the owner
        },
      },
      {
        userId: '2', // Regular user
        resource: 'conversation',
        action: 'update',
        context: {
          userId: '2',
          ownerId: '3', // User is not the owner
        },
      },
      {
        userId: '2', // Regular user
        resource: 'role',
        action: 'create',
      },
    ];
    
    // Check each permission request
    for (const request of permissionRequests) {
      const response = await permissionService.checkPermission(request);
      
      console.log(`User ${request.userId} ${response.allowed ? 'CAN' : 'CANNOT'} ${request.action} ${request.resource}`);
      if (!response.allowed && response.reason) {
        console.log(`  Reason: ${response.reason}`);
      }
      if (response.conditions) {
        console.log(`  Conditions: ${JSON.stringify(response.conditions)}`);
      }
    }
    
    // Create a new role
    console.log('\nCreating a new role...');
    
    const newRole = await permissionService.createRole({
      name: 'Editor',
      description: 'Can edit but not delete content',
      permissions: [
        'user:read',
        'conversation:read',
        'conversation:update',
        'message:read',
        'message:create',
      ],
    });
    
    console.log(`Created role: ${newRole.name} (${newRole.id})`);
    
    // Create a new permission
    console.log('\nCreating a new permission...');
    
    const newPermission = await permissionService.createPermission({
      name: 'Export Conversation',
      description: 'Export a conversation to a file',
      resource: 'conversation',
      action: 'export',
      conditions: {
        isOwner: true,
      },
    });
    
    console.log(`Created permission: ${newPermission.name} (${newPermission.id})`);
    
    // Add the new permission to the new role
    console.log('\nAdding the new permission to the new role...');
    
    const updatedRole = await permissionService.updateRole(newRole.id, {
      permissions: [...newRole.permissions, newPermission.id],
    });
    
    console.log(`Updated role: ${updatedRole.name} (${updatedRole.id})`);
    console.log(`Permissions: ${updatedRole.permissions.join(', ')}`);
    
    // Assign the new role to a user
    console.log('\nAssigning the new role to a user...');
    
    await permissionService.addRoleToUser('2', newRole.id);
    
    const updatedUserRoles = await permissionService.getUserRoles('2');
    console.log(`User roles: ${updatedUserRoles.map(r => r.name).join(', ')}`);
    
    // Check the new permission
    console.log('\nChecking the new permission...');
    
    const exportPermissionRequest: PermissionRequest = {
      userId: '2',
      resource: 'conversation',
      action: 'export',
      context: {
        userId: '2',
        ownerId: '2', // User is the owner
      },
    };
    
    const exportPermissionResponse = await permissionService.checkPermission(exportPermissionRequest);
    
    console.log(`User 2 ${exportPermissionResponse.allowed ? 'CAN' : 'CANNOT'} export conversation`);
    if (!exportPermissionResponse.allowed && exportPermissionResponse.reason) {
      console.log(`  Reason: ${exportPermissionResponse.reason}`);
    }
    
    console.log('\nPermission example completed successfully');
  } catch (error) {
    console.error('Error in permission example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runPermissionExample();
}

export default runPermissionExample;