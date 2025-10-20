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

import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.page.PageData;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.dao.Dao;
import org.thingsboard.server.dao.TenantEntityDao;

import java.util.List;
import java.util.UUID;

public interface RoleDao extends Dao<Role>, TenantEntityDao<Role> {

    /**
     * Save or update role object
     *
     * @param tenantId the tenant id
     * @param role the role object
     * @return saved role entity
     */
    Role save(TenantId tenantId, Role role);

    /**
     * Find role by tenant id and name.
     *
     * @param tenantId the tenant id
     * @param name the role name
     * @return the role entity
     */
    Role findByTenantIdAndName(TenantId tenantId, String name);

    /**
     * Find roles by tenantId and page link.
     *
     * @param tenantId the tenantId
     * @param pageLink the page link
     * @return the list of role entities
     */
    PageData<Role> findByTenantId(UUID tenantId, PageLink pageLink);

    /**
     * Find all system roles.
     *
     * @return the list of system roles
     */
    List<Role> findSystemRoles();

    /**
     * Find custom roles by tenant id.
     *
     * @param tenantId the tenant id
     * @return the list of custom roles
     */
    List<Role> findCustomRolesByTenantId(UUID tenantId);

}
