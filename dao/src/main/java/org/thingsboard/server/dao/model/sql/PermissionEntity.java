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
import org.thingsboard.server.common.data.id.PermissionId;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.dao.model.BaseSqlEntity;
import org.thingsboard.server.dao.model.ModelConstants;

import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = ModelConstants.PERMISSION_TABLE_NAME)
public class PermissionEntity extends BaseSqlEntity<Permission> {

    @Column(name = ModelConstants.PERMISSION_ROLE_ID_PROPERTY)
    private UUID roleId;

    @Column(name = ModelConstants.PERMISSION_RESOURCE_PROPERTY)
    private String resource;

    @Column(name = ModelConstants.PERMISSION_OPERATION_PROPERTY)
    private String operation;

    public PermissionEntity() {
    }

    public PermissionEntity(Permission permission) {
        super(permission);
        if (permission.getRoleId() != null) {
            this.roleId = permission.getRoleId().getId();
        }
        this.resource = permission.getResource();
        this.operation = permission.getOperation();
    }

    @Override
    public Permission toData() {
        Permission permission = new Permission(new PermissionId(this.getUuid()));
        permission.setCreatedTime(createdTime);
        if (roleId != null) {
            permission.setRoleId(new RoleId(roleId));
        }
        permission.setResource(resource);
        permission.setOperation(operation);
        return permission;
    }

}
