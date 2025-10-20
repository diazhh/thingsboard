/**
 * Copyright © 2016-2025 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.dao.role;

import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.page.PageData;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.common.data.permission.UserRole;
import org.thingsboard.server.dao.entity.EntityDaoService;

import java.util.List;

public interface RoleService extends EntityDaoService {

    /**
     * Find role by id.
     *
     * @param tenantId the tenant id
     * @param roleId the role id
     * @return the role
     */
    Role findRoleById(TenantId tenantId, RoleId roleId);

    /**
     * Find role by tenant id and name.
     *
     * @param tenantId the tenant id
     * @param name the role name
     * @return the role
     */
    Role findRoleByTenantIdAndName(TenantId tenantId, String name);

    /**
     * Save or update role.
     *
     * @param tenantId the tenant id
     * @param role the role
     * @return saved role
     */
    Role saveRole(TenantId tenantId, Role role);

    /**
     * Delete role.
     *
     * @param tenantId the tenant id
     * @param role the role
     */
    void deleteRole(TenantId tenantId, Role role);

    /**
     * Find roles by tenant id.
     *
     * @param tenantId the tenant id
     * @param pageLink the page link
     * @return page of roles
     */
    PageData<Role> findRolesByTenantId(TenantId tenantId, PageLink pageLink);

    /**
     * Find all system roles.
     *
     * @return list of system roles
     */
    List<Role> findSystemRoles();

    /**
     * Find custom roles by tenant id.
     *
     * @param tenantId the tenant id
     * @return list of custom roles
     */
    List<Role> findCustomRolesByTenantId(TenantId tenantId);

    /**
     * Assign role to user.
     *
     * @param userId the user id
     * @param roleId the role id
     * @return user role
     */
    UserRole assignRoleToUser(UserId userId, RoleId roleId);

    /**
     * Unassign role from user.
     *
     * @param userId the user id
     * @param roleId the role id
     */
    void unassignRoleFromUser(UserId userId, RoleId roleId);

    /**
     * Find roles by user id.
     *
     * @param userId the user id
     * @return list of roles
     */
    List<Role> findRolesByUserId(UserId userId);

    /**
     * Find user roles by user id.
     *
     * @param userId the user id
     * @return list of user roles
     */
    List<UserRole> findUserRolesByUserId(UserId userId);

    /**
     * Add permission to role.
     *
     * @param roleId the role id
     * @param resource the resource
     * @param operation the operation
     * @return permission
     */
    Permission addPermissionToRole(RoleId roleId, String resource, String operation);

    /**
     * Remove permission from role.
     *
     * @param roleId the role id
     * @param resource the resource
     * @param operation the operation
     */
    void removePermissionFromRole(RoleId roleId, String resource, String operation);

    /**
     * Find permissions by role id.
     *
     * @param roleId the role id
     * @return list of permissions
     */
    List<Permission> findPermissionsByRoleId(RoleId roleId);

    /**
     * Find all permissions for user (from all user's roles).
     *
     * @param userId the user id
     * @return list of permissions
     */
    List<Permission> findPermissionsByUserId(UserId userId);

    /**
     * Check if user has permission.
     *
     * @param userId the user id
     * @param resource the resource
     * @param operation the operation
     * @return true if user has permission
     */
    boolean hasPermission(UserId userId, String resource, String operation);

}
