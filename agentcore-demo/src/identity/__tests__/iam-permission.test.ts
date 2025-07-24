/**
 * Tests for IAM permission manager
 */
import { IAMClient } from '@aws-sdk/client-iam';
import { mockClient } from 'aws-sdk-client-mock';
import { IAMPermissionManager } from '../services/iam-permission';
import { Permission, PermissionRequest, Role } from '../models';

// Mock AWS SDK
const iamMock = mockClient(IAMClient);

describe('IAM Permission Manager', () => {
  beforeEach(() => {
    iamMock.reset();
  });
  
  it('should initialize with default config', () => {
    const manager = new IAMPermissionManager();
    expect(manager).toBeDefined();
  });
  
  it('should initialize with custom config', () => {
    const manager = new IAMPermissionManager({
      region: 'us-west-2',
      rolePrefix: 'TestRole-',
      policyPrefix: 'TestPolicy-',
      userRoleMapping: {
        'user1': ['role1', 'role2'],
      },
    });
    expect(manager).toBeDefined();
  });
  
  it('should create a permission', async () => {
    const manager = new IAMPermissionManager();
    
    const permission = await manager.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'dynamodb',
      action: 'GetItem',
    });
    
    expect(permission).toBeDefined();
    expect(permission.id).toBeDefined();
    expect(permission.name).toBe('Test Permission');
    expect(permission.resource).toBe('dynamodb');
    expect(permission.action).toBe('GetItem');
  });
  
  it('should get a permission by ID', async () => {
    const manager = new IAMPermissionManager();
    
    const permission = await manager.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'dynamodb',
      action: 'GetItem',
    });
    
    const retrievedPermission = await manager.getPermission(permission.id);
    
    expect(retrievedPermission).toBeDefined();
    expect(retrievedPermission!.id).toBe(permission.id);
    expect(retrievedPermission!.name).toBe(permission.name);
  });
  
  it('should update a permission', async () => {
    const manager = new IAMPermissionManager();
    
    const permission = await manager.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'dynamodb',
      action: 'GetItem',
    });
    
    const updatedPermission = await manager.updatePermission(permission.id, {
      name: 'Updated Permission',
      description: 'Updated description',
    });
    
    expect(updatedPermission).toBeDefined();
    expect(updatedPermission.id).toBe(permission.id);
    expect(updatedPermission.name).toBe('Updated Permission');
    expect(updatedPermission.description).toBe('Updated description');
    expect(updatedPermission.resource).toBe('dynamodb');
    expect(updatedPermission.action).toBe('GetItem');
  });
  
  it('should delete a permission', async () => {
    const manager = new IAMPermissionManager();
    
    const permission = await manager.createPermission({
      name: 'Test Permission',
      description: 'Test permission description',
      resource: 'dynamodb',
      action: 'GetItem',
    });
    
    await manager.deletePermission(permission.id);
    
    const retrievedPermission = await manager.getPermission(permission.id);
    expect(retrievedPermission).toBeNull();
  });
  
  it('should add a role to a user', async () => {
    // Mock the GetRoleCommand
    iamMock.on('GetRole').resolves({
      Role: {
        RoleName: 'AgentCore-role1',
        Description: 'Test role',
        AssumeRolePolicyDocument: '{}',
        CreateDate: new Date(),
      },
    });
    
    // Mock the ListRolePoliciesCommand
    iamMock.on('ListRolePolicies').resolves({
      PolicyNames: [],
    });
    
    const manager = new IAMPermissionManager();
    
    await manager.addRoleToUser('user1', 'role1');
    
    const roles = await manager.getUserRoles('user1');
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe('role1');
  });
  
  it('should remove a role from a user', async () => {
    // Mock the GetRoleCommand
    iamMock.on('GetRole').resolves({
      Role: {
        RoleName: 'AgentCore-role1',
        Description: 'Test role',
        AssumeRolePolicyDocument: '{}',
        CreateDate: new Date(),
      },
    });
    
    // Mock the ListRolePoliciesCommand
    iamMock.on('ListRolePolicies').resolves({
      PolicyNames: [],
    });
    
    const manager = new IAMPermissionManager({
      userRoleMapping: {
        'user1': ['role1'],
      },
    });
    
    await manager.removeRoleFromUser('user1', 'role1');
    
    const roles = await manager.getUserRoles('user1');
    expect(roles).toHaveLength(0);
  });
  
  it('should check permissions', async () => {
    // Mock the SimulatePrincipalPolicyCommand
    iamMock.on('SimulatePrincipalPolicy').resolves({
      EvaluationResults: [
        {
          EvalActionName: 'dynamodb:GetItem',
          EvalDecision: 'allowed',
          EvalResourceName: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable',
        },
      ],
    });
    
    const manager = new IAMPermissionManager({
      userRoleMapping: {
        'user1': ['role1'],
      },
    });
    
    const request: PermissionRequest = {
      userId: 'user1',
      resource: 'dynamodb',
      action: 'GetItem',
      context: {
        tableName: 'TestTable',
      },
    };
    
    const response = await manager.checkPermission(request);
    
    expect(response).toBeDefined();
    expect(response.allowed).toBe(true);
  });
  
  it('should deny permissions when no matching policy', async () => {
    // Mock the SimulatePrincipalPolicyCommand
    iamMock.on('SimulatePrincipalPolicy').resolves({
      EvaluationResults: [
        {
          EvalActionName: 'dynamodb:PutItem',
          EvalDecision: 'implicitDeny',
          EvalResourceName: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable',
        },
      ],
    });
    
    const manager = new IAMPermissionManager({
      userRoleMapping: {
        'user1': ['role1'],
      },
    });
    
    const request: PermissionRequest = {
      userId: 'user1',
      resource: 'dynamodb',
      action: 'PutItem',
      context: {
        tableName: 'TestTable',
      },
    };
    
    const response = await manager.checkPermission(request);
    
    expect(response).toBeDefined();
    expect(response.allowed).toBe(false);
  });
});
</content>