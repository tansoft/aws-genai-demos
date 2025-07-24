/**
 * Permission models for AWS AgentCore
 */

/**
 * Permission interface
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

/**
 * Role interface
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  createdAt: string;
  updatedAt: string;
}

/**
 * Resource interface
 */
export interface Resource {
  id: string;
  type: string;
  name: string;
  ownerId?: string;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Action types
 */
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  LIST = 'list',
  ALL = '*',
}

/**
 * Resource types
 */
export enum ResourceType {
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
  MEMORY_ITEM = 'memory_item',
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  TOOL = 'tool',
  MODEL = 'model',
  ALL = '*',
}

/**
 * Permission request
 */
export interface PermissionRequest {
  userId: string;
  resource: string;
  action: string;
  context?: Record<string, any>;
}

/**
 * Permission response
 */
export interface PermissionResponse {
  allowed: boolean;
  reason?: string;
  conditions?: Record<string, any>;
}

/**
 * Permission manager interface
 */
export interface PermissionManager {
  /**
   * Check if a user has permission to perform an action on a resource
   * @param request The permission request
   */
  checkPermission(request: PermissionRequest): Promise<PermissionResponse>;
  
  /**
   * Get permissions for a user
   * @param userId The user ID
   */
  getUserPermissions(userId: string): Promise<Permission[]>;
  
  /**
   * Get roles for a user
   * @param userId The user ID
   */
  getUserRoles(userId: string): Promise<Role[]>;
  
  /**
   * Add a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  addRoleToUser(userId: string, roleId: string): Promise<void>;
  
  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   */
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  
  /**
   * Create a role
   * @param role The role to create
   */
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  
  /**
   * Update a role
   * @param roleId The role ID
   * @param role The role updates
   */
  updateRole(roleId: string, role: Partial<Role>): Promise<Role>;
  
  /**
   * Delete a role
   * @param roleId The role ID
   */
  deleteRole(roleId: string): Promise<void>;
  
  /**
   * Get a role by ID
   * @param roleId The role ID
   */
  getRole(roleId: string): Promise<Role | null>;
  
  /**
   * Get all roles
   */
  getAllRoles(): Promise<Role[]>;
  
  /**
   * Create a permission
   * @param permission The permission to create
   */
  createPermission(permission: Omit<Permission, 'id'>): Promise<Permission>;
  
  /**
   * Update a permission
   * @param permissionId The permission ID
   * @param permission The permission updates
   */
  updatePermission(permissionId: string, permission: Partial<Permission>): Promise<Permission>;
  
  /**
   * Delete a permission
   * @param permissionId The permission ID
   */
  deletePermission(permissionId: string): Promise<void>;
  
  /**
   * Get a permission by ID
   * @param permissionId The permission ID
   */
  getPermission(permissionId: string): Promise<Permission | null>;
  
  /**
   * Get all permissions
   */
  getAllPermissions(): Promise<Permission[]>;
}