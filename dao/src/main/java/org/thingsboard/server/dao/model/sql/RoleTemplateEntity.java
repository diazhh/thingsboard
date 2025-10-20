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

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.thingsboard.server.common.data.id.RoleTemplateId;
import org.thingsboard.server.common.data.permission.RoleTemplate;
import org.thingsboard.server.dao.model.BaseSqlEntity;
import org.thingsboard.server.dao.model.ModelConstants;
import org.thingsboard.server.dao.util.mapping.JsonConverter;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = ModelConstants.ROLE_TEMPLATE_TABLE_NAME)
public class RoleTemplateEntity extends BaseSqlEntity<RoleTemplate> {

    @Column(name = ModelConstants.ROLE_TEMPLATE_NAME_PROPERTY)
    private String name;

    @Column(name = ModelConstants.ROLE_TEMPLATE_DESCRIPTION_PROPERTY)
    private String description;

    @Convert(converter = JsonConverter.class)
    @Column(name = ModelConstants.ROLE_TEMPLATE_PERMISSIONS_JSON_PROPERTY)
    private JsonNode permissionsJson;

    @Column(name = ModelConstants.ROLE_TEMPLATE_CATEGORY_PROPERTY)
    private String category;

    public RoleTemplateEntity() {
    }

    public RoleTemplateEntity(RoleTemplate roleTemplate) {
        super(roleTemplate);
        this.name = roleTemplate.getName();
        this.description = roleTemplate.getDescription();
        this.permissionsJson = roleTemplate.getPermissionsJson();
        this.category = roleTemplate.getCategory();
    }

    @Override
    public RoleTemplate toData() {
        RoleTemplate roleTemplate = new RoleTemplate(new RoleTemplateId(this.getUuid()));
        roleTemplate.setCreatedTime(createdTime);
        roleTemplate.setName(name);
        roleTemplate.setDescription(description);
        roleTemplate.setPermissionsJson(permissionsJson);
        roleTemplate.setCategory(category);
        return roleTemplate;
    }

}
