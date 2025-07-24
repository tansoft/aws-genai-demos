/**
 * Example of using the permission service with IAM integration
 */
import { config, logger } from '../../common';
import { PermissionProviderType, PermissionService } from '../services';
import { Permission, PermissionRequest, Role } from '../models';

/**
 * Run the integrated permission example
 */
async function runIntegratedPermissionExample() {
  try {
    logger.info('Starting integrated permission example...');
    
    // Determine which permission provider to use
    const useIam = config.identity.permissionProvider === 'iam' && 
                  config.identity.iam?.adminRoleArn && 
                  config.identity.iam?.userRoleArn;
    
    const providerType = useIam ? PermissionProviderType.IAM : PermissionProviderType.LOCAL;
    
    logger.info('Permission configuration', {
      permissionProvider: config.identity.permissionProvider,
      useIam,
      providerType,
    });
    
    // Initialize the permission service
    const permissionService = new PermissionService({
      providerType,
      iam: useIam ? {
        region: config.runtime.region,
        rolePrefix: 'AgentCore-',
        policyPrefix: 'AgentCorePolicy-',
        // Map user IDs to IAM role IDs
        userRoleMapping: {
          'admin': ['Admin'],
          'user': ['User'],
          'guest': ['Guest'],
        },
      } : undefined,
      local: !useIam ? {
        // Default roles and permissions are already defined in LocalPermissionManager
      } : undefined,
    });
    
    // Get all roles
    logger.info('Getting all roles...');
    const roles = await permissionService.getAllRoles();
    
    logger.info(`Found ${roles.length} roles:`, {
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        permissionCount: role.permissions.length,
      })),
    });
    
    // Get all permissions
    logger.info('Getting all permissions...');
    const permissions = await permissionService.getAllPermissions();
    
    logger.info(`Found ${permissions.length} permissions:`, {
      permissionSample: permissions.slice(0, 5).map(permission => ({
        id: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
      })),
    });
    
    // Get user roles and permissions
    logger.info('Getting user roles and permissions...');
    
    // Admin user
    const adminRoles = await permissionService.getUserRoles('admin');
    const adminPermissions = await permissionService.getUserPermissions('admin');
    
    logger.info('Admin user:', {
      roles: adminRoles.map(r => r.name),
      permissionCount: adminPermissions.length,
    });
    
    // Regular user
    const userRoles = await permissionService.getUserRoles('user');
    const userPermissions = await permissionService.getUserPermissions('user');
    
    logger.info('Regular user:', {
      roles: userRoles.map(r => r.name),
      permissionCount: userPermissions.length,
    });
    
    // Check permissions
    logger.info('Checking permissions...');
    
    // Define some permission requests
    const permissionRequests: PermissionRequest[] = [
      {
        userId: 'admin',
        resource: 'user',
        action: 'read',
      },
      {
        userId: 'user',
        resource: 'conversation',
        action: 'create',
      },
      {
        userId: 'user',
        resource: 'conversation',
        action: 'update',
        context: {
          userId: 'user',
          ownerId: 'user', // User is the owner
        },
      },
      {
        userId: 'user',
        resource: 'conversation',
        action: 'update',
        context: {
          userId: 'user',
          ownerId: 'admin', // User is not the owner
        },
      },
      {
        userId: 'guest',
        resource: 'conversation',
        action: 'create',
      },
    ];
    
    // Check each permission request
    for (const request of permissionRequests) {
      const response = await permissionService.checkPermission(request);
      
      logger.info(`User ${request.userId} ${response.allowed ? 'CAN' : 'CANNOT'} ${request.action} ${request.resource}`, {
        allowed: response.allowed,
        reason: response.reason,
        conditions: response.conditions,
      });
    }
    
    // Create a new role
    logger.info('Creating a new role...');
    
    const newRole = await permissionService.createRole({
      name: 'DataAnalyst',
      description: 'Role for data analysis operations',
      permissions: [
        'memory:read',
        'conversation:read',
      ],
    });
    
    logger.info(`Created role: ${newRole.name} (${newRole.id})`);
    
    // Create a new permission
    logger.info('Creating a new permission...');
    
    const newPermission = await permissionService.createPermission({
      name: 'Export Conversation',
      description: 'Export a conversation to a file',
      resource: 'conversation',
      action: 'export',
      conditions: {
        isOwner: true,
      },
    });
    
    logger.info(`Created permission: ${newPermission.name} (${newPermission.id})`);
    
    // Add the new permission to the new role
    logger.info('Adding the new permission to the new role...');
    
    const updatedRole = await permissionService.updateRole(newRole.id, {
      permissions: [...newRole.permissions, newPermission.id],
    });
    
    logger.info(`Updated role: ${updatedRole.name} (${updatedRole.id})`, {
      permissions: updatedRole.permissions,
    });
    
    // Assign the new role to a user
    logger.info('Assigning the new role to a user...');
    
    await permissionService.addRoleToUser('user', newRole.id);
    
    const updatedUserRoles = await permissionService.getUserRoles('user');
    logger.info(`User roles:`, {
      roles: updatedUserRoles.map(r => r.name),
    });
    
    // Check the new permission
    logger.info('Checking the new permission...');
    
    const exportPermissionRequest: PermissionRequest = {
      userId: 'user',
      resource: 'conversation',
      action: 'export',
      context: {
        userId: 'user',
        ownerId: 'user', // User is the owner
      },
    };
    
    const exportPermissionResponse = await permissionService.checkPermission(exportPermissionRequest);
    
    logger.info(`User ${exportPermissionRequest.userId} ${exportPermissionResponse.allowed ? 'CAN' : 'CANNOT'} ${exportPermissionRequest.action} ${exportPermissionRequest.resource}`, {
      allowed: exportPermissionResponse.allowed,
      reason: exportPermissionResponse.reason,
      conditions: exportPermissionResponse.conditions,
    });
    
    // Clean up
    logger.info('Cleaning up...');
    
    await permissionService.removeRoleFromUser('user', newRole.id);
    await permissionService.deleteRole(newRole.id);
    await permissionService.deletePermission(newPermission.id);
    
    logger.info('Integrated permission example completed successfully');
  } catch (error) {
    logger.error('Error in integrated permission example:', { error });
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runIntegratedPermissionExample();
}

export default runIntegratedPermissionExample;
</content>