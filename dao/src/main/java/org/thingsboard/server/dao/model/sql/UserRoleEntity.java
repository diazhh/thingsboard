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
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.permission.UserRole;
import org.thingsboard.server.dao.model.ModelConstants;

import java.io.Serializable;
import java.util.UUID;

@Data
@EqualsAndHashCode
@Entity
@Table(name = ModelConstants.USER_ROLE_TABLE_NAME)
@IdClass(UserRoleEntity.UserRoleCompositeKey.class)
public class UserRoleEntity {

    @Id
    @Column(name = ModelConstants.USER_ROLE_USER_ID_PROPERTY)
    private UUID userId;

    @Id
    @Column(name = ModelConstants.USER_ROLE_ROLE_ID_PROPERTY)
    private UUID roleId;

    @Column(name = ModelConstants.CREATED_TIME_PROPERTY)
    private long createdTime;

    public UserRoleEntity() {
    }

    public UserRoleEntity(UserRole userRole) {
        if (userRole.getUserId() != null) {
            this.userId = userRole.getUserId().getId();
        }
        if (userRole.getRoleId() != null) {
            this.roleId = userRole.getRoleId().getId();
        }
        this.createdTime = userRole.getCreatedTime();
    }

    public UserRole toData() {
        UserRole userRole = new UserRole();
        if (userId != null) {
            userRole.setUserId(new UserId(userId));
        }
        if (roleId != null) {
            userRole.setRoleId(new RoleId(roleId));
        }
        userRole.setCreatedTime(createdTime);
        return userRole;
    }

    @Data
    @EqualsAndHashCode
    public static class UserRoleCompositeKey implements Serializable {
        private UUID userId;
        private UUID roleId;
    }

}
