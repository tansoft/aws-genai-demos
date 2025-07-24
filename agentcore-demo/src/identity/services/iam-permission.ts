/**
 * IAM permission manager for AWS AgentCore
 * This implementation integrates with AWS IAM for permission management
 */
import { 
  IAMClient, 
  SimulatePrincipalPolicyCommand,
  ListRolePoliciesCommand,
  GetRolePolicyCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  PutRolePolicyCommand,
  GetRoleCommand,
  ListRolesCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
  TagRoleCommand
} from '@aws-sdk/client-iam';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common';
import { 
  Permission, 
  PermissionManager, 
  PermissionRequest, 
  PermissionResponse, 
  Role 
} from '../models';

/**
 * Configuration for IAM permission manager
 */
export interface IAMPermissionConfig {
  region?: string;
  endpoint?: string;
  rolePrefix?: string;
  policyPrefix?: string;
  userRoleMapping?: Record<string, string[]>; // Local mapping of user IDs to IAM role ARNs
}

/**
 * IAM permission manager implementation
 */
export class IAMPermissionManager implements PermissionManager {
  private client: IAMClient;
  private config: IAMPermissionConfig;
  private userRoleMapping: Map<string, Set<string>>; // User ID -> Role IDs
  private roleCache: Map<string, Role>; // Role ID -> Role
  private permissionCache: Map<string, Permission>; // Permission ID -> Permission
  
  constructor(config: IAMPermissionConfig = {}) {
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      endpoint: config.endpoint,
      rolePrefix: config.rolePrefix || 'AgentCore-',
      policyPrefix: config.policyPrefix || 'AgentCorePolicy-',
      userRoleMapping: config.userRoleMapping || {},
    };
    
    this.client = new IAMClient({
      region: this.config.region,
      endpoint: this.config.endpoint,
    });
    
    this.userRoleMapping = new Map();
    this.roleCache = new Map();
    this.permissionCache = new Map();
    
    // Initialize user role mapping
    if (this.config.userRoleMapping) {
      for (const [userId, roleIds] of Object.entries(this.config.userRoleMapping)) {
        this.userRoleMapping.set(userId, new Set(roleIds));
      }
    }
    
