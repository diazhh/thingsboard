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
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.dao.Dao;

import java.util.List;

public interface PermissionDao extends Dao<Permission> {

    /**
     * Find permissions by role id.
     *
     * @param roleId the role id
     * @return the list of permissions
     */
    List<Permission> findByRoleId(RoleId roleId);

    /**
     * Find permissions by multiple role ids.
     *
     * @param roleIds the list of role ids
     * @return the list of permissions
     */
    List<Permission> findByRoleIds(List<RoleId> roleIds);

    /**
     * Find permission by role id, resource and operation.
     *
     * @param roleId the role id
     * @param resource the resource
     * @param operation the operation
     * @return the permission entity
     */
    Permission findByRoleIdAndResourceAndOperation(RoleId roleId, String resource, String operation);

    /**
     * Delete all permissions for a role.
     *
     * @param roleId the role id
     */
    void deleteByRoleId(RoleId roleId);

    /**
     * Delete permissions for a role and resource.
     *
     * @param roleId the role id
     * @param resource the resource
     */
    void deleteByRoleIdAndResource(RoleId roleId, String resource);

}
