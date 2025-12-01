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
package org.thingsboard.server.service.security.permission;

import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.HasTenantId;
import org.thingsboard.server.common.data.User;
import org.thingsboard.server.common.data.id.ApiKeyId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.pat.ApiKeyInfo;
import org.thingsboard.server.common.data.security.Authority;
import org.thingsboard.server.service.security.model.SecurityUser;

/**
 * Permissions for INGENIERO authority.
 * Engineers have similar permissions to TENANT_ADMIN but with some restrictions.
 */
@Component
public class IngenieroPermissions extends AbstractPermissions {

    public IngenieroPermissions() {
        super();
        // Similar to TenantAdminPermissions but with some restrictions
        put(Resource.ALARM, tenantEntityPermissionChecker);
        put(Resource.ASSET, tenantEntityPermissionChecker);
        put(Resource.DEVICE, tenantEntityPermissionChecker);
        put(Resource.CUSTOMER, tenantEntityPermissionChecker);
        put(Resource.DASHBOARD, tenantEntityPermissionChecker);
        put(Resource.ENTITY_VIEW, tenantEntityPermissionChecker);
        put(Resource.TENANT, tenantPermissionChecker);
        put(Resource.RULE_CHAIN, tenantEntityPermissionChecker);
        put(Resource.USER, userPermissionChecker);
        put(Resource.WIDGETS_BUNDLE, widgetsPermissionChecker);
        put(Resource.WIDGET_TYPE, widgetsPermissionChecker);
        put(Resource.DEVICE_PROFILE, tenantEntityPermissionChecker);
        put(Resource.ASSET_PROFILE, tenantEntityPermissionChecker);
        put(Resource.API_USAGE_STATE, tenantEntityPermissionChecker);
        put(Resource.TB_RESOURCE, tbResourcePermissionChecker);
        put(Resource.OTA_PACKAGE, tenantEntityPermissionChecker);
        put(Resource.EDGE, tenantEntityPermissionChecker);
        put(Resource.RPC, tenantEntityPermissionChecker);
        put(Resource.QUEUE, queuePermissionChecker);
        put(Resource.NOTIFICATION, tenantEntityPermissionChecker);
        put(Resource.MOBILE_APP_SETTINGS, new PermissionChecker.GenericPermissionChecker(Operation.READ));
        put(Resource.API_KEY, apiKeysPermissionChecker);
    }

    private static final PermissionChecker tenantEntityPermissionChecker = new PermissionChecker() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (!user.getTenantId().equals(entity.getTenantId())) {
                return false;
            }
            return true;
        }
    };

    private static final PermissionChecker tenantPermissionChecker =
            new PermissionChecker.GenericPermissionChecker(Operation.READ, Operation.READ_ATTRIBUTES, Operation.READ_TELEMETRY) {
                @Override
                public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
                    if (!super.hasPermission(user, operation, entityId, entity)) {
                        return false;
                    }
                    if (!user.getTenantId().equals(entityId)) {
                        return false;
                    }
                    return true;
                }
            };

    private static final PermissionChecker userPermissionChecker = new PermissionChecker<UserId, User>() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, UserId userId, User userEntity) {
            if (Authority.SYS_ADMIN.equals(userEntity.getAuthority())) {
                return false;
            }
            if (!user.getTenantId().equals(userEntity.getTenantId())) {
                return false;
            }
            // INGENIERO can read any user in the same tenant
            if (Operation.READ.equals(operation)) {
                return true;
            }
            // INGENIERO cannot modify TENANT_ADMIN users
            if (Authority.TENANT_ADMIN.equals(userEntity.getAuthority())) {
                return false;
            }
            return true;
        }
    };

    private static final PermissionChecker widgetsPermissionChecker = new PermissionChecker() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return operation == Operation.READ;
            }
            if (!user.getTenantId().equals(entity.getTenantId())) {
                return false;
            }
            return true;
        }
    };

    private static final PermissionChecker tbResourcePermissionChecker = new PermissionChecker() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return operation == Operation.READ;
            }
            if (!user.getTenantId().equals(entity.getTenantId())) {
                return false;
            }
            return true;
        }
    };

    private static final PermissionChecker queuePermissionChecker = new PermissionChecker() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return operation == Operation.READ;
            }
            if (!user.getTenantId().equals(entity.getTenantId())) {
                return false;
            }
            return true;
        }
    };

    private static final PermissionChecker<ApiKeyId, ApiKeyInfo> apiKeysPermissionChecker = new PermissionChecker<>() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation) {
            return true;
        }

        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, ApiKeyId entityId, ApiKeyInfo entity) {
            return user.getTenantId().equals(entity.getTenantId());
        }
    };
}