    logger.info('IAM permission manager initialized', {
      region: this.config.region,
      rolePrefix: this.config.rolePrefix,
      policyPrefix: this.config.policyPrefix,
    });
  }
  
  /**
   * Convert an IAM policy document to a Permission object
   * @param policyDocument The IAM policy document
   * @param policyName The policy name
   */
  private policyToPermission(policyDocument: any, policyName: string): Permission[] {
    try {
      const permissions: Permission[] = [];
      
      if (!policyDocument || !policyDocument.Statement) {
        return permissions;
      }
      
      // Process each statement in the policy
      for (const statement of policyDocument.Statement) {
        // Skip deny statements
        if (statement.Effect !== 'Allow') {
          continue;
        }
        
        // Get resources
        const resources = Array.isArray(statement.Resource) 
          ? statement.Resource 
          : [statement.Resource];
        
        // Get actions
        const actions = Array.isArray(statement.Action) 
          ? statement.Action 
          : [statement.Action];
        
        // Create a permission for each resource-action pair
        for (const resource of resources) {
          for (const action of actions) {
            // Extract resource type from ARN or use as is
            let resourceType = resource;
            if (resource.includes(':')) {
              const parts = resource.split(':');
              resourceType = parts[parts.length - 1];
              
              // Remove any path or ID
              if (resourceType.includes('/')) {
                resourceType = resourceType.split('/')[0];
              }
            }
            
            // Extract action type from service:action format
            let actionType = action;
            if (action.includes(':')) {
              actionType = action.split(':')[1];
            }
            
            // Create a unique ID for the permission
            const id = `${policyName}-${resourceType}-${actionType}`;
            
            // Create the permission
            const permission: Permission = {
              id,
              name: `${resourceType}:${actionType}`,
              description: `Permission to ${actionType} on ${resourceType}`,
              resource: resourceType,
              action: actionType,
              conditions: statement.Condition,
            };
            
            permissions.push(permission);
            
            // Cache the permission
            this.permissionCache.set(id, permission);
          }
        }
      }
      
      return permissions;
    } catch (error) {
      logger.error('Error converting policy to permission', { error });
      return [];
    }
  }
  
  /**
   * Convert a Permission object to an IAM policy statement
   * @param permission The permission
   */
  private permissionToPolicyStatement(permission: Permission): any {
    try {
      // Create the statement
      const statement: any = {
        Effect: 'Allow',
        Resource: permission.resource === '*' 
          ? '*' 
          : `arn:aws:${permission.resource}:*:*:*`,
        Action: permission.action === '*' 
          ? '*' 
          : `${permission.resource}:${permission.action}`,
      };
      
      // Add conditions if any
      if (permission.conditions && Object.keys(permission.conditions).length > 0) {
        statement.Condition = permission.conditions;
      }
      
      return statement;
    } catch (error) {
      logger.error('Error converting permission to policy statement', { error });
      throw error;
    }
  }
  
  /**
   * Create an IAM policy document from permissions
   * @param permissions The permissions
   */
  private createPolicyDocument(permissions: Permission[]): any {
    try {
      // Create statements for each permission
      const statements = permissions.map(permission => 
        this.permissionToPolicyStatement(permission)
      );
      
      // Create the policy document
      return {
        Version: '2012-10-17',
        Statement: statements,
      };
    } catch (error) {
      logger.error('Error creating policy document', { error });
      throw error;
    }
  }
  
  /**
   * Get IAM role name from role ID
   * @param roleId The role ID
   */
  private getRoleName(roleId: string): string {
    return `${this.config.rolePrefix}${roleId}`;
  }
  
  /**
   * Get IAM policy name from role ID
   * @param roleId The role ID
   */
  private getPolicyName(roleId: string): string {
    return `${this.config.policyPrefix}${roleId}`;
  }
  
  /**
   * Extract role ID from IAM role name
   * @param roleName The IAM role name
   */
  private extractRoleId(roleName: string): string {
    if (roleName.startsWith(this.config.rolePrefix!)) {
      return roleName.substring(this.config.rolePrefix!.length);
    }
    return roleName;
  }
  
  /**
   * Extract policy ID from IAM policy name
   * @param policyName The IAM policy name
   */
  private extractPolicyId(policyName: string): string {
    if (policyName.startsWith(this.config.policyPrefix!)) {
      return policyName.substring(this.config.policyPrefix!.length);
    }
    return policyName;
  }
  
  /**
   * Convert an IAM role to a Role object
   * @param iamRole The IAM role
   * @param permissions The permissions for the role
   */
  private async iamRoleToRole(iamRole: any): Promise<Role> {
    try {
      const roleId = this.extractRoleId(iamRole.RoleName);
      
      // Get inline policies for the role
      const listPoliciesResponse = await this.client.send(
        new ListRolePoliciesCommand({
          RoleName: iamRole.RoleName,
        })
      );
      
      const policyNames = listPoliciesResponse.PolicyNames || [];
      const permissionIds: string[] = [];
      
      // Get each policy and extract permissions
      for (const policyName of policyNames) {
        const getPolicyResponse = await this.client.send(
          new GetRolePolicyCommand({
            RoleName: iamRole.RoleName,
            PolicyName: policyName,
          })
        );
        
        // Parse the policy document
        const policyDocument = JSON.parse(decodeURIComponent(getPolicyResponse.PolicyDocument!));
        
        // Convert policy to permissions
        const permissions = this.policyToPermission(policyDocument, policyName);
        
        // Add permission IDs
        for (const permission of permissions) {
          permissionIds.push(permission.id);
        }
      }
      
      // Create the role
      const role: Role = {
        id: roleId,
        name: iamRole.RoleName,
        description: iamRole.Description || '',
        permissions: permissionIds,
        createdAt: iamRole.CreateDate?.toISOString() || new Date().toISOString(),
        updatedAt: iamRole.UpdateDate?.toISOString() || new Date().toISOString(),
      };
      
      // Cache the role
      this.roleCache.set(roleId, role);
      
      return role;
    } catch (error) {
      logger.error('Error converting IAM role to role', { error });
      throw error;
    }
  }
  
  async checkPermission(request: PermissionRequest): Promise<PermissionResponse> {
    try {
      logger.debug('Checking permission with IAM', { request });
      
      const { userId, resource, action, context } = request;
      
      // Get user roles
      const userRoleIds = this.userRoleMapping.get(userId);
      
      if (!userRoleIds || userRoleIds.size === 0) {
        return {
          allowed: false,
          reason: 'User has no roles',
        };
      }
      
      // Convert to IAM role ARNs
      const roleNames = Array.from(userRoleIds).map(roleId => this.getRoleName(roleId));
      
      // Create the action string
      const actionString = `${resource}:${action}`;
      
      // Simulate the policy
      const command = new SimulatePrincipalPolicyCommand({
        PolicySourceArns: roleNames.map(roleName => `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${roleName}`),
        ActionNames: [actionString],
        ResourceArns: [`arn:aws:${resource}:${this.config.region}:${process.env.AWS_ACCOUNT_ID}:*`],
        ContextEntries: context ? Object.entries(context).map(([key, value]) => ({
          ContextKeyName: key,
          ContextKeyValues: [value.toString()],
          ContextKeyType: typeof value === 'boolean' ? 'boolean' : 'string',
        })) : undefined,
      });
      
      const response = await this.client.send(command);
      
      // Check the evaluation results
      const evaluationResults = response.EvaluationResults || [];
      
      if (evaluationResults.length === 0) {
        return {
          allowed: false,
          reason: 'No evaluation results',
        };
      }
      
      // Check if any evaluation allows the action
      for (const result of evaluationResults) {
        if (result.EvalDecision === 'allowed') {
          return {
            allowed: true,
          };
        }
      }
      
      // No permission found
      return {
        allowed: false,
        reason: 'No matching permission found',
      };
    } catch (error) {
      logger.error('Error checking permission with IAM', { error });
      
      return {
        allowed: false,
        reason: 'Error checking permission',
      };
    }
  }
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Get user roles
      const roles = await this.getUserRoles(userId);
      
      // Get permissions from roles
      const permissionIds = new Set<string>();
      const permissions: Permission[] = [];
      
      for (const role of roles) {
        for (const permissionId of role.permissions) {
          if (!permissionIds.has(permissionId)) {
            permissionIds.add(permissionId);
            
            // Get the permission from cache or create it
            const permission = this.permissionCache.get(permissionId) || {
              id: permissionId,
              name: permissionId,
              description: '',
              resource: '',
              action: '',
            };
            
            permissions.push(permission);
          }
        }
      }
      
      return permissions;
    } catch (error) {
      logger.error('Error getting user permissions from IAM', { error });
      return [];
    }
  }
  
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      // Get user role IDs
      const userRoleIds = this.userRoleMapping.get(userId);
      
      if (!userRoleIds || userRoleIds.size === 0) {
        return [];
      }
      
      // Get roles from IAM
      const roles: Role[] = [];
      
      for (const roleId of userRoleIds) {
        try {
          // Check if role is in cache
          if (this.roleCache.has(roleId)) {
            roles.push(this.roleCache.get(roleId)!);
            continue;
          }
          
          // Get the role from IAM
          const roleName = this.getRoleName(roleId);
          
          const response = await this.client.send(
            new GetRoleCommand({
              RoleName: roleName,
            })
          );
          
          if (response.Role) {
            const role = await this.iamRoleToRole(response.Role);
            roles.push(role);
          }
        } catch (error) {
          logger.error('Error getting role from IAM', { error, roleId });
        }
      }
      
      return roles;
    } catch (error) {
      logger.error('Error getting user roles from IAM', { error });
      return [];
    }
  }
  
  async addRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      // Check if the role exists in IAM
      const roleName = this.getRoleName(roleId);
      
      await this.client.send(
        new GetRoleCommand({
          RoleName: roleName,
        })
      );
      
      // Add the role to the user
      if (!this.userRoleMapping.has(userId)) {
        this.userRoleMapping.set(userId, new Set());
      }
      
      this.userRoleMapping.get(userId)!.add(roleId);
      
      logger.debug('Added role to user in IAM permission manager', { userId, roleId });
    } catch (error) {
      logger.error('Error adding role to user in IAM permission manager', { error });
      throw error;
    }
  }
  
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      // Check if the user has roles
      if (!this.userRoleMapping.has(userId)) {
        return;
      }
      
      // Remove the role from the user
      this.userRoleMapping.get(userId)!.delete(roleId);
      
      logger.debug('Removed role from user in IAM permission manager', { userId, roleId });
    } catch (error) {
      logger.error('Error removing role from user in IAM permission manager', { error });
      throw error;
    }
  }
  
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const now = new Date().toISOString();
      const roleId = uuidv4();
      const roleName = this.getRoleName(roleId);
      const policyName = this.getPolicyName(roleId);
      
      // Create the role in IAM
      const createRoleResponse = await this.client.send(
        new CreateRoleCommand({
          RoleName: roleName,
          Description: role.description,
          AssumeRolePolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: 'lambda.amazonaws.com',
                },
                Action: 'sts:AssumeRole',
              },
            ],
          }),
          Tags: [
            {
              Key: 'Name',
              Value: role.name,
            },
            {
              Key: 'Description',
              Value: role.description,
            },
            {
              Key: 'CreatedAt',
              Value: now,
            },
          ],
        })
      );
      
      // Get permissions for the role
      const permissions: Permission[] = [];
      
      for (const permissionId of role.permissions) {
        const permission = this.permissionCache.get(permissionId);
        
        if (permission) {
          permissions.push(permission);
        }
      }
      
      // Create policy document
      const policyDocument = this.createPolicyDocument(permissions);
      
      // Attach policy to role
      await this.client.send(
        new PutRolePolicyCommand({
          RoleName: roleName,
          PolicyName: policyName,
          PolicyDocument: JSON.stringify(policyDocument),
        })
      );
      
      // Create the role object
      const newRole: Role = {
        id: roleId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        createdAt: now,
        updatedAt: now,
      };
      
      // Cache the role
      this.roleCache.set(roleId, newRole);
      
      logger.debug('Created role in IAM', { roleId, roleName });
      
      return newRole;
    } catch (error) {
      logger.error('Error creating role in IAM', { error });
      throw error;
    }
  }
  
  async updateRole(roleId: string, role: Partial<Role>): Promise<Role> {
    try {
      // Check if the role exists
      const existingRole = await this.getRole(roleId);
      
      if (!existingRole) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      const roleName = this.getRoleName(roleId);
      const policyName = this.getPolicyName(roleId);
      const now = new Date().toISOString();
      
      // Update role tags if name or description changed
      if (role.name || role.description) {
        await this.client.send(
          new TagRoleCommand({
            RoleName: roleName,
            Tags: [
              ...(role.name ? [{
                Key: 'Name',
                Value: role.name,
              }] : []),
              ...(role.description ? [{
                Key: 'Description',
                Value: role.description,
              }] : []),
              {
                Key: 'UpdatedAt',
                Value: now,
              },
            ],
          })
        );
      }
      
      // Update permissions if changed
      if (role.permissions) {
        // Get permissions for the role
        const permissions: Permission[] = [];
        
        for (const permissionId of role.permissions) {
          const permission = this.permissionCache.get(permissionId);
          
          if (permission) {
            permissions.push(permission);
          }
        }
        
        // Create policy document
        const policyDocument = this.createPolicyDocument(permissions);
        
        // Update policy
        await this.client.send(
          new PutRolePolicyCommand({
            RoleName: roleName,
            PolicyName: policyName,
            PolicyDocument: JSON.stringify(policyDocument),
          })
        );
      }
      
      // Update the role object
      const updatedRole: Role = {
        ...existingRole,
        ...role,
        id: existingRole.id, // Ensure ID doesn't change
        updatedAt: now,
      };
      
      // Cache the updated role
      this.roleCache.set(roleId, updatedRole);
      
      logger.debug('Updated role in IAM', { roleId, roleName });
      
      return updatedRole;
    } catch (error) {
      logger.error('Error updating role in IAM', { error });
      throw error;
    }
  }
  
  async deleteRole(roleId: string): Promise<void> {
    try {
      const roleName = this.getRoleName(roleId);
      
      // Delete the role from IAM
      await this.client.send(
        new DeleteRoleCommand({
          RoleName: roleName,
        })
      );
      
      // Remove the role from cache
      this.roleCache.delete(roleId);
      
      // Remove the role from all users
      for (const [userId, userRoleIds] of this.userRoleMapping.entries()) {
        userRoleIds.delete(roleId);
      }
      
      logger.debug('Deleted role from IAM', { roleId, roleName });
    } catch (error) {
      logger.error('Error deleting role from IAM', { error });
      throw error;
    }
  }
  
  async getRole(roleId: string): Promise<Role | null> {
    try {
      // Check if role is in cache
      if (this.roleCache.has(roleId)) {
        return this.roleCache.get(roleId)!;
      }
      
      // Get the role from IAM
      const roleName = this.getRoleName(roleId);
      
      const response = await this.client.send(
        new GetRoleCommand({
          RoleName: roleName,
        })
      );
      
      if (response.Role) {
        return this.iamRoleToRole(response.Role);
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting role from IAM', { error });
      return null;
    }
  }
  
  async getAllRoles(): Promise<Role[]> {
    try {
      // Get all roles from IAM with the prefix
      const response = await this.client.send(
        new ListRolesCommand({
          PathPrefix: '/',
        })
      );
      
      const roles: Role[] = [];
      
      // Filter roles by prefix
      const iamRoles = (response.Roles || []).filter(
        role => role.RoleName.startsWith(this.config.rolePrefix!)
      );
      
      // Convert IAM roles to Role objects
      for (const iamRole of iamRoles) {
        try {
          const role = await this.iamRoleToRole(iamRole);
          roles.push(role);
        } catch (error) {
          logger.error('Error converting IAM role', { error });
        }
      }
      
      return roles;
    } catch (error) {
      logger.error('Error getting all roles from IAM', { error });
      return [];
    }
  }
  
  async createPermission(permission: Omit<Permission, 'id'>): Promise<Permission> {
    try {
      // Create a unique ID for the permission
      const id = uuidv4();
      
      // Create the permission
      const newPermission: Permission = {
        id,
        ...permission,
      };
      
      // Cache the permission
      this.permissionCache.set(id, newPermission);
      
      logger.debug('Created permission in IAM permission manager', { permissionId: id });
      
      return newPermission;
    } catch (error) {
      logger.error('Error creating permission in IAM permission manager', { error });
      throw error;
    }
  }
  
  async updatePermission(permissionId: string, permission: Partial<Permission>): Promise<Permission> {
    try {
      // Check if the permission exists
      const existingPermission = this.permissionCache.get(permissionId);
      
      if (!existingPermission) {
        throw new Error(`Permission not found: ${permissionId}`);
      }
      
      // Update the permission
      const updatedPermission: Permission = {
        ...existingPermission,
        ...permission,
        id: existingPermission.id, // Ensure ID doesn't change
      };
      
      // Cache the updated permission
      this.permissionCache.set(permissionId, updatedPermission);
      
      logger.debug('Updated permission in IAM permission manager', { permissionId });
      
      return updatedPermission;
    } catch (error) {
      logger.error('Error updating permission in IAM permission manager', { error });
      throw error;
    }
  }
  
  async deletePermission(permissionId: string): Promise<void> {
    try {
      // Check if the permission exists
      if (!this.permissionCache.has(permissionId)) {
        return;
      }
      
      // Remove the permission from cache
      this.permissionCache.delete(permissionId);
      
      logger.debug('Deleted permission from IAM permission manager', { permissionId });
    } catch (error) {
      logger.error('Error deleting permission from IAM permission manager', { error });
      throw error;
    }
  }
  
  async getPermission(permissionId: string): Promise<Permission | null> {
    return this.permissionCache.get(permissionId) || null;
  }
  
  async getAllPermissions(): Promise<Permission[]> {
    return Array.from(this.permissionCache.values());
  }
}
</content>