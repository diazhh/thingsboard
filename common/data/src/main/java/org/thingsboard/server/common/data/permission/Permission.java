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
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.thingsboard.server.common.data.BaseData;
import org.thingsboard.server.common.data.id.PermissionId;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.validation.Length;
import org.thingsboard.server.common.data.validation.NoXss;

@Schema
@EqualsAndHashCode(callSuper = true)
@ToString
public class Permission extends BaseData<PermissionId> {

    private static final long serialVersionUID = 8392073843504136408L;

    @Getter
    @Setter
    private RoleId roleId;

    @NoXss
    @Length(fieldName = "resource", max = 255)
    @Getter
    @Setter
    private String resource;

    @NoXss
    @Length(fieldName = "operation", max = 255)
    @Getter
    @Setter
    private String operation;

    public Permission() {
        super();
    }

    public Permission(PermissionId id) {
        super(id);
    }

    public Permission(Permission permission) {
        super(permission);
        this.roleId = permission.getRoleId();
        this.resource = permission.getResource();
        this.operation = permission.getOperation();
    }

    @Schema(description = "JSON object with the Permission Id. Specify this field to update the permission. " +
            "Referencing non-existing Permission Id will cause error. Omit this field to create new permission.")
    @Override
    public PermissionId getId() {
        return super.getId();
    }

    @Schema(description = "Timestamp of the permission creation, in milliseconds", example = "1609459200000", accessMode = Schema.AccessMode.READ_ONLY)
    @Override
    public long getCreatedTime() {
        return super.getCreatedTime();
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Role ID that owns this permission")
    public RoleId getRoleId() {
        return roleId;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Resource name (DEVICE, ASSET, DASHBOARD, etc.)", example = "DEVICE")
    public String getResource() {
        return resource;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Operation name (READ, WRITE, DELETE, etc.)", example = "READ")
    public String getOperation() {
        return operation;
    }

}
