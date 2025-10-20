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

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.thingsboard.server.common.data.BaseData;
import org.thingsboard.server.common.data.HasName;
import org.thingsboard.server.common.data.HasTenantId;
import org.thingsboard.server.common.data.HasVersion;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.validation.Length;
import org.thingsboard.server.common.data.validation.NoXss;

@Schema
@EqualsAndHashCode(callSuper = true)
@ToString
public class Role extends BaseData<RoleId> implements HasName, HasTenantId, HasVersion {

    private static final long serialVersionUID = 2807343040519543363L;

    @Getter
    @Setter
    private TenantId tenantId;

    @NoXss
    @Length(fieldName = "name", max = 255)
    @Getter
    @Setter
    private String name;

    @NoXss
    @Length(fieldName = "description", max = 1000)
    @Getter
    @Setter
    private String description;

    @Getter
    @Setter
    private boolean systemRole;

    @JsonIgnore
    @Getter
    @Setter
    private String searchText;

    @Getter
    @Setter
    private Long version;

    public Role() {
        super();
    }

    public Role(RoleId id) {
        super(id);
    }

    public Role(Role role) {
        super(role);
        this.tenantId = role.getTenantId();
        this.name = role.getName();
        this.description = role.getDescription();
        this.systemRole = role.isSystemRole();
        this.searchText = role.getSearchText();
        this.version = role.getVersion();
    }

    @Schema(description = "JSON object with the Role Id. Specify this field to update the role. " +
            "Referencing non-existing Role Id will cause error. Omit this field to create new role.")
    @Override
    public RoleId getId() {
        return super.getId();
    }

    @Schema(description = "Timestamp of the role creation, in milliseconds", example = "1609459200000", accessMode = Schema.AccessMode.READ_ONLY)
    @Override
    public long getCreatedTime() {
        return super.getCreatedTime();
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Tenant ID that owns this role", accessMode = Schema.AccessMode.READ_ONLY)
    @Override
    public TenantId getTenantId() {
        return tenantId;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Name of the role", example = "Device Operator")
    @Override
    public String getName() {
        return name;
    }

    @Schema(description = "Description of the role", example = "Can manage devices and view telemetry")
    public String getDescription() {
        return description;
    }

    @Schema(description = "True if this is a system role that cannot be modified or deleted", accessMode = Schema.AccessMode.READ_ONLY)
    public boolean isSystemRole() {
        return systemRole;
    }

}
