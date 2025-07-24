/**
 * Local permission manager for AWS AgentCore
 * This is for testing purposes only and should not be used in production
 */
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
 * Configuration for local permission manager
 */
export interface LocalPermissionConfig {
  roles?: Role[];
  permissions?: Permission[];
  userRoles?: Record<string, string[]>; // User ID -> Role IDs
}

/**
 * Local permission manager implementation
 */
export class LocalPermissionManager implements PermissionManager {
  private roles: Map<string, Role>;
  private permissions: Map<string, Permission>;
  private userRoles: Map<string, Set<string>>; // User ID -> Role IDs
  
  constructor(config: LocalPermissionConfig = {}) {
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    
    // Add default permissions if provided
    if (config.permissions) {
      for (const permission of config.permissions) {
        this.permissions.set(permission.id, permission);
      }
    }
    
    // Add default roles if provided
    if (config.roles) {
      for (const role of config.roles) {
        this.roles.set(role.id, role);
      }
    }
    
    // Add default user roles if provided
    if (config.userRoles) {
      for (const [userId, roleIds] of Object.entries(config.userRoles)) {
        this.userRoles.set(userId, new Set(roleIds));
      }
    }
    
    // Add default permissions
    this.addDefaultPermissions();
    
    // Add default roles
    this.addDefaultRoles();
    
    logger.info('Local permission manager initialized', {
      permissionCount: this.permissions.size,
      roleCount: this.roles.size,
      userRoleCount: this.userRoles.size,
    });
  }
  
  /**
   * Add default permissions
   */
  private addDefaultPermissions(): void {
    // Admin permissions
    this.addPermissionIfNotExists({
      id: 'admin:*',
      name: 'Admin All',
      description: 'Admin permission for all resources and actions',
      resource: '*',
      action: '*',
    });
    
    // User permissions
    this.addPermissionIfNotExists({
      id: 'user:read',
      name: 'Read User',
      description: 'Read user information',
      resource: 'user',
      action: 'read',
    });
    
    this.addPermissionIfNotExists({
      id: 'user:update',
      name: 'Update User',
      description: 'Update user information',
      resource: 'user',
      action: 'update',
      conditions: {
        isOwner: true,
      },
    });
    
    // Conversation permissions
    this.addPermissionIfNotExists({
      id: 'conversation:create',
      name: 'Create Conversation',
      description: 'Create a new conversation',
      resource: 'conversation',
      action: 'create',
    });
    
    this.addPermissionIfNotExists({
      id: 'conversation:read',
      name: 'Read Conversation',
      description: 'Read conversation information',
      resource: 'conversation',
      action: 'read',
      conditions: {
        isOwner: true,
      },
    });
    
    this.addPermissionIfNotExists({
      id: 'conversation:update',
      name: 'Update Conversation',
      description: 'Update conversation information',
      resource: 'conversation',
      action: 'update',
      conditions: {
        isOwner: true,
      },
    });
    
    this.addPermissionIfNotExists({
      id: 'conversation:delete',
      name: 'Delete Conversation',
      description: 'Delete a conversation',
      resource: 'conversation',
      action: 'delete',
      conditions: {
        isOwner: true,
      },
    });
    
    // Message permissions
    this.addPermissionIfNotExists({
      id: 'message:create',
      name: 'Create Message',
      description: 'Create a new message',
      resource: 'message',
      action: 'create',
      conditions: {
        isConversationOwner: true,
      },
    });
    
    this.addPermissionIfNotExists({
      id: 'message:read',
      name: 'Read Message',
      description: 'Read message information',
      resource: 'message',
      action: 'read',
      conditions: {
        isConversationOwner: true,
      },
    });
    
    // Memory item permissions
    this.addPermissionIfNotExists({
      id: 'memory:create',
      name: 'Create Memory Item',
      description: 'Create a new memory item',
      resource: 'memory_item',
      action: 'create',
    });
    
    this.addPermissionIfNotExists({
      id: 'memory:read',
      name: 'Read Memory Item',
      description: 'Read memory item information',
      resource: 'memory_item',
      action: 'read',
      conditions: {
        isOwner: true,
      },
    });
    
    // Tool permissions
    this.addPermissionIfNotExists({
      id: 'tool:execute',
      name: 'Execute Tool',
      description: 'Execute a tool',
      resource: 'tool',
      action: 'execute',
    });
  }
  
