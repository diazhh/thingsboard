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

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.thingsboard.server.common.data.BaseData;
import org.thingsboard.server.common.data.HasName;
import org.thingsboard.server.common.data.id.RoleTemplateId;
import org.thingsboard.server.common.data.validation.Length;
import org.thingsboard.server.common.data.validation.NoXss;

@Schema
@EqualsAndHashCode(callSuper = true)
@ToString
public class RoleTemplate extends BaseData<RoleTemplateId> implements HasName {

    private static final long serialVersionUID = 2807343040519543364L;

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
    private JsonNode permissionsJson;

    @NoXss
    @Length(fieldName = "category", max = 50)
    @Getter
    @Setter
    private String category;

    public RoleTemplate() {
        super();
    }

    public RoleTemplate(RoleTemplateId id) {
        super(id);
    }

    public RoleTemplate(RoleTemplate roleTemplate) {
        super(roleTemplate);
        this.name = roleTemplate.getName();
        this.description = roleTemplate.getDescription();
        this.permissionsJson = roleTemplate.getPermissionsJson();
        this.category = roleTemplate.getCategory();
    }

    @Schema(description = "JSON object with the RoleTemplate Id. Specify this field to update the template. " +
            "Referencing non-existing RoleTemplate Id will cause error. Omit this field to create new template.")
    @Override
    public RoleTemplateId getId() {
        return super.getId();
    }

    @Schema(description = "Timestamp of the role template creation, in milliseconds", example = "1609459200000", accessMode = Schema.AccessMode.READ_ONLY)
    @Override
    public long getCreatedTime() {
        return super.getCreatedTime();
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Name of the role template", example = "Device Operator")
    @Override
    public String getName() {
        return name;
    }

    @Schema(description = "Description of the role template", example = "Can manage devices and view telemetry")
    public String getDescription() {
        return description;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "JSON array of permissions with resource and operation",
            example = "[{\"resource\":\"DEVICE\",\"operation\":\"READ\"},{\"resource\":\"DEVICE\",\"operation\":\"WRITE\"}]")
    public JsonNode getPermissionsJson() {
        return permissionsJson;
    }

    @Schema(description = "Category of the role template", example = "operations")
    public String getCategory() {
        return category;
    }

}
