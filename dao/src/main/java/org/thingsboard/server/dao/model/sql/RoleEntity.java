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
package org.thingsboard.server.dao.model.sql;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.dao.model.BaseVersionedEntity;
import org.thingsboard.server.dao.model.ModelConstants;

import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = ModelConstants.ROLE_TABLE_NAME)
public class RoleEntity extends BaseVersionedEntity<Role> {

    @Column(name = ModelConstants.ROLE_TENANT_ID_PROPERTY)
    private UUID tenantId;

    @Column(name = ModelConstants.ROLE_NAME_PROPERTY)
    private String name;

    @Column(name = ModelConstants.ROLE_DESCRIPTION_PROPERTY)
    private String description;

    @Column(name = ModelConstants.ROLE_IS_SYSTEM_ROLE_PROPERTY)
    private boolean systemRole;

    @Column(name = ModelConstants.ROLE_SEARCH_TEXT_PROPERTY)
    private String searchText;

    public RoleEntity() {
    }

    public RoleEntity(Role role) {
        super(role);
        if (role.getTenantId() != null) {
            this.tenantId = role.getTenantId().getId();
        }
        this.name = role.getName();
        this.description = role.getDescription();
        this.systemRole = role.isSystemRole();
        this.searchText = role.getSearchText();
    }

    @Override
    public Role toData() {
        Role role = new Role(new RoleId(this.getUuid()));
        role.setCreatedTime(createdTime);
        role.setVersion(version);
        if (tenantId != null) {
            role.setTenantId(TenantId.fromUUID(tenantId));
        }
        role.setName(name);
        role.setDescription(description);
        role.setSystemRole(systemRole);
        role.setSearchText(searchText);
        return role;
    }

}