  /**
   * Add default roles
   */
  private addDefaultRoles(): void {
    // Admin role
    this.addRoleIfNotExists({
      id: 'admin',
      name: 'Admin',
      description: 'Administrator role with all permissions',
      permissions: ['admin:*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // User role
    this.addRoleIfNotExists({
      id: 'user',
      name: 'User',
      description: 'Regular user role',
      permissions: [
        'user:read',
        'user:update',
        'conversation:create',
        'conversation:read',
        'conversation:update',
        'conversation:delete',
        'message:create',
        'message:read',
        'memory:create',
        'memory:read',
        'tool:execute',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Guest role
    this.addRoleIfNotExists({
      id: 'guest',
      name: 'Guest',
      description: 'Guest role with limited permissions',
      permissions: [
        'user:read',
        'conversation:read',
        'message:read',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Add admin role to user ID 1
    this.addRoleToUserIfNotExists('1', 'admin');
    
    // Add user role to user ID 2
    this.addRoleToUserIfNotExists('2', 'user');
  }
  
  /**
   * Add a permission if it doesn't exist
   * @param permission The permission to add
   */
  private addPermissionIfNotExists(permission: Permission): void {
    if (!this.permissions.has(permission.id)) {
      this.permissions.set(permission.id, permission);
    }
  }
  
  /**
   * Add a role if it doesn't exist
   * @param role The role to add
   */
  private addRoleIfNotExists(role: Role): void {
    if (!this.roles.has(role.id)) {
      this.roles.set(role.id, role);
    }
  }
  
  /**
   * Add a role to a user if it doesn't exist
   * @param userId The user ID
   * @param roleId The role ID
   */
  private addRoleToUserIfNotExists(userId: string, roleId: string): void {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    
    this.userRoles.get(userId)!.add(roleId);
  }
  
  /**
   * Check if a condition is met
   * @param condition The condition to check
   * @param context The context for the condition
   */
  private checkCondition(condition: Record<string, any>, context?: Record<string, any>): boolean {
    if (!context) {
      return false;
    }
    
    // Check if the user is the owner
    if (condition.isOwner && context.ownerId) {
      return context.userId === context.ownerId;
    }
    
    // Check if the user is the owner of the conversation
    if (condition.isConversationOwner && context.conversationOwnerId) {
      return context.userId === context.conversationOwnerId;
    }
    
    return false;
  }
  
  async checkPermission(request: PermissionRequest): Promise<PermissionResponse> {
    try {
      logger.debug('Checking permission', { request });
      
      const { userId, resource, action, context } = request;
      
      // Get user roles
      const userRoleIds = this.userRoles.get(userId);
      
      if (!userRoleIds || userRoleIds.size === 0) {
        return {
          allowed: false,
          reason: 'User has no roles',
        };
      }
      
      // Get user permissions from roles
      const userPermissions: Permission[] = [];
      
      for (const roleId of userRoleIds) {
        const role = this.roles.get(roleId);
        
        if (role) {
          for (const permissionId of role.permissions) {
            const permission = this.permissions.get(permissionId);
            
            if (permission) {
              userPermissions.push(permission);
            }
          }
        }
      }
      
      // Check if any permission allows the action on the resource
      for (const permission of userPermissions) {
        // Check if the permission applies to the resource and action
        const resourceMatches = permission.resource === '*' || permission.resource === resource;
        const actionMatches = permission.action === '*' || permission.action === action;
        
        if (resourceMatches && actionMatches) {
          // Check conditions if any
          if (permission.conditions && Object.keys(permission.conditions).length > 0) {
            if (this.checkCondition(permission.conditions, context)) {
              return {
                allowed: true,
                conditions: permission.conditions,
              };
            }
          } else {
            // No conditions, permission granted
            return {
              allowed: true,
            };
          }
        }
      }
      
      // No permission found
      return {
        allowed: false,
        reason: 'No matching permission found',
      };
    } catch (error) {
      logger.error('Error checking permission', { error });
      
      return {
        allowed: false,
        reason: 'Error checking permission',
      };
    }
  }
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoleIds = this.userRoles.get(userId);
      
      if (!userRoleIds || userRoleIds.size === 0) {
        return [];
      }
      
      const userPermissions: Permission[] = [];
      const permissionIds = new Set<string>();
      
      for (const roleId of userRoleIds) {
        const role = this.roles.get(roleId);
        
        if (role) {
          for (const permissionId of role.permissions) {
            if (!permissionIds.has(permissionId)) {
              permissionIds.add(permissionId);
              
              const permission = this.permissions.get(permissionId);
              
              if (permission) {
                userPermissions.push(permission);
              }
            }
          }
        }
      }
      
      return userPermissions;
    } catch (error) {
      logger.error('Error getting user permissions', { error });
      return [];
    }
  }
  
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const userRoleIds = this.userRoles.get(userId);
      
      if (!userRoleIds || userRoleIds.size === 0) {
        return [];
      }
      
      const userRoles: Role[] = [];
      
      for (const roleId of userRoleIds) {
        const role = this.roles.get(roleId);
        
        if (role) {
          userRoles.push(role);
        }
      }
      
      return userRoles;
    } catch (error) {
      logger.error('Error getting user roles', { error });
      return [];
    }
  }
  
  async addRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      // Check if the role exists
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      // Add the role to the user
      if (!this.userRoles.has(userId)) {
        this.userRoles.set(userId, new Set());
      }
      
      this.userRoles.get(userId)!.add(roleId);
      
      logger.debug('Added role to user', { userId, roleId });
    } catch (error) {
      logger.error('Error adding role to user', { error });
      throw error;
    }
  }
  
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      // Check if the user has roles
      if (!this.userRoles.has(userId)) {
        return;
      }
      
      // Remove the role from the user
      this.userRoles.get(userId)!.delete(roleId);
      
      logger.debug('Removed role from user', { userId, roleId });
    } catch (error) {
      logger.error('Error removing role from user', { error });
      throw error;
    }
  }
  
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const now = new Date().toISOString();
      
      const newRole: Role = {
        id: uuidv4(),
        ...role,
        createdAt: now,
        updatedAt: now,
      };
      
      this.roles.set(newRole.id, newRole);
      
      logger.debug('Created role', { roleId: newRole.id });
      
      return newRole;
    } catch (error) {
      logger.error('Error creating role', { error });
      throw error;
    }
  }
  
  async updateRole(roleId: string, role: Partial<Role>): Promise<Role> {
    try {
      // Check if the role exists
      const existingRole = this.roles.get(roleId);
      
      if (!existingRole) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      // Update the role
      const updatedRole: Role = {
        ...existingRole,
        ...role,
        id: existingRole.id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };
      
      this.roles.set(roleId, updatedRole);
      
      logger.debug('Updated role', { roleId });
      
      return updatedRole;
    } catch (error) {
      logger.error('Error updating role', { error });
      throw error;
    }
  }
  
  async deleteRole(roleId: string): Promise<void> {
    try {
      // Check if the role exists
      if (!this.roles.has(roleId)) {
        return;
      }
      
      // Remove the role
      this.roles.delete(roleId);
      
      // Remove the role from all users
      for (const [userId, userRoleIds] of this.userRoles.entries()) {
        userRoleIds.delete(roleId);
      }
      
      logger.debug('Deleted role', { roleId });
    } catch (error) {
      logger.error('Error deleting role', { error });
      throw error;
    }
  }
  
  async getRole(roleId: string): Promise<Role | null> {
    return this.roles.get(roleId) || null;
  }
  
  async getAllRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }
  
  async createPermission(permission: Omit<Permission, 'id'>): Promise<Permission> {
    try {
      const newPermission: Permission = {
        id: uuidv4(),
        ...permission,
      };
      
      this.permissions.set(newPermission.id, newPermission);
      
      logger.debug('Created permission', { permissionId: newPermission.id });
      
      return newPermission;
    } catch (error) {
      logger.error('Error creating permission', { error });
      throw error;
    }
  }
  
  async updatePermission(permissionId: string, permission: Partial<Permission>): Promise<Permission> {
    try {
      // Check if the permission exists
      const existingPermission = this.permissions.get(permissionId);
      
      if (!existingPermission) {
        throw new Error(`Permission not found: ${permissionId}`);
      }
      
      // Update the permission
      const updatedPermission: Permission = {
        ...existingPermission,
        ...permission,
        id: existingPermission.id, // Ensure ID doesn't change
      };
      
      this.permissions.set(permissionId, updatedPermission);
      
      logger.debug('Updated permission', { permissionId });
      
      return updatedPermission;
    } catch (error) {
      logger.error('Error updating permission', { error });
      throw error;
    }
  }
  
  async deletePermission(permissionId: string): Promise<void> {
    try {
      // Check if the permission exists
      if (!this.permissions.has(permissionId)) {
        return;
      }
      
      // Remove the permission
      this.permissions.delete(permissionId);
      
      // Remove the permission from all roles
      for (const role of this.roles.values()) {
        const index = role.permissions.indexOf(permissionId);
        
        if (index !== -1) {
          role.permissions.splice(index, 1);
        }
      }
      
      logger.debug('Deleted permission', { permissionId });
    } catch (error) {
      logger.error('Error deleting permission', { error });
      throw error;
    }
  }
  
  async getPermission(permissionId: string): Promise<Permission | null> {
    return this.permissions.get(permissionId) || null;
  }
  
  async getAllPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }
}