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
import org.thingsboard.server.common.data.DashboardInfo;
import org.thingsboard.server.common.data.HasCustomerId;
import org.thingsboard.server.common.data.HasTenantId;
import org.thingsboard.server.common.data.TbResourceInfo;
import org.thingsboard.server.common.data.User;
import org.thingsboard.server.common.data.id.ApiKeyId;
import org.thingsboard.server.common.data.id.DashboardId;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.TbResourceId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.pat.ApiKeyInfo;
import org.thingsboard.server.service.security.model.SecurityUser;

/**
 * Permissions for LABORATORIO authority.
 * Laboratory users have similar permissions to OPERADOR.
 */
@Component
public class LaboratorioPermissions extends AbstractPermissions {

    public LaboratorioPermissions() {
        super();
        put(Resource.ALARM, laboratorioAlarmPermissionChecker);
        put(Resource.ASSET, laboratorioEntityPermissionChecker);
        put(Resource.DEVICE, laboratorioEntityPermissionChecker);
        put(Resource.CUSTOMER, customerPermissionChecker);
        put(Resource.DASHBOARD, laboratorioDashboardPermissionChecker);
        put(Resource.ENTITY_VIEW, laboratorioEntityPermissionChecker);
        put(Resource.USER, userPermissionChecker);
        put(Resource.WIDGETS_BUNDLE, widgetsPermissionChecker);
        put(Resource.WIDGET_TYPE, widgetsPermissionChecker);
        put(Resource.EDGE, laboratorioEntityPermissionChecker);
        put(Resource.RPC, rpcPermissionChecker);
        put(Resource.DEVICE_PROFILE, profilePermissionChecker);
        put(Resource.ASSET_PROFILE, profilePermissionChecker);
        put(Resource.TB_RESOURCE, laboratorioResourcePermissionChecker);
        put(Resource.MOBILE_APP_SETTINGS, new PermissionChecker.GenericPermissionChecker(Operation.READ));
        put(Resource.API_KEY, apiKeysPermissionChecker);
    }

    private static final PermissionChecker laboratorioAlarmPermissionChecker = new PermissionChecker() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (!user.getTenantId().equals(entity.getTenantId())) {
                return false;
            }
            // Laboratory users can acknowledge and clear alarms
            return true;
        }
    };

    private static final PermissionChecker laboratorioEntityPermissionChecker =
            new PermissionChecker.GenericPermissionChecker(Operation.READ, Operation.READ_CREDENTIALS,
                    Operation.READ_ATTRIBUTES, Operation.READ_TELEMETRY, Operation.RPC_CALL, Operation.CLAIM_DEVICES,
                    Operation.WRITE, Operation.WRITE_ATTRIBUTES, Operation.WRITE_TELEMETRY) {

                @Override
                public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
                    if (!super.hasPermission(user, operation, entityId, entity)) {
                        return false;
                    }
                    if (!user.getTenantId().equals(entity.getTenantId())) {
                        return false;
                    }
                    return true;
                }
            };

    private static final PermissionChecker customerPermissionChecker =
            new PermissionChecker.GenericPermissionChecker(Operation.READ, Operation.READ_ATTRIBUTES, Operation.READ_TELEMETRY) {
                @Override
                public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
                    if (!super.hasPermission(user, operation, entityId, entity)) {
                        return false;
                    }
                    return user.getCustomerId().equals(entityId);
                }
            };

    private static final PermissionChecker laboratorioResourcePermissionChecker =
            new PermissionChecker<TbResourceId, TbResourceInfo>() {
                @Override
                public boolean hasPermission(SecurityUser user, Operation operation, TbResourceId resourceId, TbResourceInfo resource) {
                    if (operation != Operation.READ) {
                        return false;
                    }
                    if (resource.getResourceType() == null || !resource.getResourceType().isCustomerAccess()) {
                        return false;
                    }
                    if (resource.getTenantId() == null || resource.getTenantId().isNullUid()) {
                        return true;
                    }
                    return user.getTenantId().equals(resource.getTenantId());
                }
            };

    private static final PermissionChecker laboratorioDashboardPermissionChecker =
            new PermissionChecker.GenericPermissionChecker<DashboardId, DashboardInfo>(Operation.READ, Operation.READ_ATTRIBUTES, Operation.READ_TELEMETRY) {
                @Override
                public boolean hasPermission(SecurityUser user, Operation operation, DashboardId dashboardId, DashboardInfo dashboard) {
                    if (!super.hasPermission(user, operation, dashboardId, dashboard)) {
                        return false;
                    }
                    if (!user.getTenantId().equals(dashboard.getTenantId())) {
                        return false;
                    }
                    return true;
                }
            };

    private static final PermissionChecker userPermissionChecker = new PermissionChecker<UserId, User>() {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, UserId userId, User userEntity) {
            if (!user.getTenantId().equals(userEntity.getTenantId())) {
                return false;
            }
            if (Operation.READ.equals(operation)) {
                return true;
            }
            return user.getId().equals(userId);
        }
    };

    private static final PermissionChecker widgetsPermissionChecker = new PermissionChecker.GenericPermissionChecker(Operation.READ) {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (!super.hasPermission(user, operation, entityId, entity)) {
                return false;
            }
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return true;
            }
            return user.getTenantId().equals(entity.getTenantId());
        }
    };

    private static final PermissionChecker rpcPermissionChecker = new PermissionChecker.GenericPermissionChecker(Operation.READ) {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (!super.hasPermission(user, operation, entityId, entity)) {
                return false;
            }
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return true;
            }
            return user.getTenantId().equals(entity.getTenantId());
        }
    };

    private static final PermissionChecker profilePermissionChecker = new PermissionChecker.GenericPermissionChecker(Operation.READ) {
        @Override
        public boolean hasPermission(SecurityUser user, Operation operation, EntityId entityId, HasTenantId entity) {
            if (!super.hasPermission(user, operation, entityId, entity)) {
                return false;
            }
            if (entity.getTenantId() == null || entity.getTenantId().isNullUid()) {
                return true;
            }
            return user.getTenantId().equals(entity.getTenantId());
        }
    };

    private static final PermissionChecker apiKeysPermissionChecker = new PermissionChecker<ApiKeyId, ApiKeyInfo>() {
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
