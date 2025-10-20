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
package org.thingsboard.server.common.data.permission;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.UserId;

import java.io.Serializable;

@Schema
@Data
@EqualsAndHashCode
@ToString
public class UserRole implements Serializable {

    private static final long serialVersionUID = 8250339805336035966L;

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "User ID")
    private UserId userId;

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Role ID")
    private RoleId roleId;

    @Schema(description = "Timestamp when the role was assigned to the user, in milliseconds", example = "1609459200000")
    private long createdTime;

    public UserRole() {
    }

    public UserRole(UserId userId, RoleId roleId) {
        this.userId = userId;
        this.roleId = roleId;
        this.createdTime = System.currentTimeMillis();
    }

    public UserRole(UserId userId, RoleId roleId, long createdTime) {
        this.userId = userId;
        this.roleId = roleId;
        this.createdTime = createdTime;
    }

}
