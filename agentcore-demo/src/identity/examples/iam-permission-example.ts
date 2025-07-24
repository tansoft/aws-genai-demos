/**
 * Example of using the IAM permission manager
 */
import { PermissionProviderType, PermissionService } from '../services';
import { PermissionRequest } from '../models';

/**
 * Run the IAM permission example
 */
async function runIAMPermissionExample() {
  try {
    console.log('Starting IAM permission example...');
    
    // Initialize the permission service with IAM provider
    const permissionService = new PermissionService({
      providerType: PermissionProviderType.IAM,
      iam: {
        rolePrefix: 'AgentCore-',
        policyPrefix: 'AgentCorePolicy-',
        // Map user IDs to IAM role IDs for testing
        userRoleMapping: {
          '1': ['admin'],
          '2': ['user'],
        },
      },
    });
    
    // Create a new role
    console.log('\nCreating a new role...');
    
    const newRole = await permissionService.createRole({
      name: 'DataAnalyst',
      description: 'Role for data analysis operations',
      permissions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        's3:GetObject',
        's3:ListBucket',
      ],
    });
    
    console.log(`Created role: ${newRole.name} (${newRole.id})`);
    
    // Create a new permission
    console.log('\nCreating a new permission...');
    
    const newPermission = await permissionService.createPermission({
      name: 'InvokeDataProcessingLambda',
      description: 'Permission to invoke data processing Lambda function',
      resource: 'lambda',
      action: 'InvokeFunction',
      conditions: {
        'StringEquals': {
          'lambda:FunctionName': 'data-processing',
        },
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
    
    const userRoles = await permissionService.getUserRoles('2');
    console.log(`User roles: ${userRoles.map(r => r.name).join(', ')}`);
    
    // Check permissions
    console.log('\nChecking permissions...');
    
    const permissionRequests: PermissionRequest[] = [
      {
        userId: '2',
        resource: 'lambda',
        action: 'InvokeFunction',
        context: {
          'lambda:FunctionName': 'data-processing',
        },
      },
      {
        userId: '2',
        resource: 's3',
        action: 'GetObject',
      },
      {
        userId: '2',
        resource: 'dynamodb',
        action: 'PutItem',
      },
    ];
    
    for (const request of permissionRequests) {
      const response = await permissionService.checkPermission(request);
      
      console.log(`User ${request.userId} ${response.allowed ? 'CAN' : 'CANNOT'} ${request.action} ${request.resource}`);
      if (!response.allowed && response.reason) {
        console.log(`  Reason: ${response.reason}`);
      }
    }
    
    // Clean up
    console.log('\nCleaning up...');
    
    await permissionService.removeRoleFromUser('2', newRole.id);
    await permissionService.deleteRole(newRole.id);
    await permissionService.deletePermission(newPermission.id);
    
    console.log('\nIAM permission example completed successfully');
  } catch (error) {
    console.error('Error in IAM permission example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runIAMPermissionExample();
}

export default runIAMPermissionExample;
</content>