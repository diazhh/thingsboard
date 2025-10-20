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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.dao.exception.DataValidationException;
import org.thingsboard.server.dao.service.DataValidator;
import org.thingsboard.server.dao.tenant.TenantDao;

import static org.thingsboard.server.dao.service.Validator.validateString;

@Component
public class RoleDataValidator extends DataValidator<Role> {

    @Autowired
    private RoleDao roleDao;

    @Autowired
    private TenantDao tenantDao;

    @Override
    protected void validateDataImpl(TenantId tenantId, Role role) {
        validateString(role.getName(), "Role name");

        if (role.getTenantId() == null) {
            throw new DataValidationException("Role should be assigned to tenant!");
        } else {
            if (!tenantDao.existsById(tenantId, role.getTenantId().getId())) {
                throw new DataValidationException("Role is referencing to non-existent tenant!");
            }
        }

        if (role.getId() != null) {
            Role existingRole = roleDao.findById(tenantId, role.getId().getId());
            if (existingRole != null && existingRole.isSystemRole()) {
                throw new DataValidationException("System roles cannot be modified!");
            }
        }

        // Check for duplicate names within the same tenant
        Role roleWithSameName = roleDao.findByTenantIdAndName(role.getTenantId(), role.getName());
        if (roleWithSameName != null && (role.getId() == null || !roleWithSameName.getId().equals(role.getId()))) {
            throw new DataValidationException("Role with name '" + role.getName() + "' already exists for this tenant!");
        }
    }

}
