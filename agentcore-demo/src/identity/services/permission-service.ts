/**
 * Permission service for AWS AgentCore
 */
import { logger } from '../../common';
import { 
  Permission, 
  PermissionManager, 
  PermissionRequest, 
  PermissionResponse, 
  Role 
} from '../models';
import { IAMPermissionManager } from './iam-permission';
import { LocalPermissionManager } from './local-permission';

/**
 * Permission provider type
 */
export enum PermissionProviderType {
  LOCAL = 'local',
  IAM = 'iam',
}

/**
 * Permission service configuration
 */
export interface PermissionServiceConfig {
  providerType: PermissionProviderType;
  local?: {
    roles?: Role[];
    permissions?: Permission[];
    userRoles?: Record<string, string[]>;
  };
  iam?: {
    region?: string;
    endpoint?: string;
    rolePrefix?: string;
    policyPrefix?: string;
    userRoleMapping?: Record<string, string[]>;
  };
}

/**
 * Permission service
 */
export class PermissionService {
  private manager: PermissionManager;
  private config: PermissionServiceConfig;
  
  constructor(config: PermissionServiceConfig) {
    this.config = config;
    
    // Create the appropriate manager
    switch (config.providerType) {
      case PermissionProviderType.LOCAL:
        this.manager = new LocalPermissionManager(config.local);
        break;
        
      case PermissionProviderType.IAM:
        this.manager = new IAMPermissionManager(config.iam);
        break;
        
      default:
        throw new Error(`Unsupported permission provider type: ${config.providerType}`);
    }
    
    logger.info('Permission service initialized', {
      providerType: config.providerType,
    });
  }
  
  /**
   * Check if a user has permission to perform an action on a resource
   * @param request The permission request
   */
  async checkPermission(request: PermissionRequest): Promise<PermissionResponse> {
    return this.manager.checkPermission(request);
  }
  
  /**
   * Get permissions for a user
   * @param userId The user ID
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    return this.manager.getUserPermissions(userId);
  }
  
  /**
   * Get roles for a user
   * @param userId The user ID
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    return this.manager.getUserRoles(userId);
  }
  
  /**
   * Add a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  async addRoleToUser(userId: string, roleId: string): Promise<void> {
    return this.manager.addRoleToUser(userId, roleId);
  }
  
  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return this.manager.removeRoleFromUser(userId, roleId);
  }
  
  /**
   * Create a role
   * @param role The role to create
   */
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    return this.manager.createRole(role);
  }
  
  /**
   * Update a role
   * @param roleId The role ID
   * @param role The role updates
   */
  async updateRole(roleId: string, role: Partial<Role>): Promise<Role> {
    return this.manager.updateRole(roleId, role);
  }
  
  /**
   * Delete a role
   * @param roleId The role ID
   */
  async deleteRole(roleId: string): Promise<void> {
    return this.manager.deleteRole(roleId);
  }
  
  /**
   * Get a role by ID
   * @param roleId The role ID
   */
  async getRole(roleId: string): Promise<Role | null> {
    return this.manager.getRole(roleId);
  }
  
  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return this.manager.getAllRoles();
  }
  
  /**
   * Create a permission
   * @param permission The permission to create
   */
  async createPermission(permission: Omit<Permission, 'id'>): Promise<Permission> {
    return this.manager.createPermission(permission);
  }
  
  /**
   * Update a permission
   * @param permissionId The permission ID
   * @param permission The permission updates
   */
  async updatePermission(permissionId: string, permission: Partial<Permission>): Promise<Permission> {
    return this.manager.updatePermission(permissionId, permission);
  }
  
  /**
   * Delete a permission
   * @param permissionId The permission ID
   */
  async deletePermission(permissionId: string): Promise<void> {
    return this.manager.deletePermission(permissionId);
  }
  
  /**
   * Get a permission by ID
   * @param permissionId The permission ID
   */
  async getPermission(permissionId: string): Promise<Permission | null> {
    return this.manager.getPermission(permissionId);
  }
  
  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.manager.getAllPermissions();
  }
  
  /**
   * Get the permission manager
   */
  getManager(): PermissionManager {
    return this.manager;
  }
}