///
/// Copyright © 2016-2025 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { BaseData, HasId } from './base-data';
import { RoleId } from './id/role-id';
import { TenantId } from './id/tenant-id';
import { UserId } from './id/user-id';
import { PermissionId } from './id/permission-id';
import { RoleTemplateId } from './id/role-template-id';
import { HasTenantId } from '@shared/models/entity.models';

export interface Role extends BaseData<RoleId>, HasTenantId {
  tenantId: TenantId;
  name: string;
  description: string;
  systemRole: boolean;
  searchText?: string;
}

export interface Permission extends BaseData<PermissionId> {
  roleId: RoleId;
  resource: string;
  operation: string;
}

export interface UserRole {
  userId: UserId;
  roleId: RoleId;
  createdTime: number;
}

export interface RoleTemplate extends BaseData<RoleTemplateId> {
  name: string;
  description: string;
  permissionsJson: PermissionDefinition[];
  category: string;
}

export interface PermissionDefinition {
  resource: string;
  operation: string;
}

export enum ResourceType {
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  ALARM = 'ALARM',
  DEVICE = 'DEVICE',
  ASSET = 'ASSET',
  CUSTOMER = 'CUSTOMER',
  DASHBOARD = 'DASHBOARD',
  ENTITY_VIEW = 'ENTITY_VIEW',
  TENANT = 'TENANT',
  RULE_CHAIN = 'RULE_CHAIN',
  USER = 'USER',
  WIDGETS_BUNDLE = 'WIDGETS_BUNDLE',
  WIDGET_TYPE = 'WIDGET_TYPE',
  OAUTH2_CLIENT = 'OAUTH2_CLIENT',
  DOMAIN = 'DOMAIN',
  MOBILE_APP = 'MOBILE_APP',
  MOBILE_APP_BUNDLE = 'MOBILE_APP_BUNDLE',
  OAUTH2_CONFIGURATION_TEMPLATE = 'OAUTH2_CONFIGURATION_TEMPLATE',
  TENANT_PROFILE = 'TENANT_PROFILE',
  DEVICE_PROFILE = 'DEVICE_PROFILE',
  ASSET_PROFILE = 'ASSET_PROFILE',
  API_USAGE_STATE = 'API_USAGE_STATE',
  TB_RESOURCE = 'TB_RESOURCE',
  OTA_PACKAGE = 'OTA_PACKAGE',
  EDGE = 'EDGE',
  RPC = 'RPC',
  QUEUE = 'QUEUE',
  VERSION_CONTROL = 'VERSION_CONTROL',
  NOTIFICATION = 'NOTIFICATION',
  MOBILE_APP_SETTINGS = 'MOBILE_APP_SETTINGS',
  JOB = 'JOB',
  AI_MODEL = 'AI_MODEL',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION'
}

export enum OperationType {
  ALL = 'ALL',
  CREATE = 'CREATE',
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  ASSIGN_TO_CUSTOMER = 'ASSIGN_TO_CUSTOMER',
  UNASSIGN_FROM_CUSTOMER = 'UNASSIGN_FROM_CUSTOMER',
  RPC_CALL = 'RPC_CALL',
  READ_CREDENTIALS = 'READ_CREDENTIALS',
  WRITE_CREDENTIALS = 'WRITE_CREDENTIALS',
  READ_ATTRIBUTES = 'READ_ATTRIBUTES',
  WRITE_ATTRIBUTES = 'WRITE_ATTRIBUTES',
  READ_TELEMETRY = 'READ_TELEMETRY',
  WRITE_TELEMETRY = 'WRITE_TELEMETRY',
  CLAIM_DEVICES = 'CLAIM_DEVICES',
  ASSIGN_TO_TENANT = 'ASSIGN_TO_TENANT',
  READ_CALCULATED_FIELD = 'READ_CALCULATED_FIELD',
  WRITE_CALCULATED_FIELD = 'WRITE_CALCULATED_FIELD'
}

export const resourceTypeTranslations = new Map<ResourceType, string>([
  [ResourceType.ADMIN_SETTINGS, 'resource.admin-settings'],
  [ResourceType.ALARM, 'resource.alarm'],
  [ResourceType.DEVICE, 'resource.device'],
  [ResourceType.ASSET, 'resource.asset'],
  [ResourceType.CUSTOMER, 'resource.customer'],
  [ResourceType.DASHBOARD, 'resource.dashboard'],
  [ResourceType.ENTITY_VIEW, 'resource.entity-view'],
  [ResourceType.TENANT, 'resource.tenant'],
  [ResourceType.RULE_CHAIN, 'resource.rule-chain'],
  [ResourceType.USER, 'resource.user'],
  [ResourceType.WIDGETS_BUNDLE, 'resource.widgets-bundle'],
  [ResourceType.WIDGET_TYPE, 'resource.widget-type'],
  [ResourceType.DEVICE_PROFILE, 'resource.device-profile'],
  [ResourceType.ASSET_PROFILE, 'resource.asset-profile'],
  [ResourceType.ROLE, 'resource.role'],
  [ResourceType.PERMISSION, 'resource.permission']
]);

export const operationTypeTranslations = new Map<OperationType, string>([
  [OperationType.ALL, 'operation.all'],
  [OperationType.CREATE, 'operation.create'],
  [OperationType.READ, 'operation.read'],
  [OperationType.WRITE, 'operation.write'],
  [OperationType.DELETE, 'operation.delete'],
  [OperationType.ASSIGN_TO_CUSTOMER, 'operation.assign-to-customer'],
  [OperationType.UNASSIGN_FROM_CUSTOMER, 'operation.unassign-from-customer'],
  [OperationType.RPC_CALL, 'operation.rpc-call'],
  [OperationType.READ_CREDENTIALS, 'operation.read-credentials'],
  [OperationType.WRITE_CREDENTIALS, 'operation.write-credentials'],
  [OperationType.READ_ATTRIBUTES, 'operation.read-attributes'],
  [OperationType.WRITE_ATTRIBUTES, 'operation.write-attributes'],
  [OperationType.READ_TELEMETRY, 'operation.read-telemetry'],
  [OperationType.WRITE_TELEMETRY, 'operation.write-telemetry']
]);

export interface RoleInfo extends Role {
  permissionsCount?: number;
  usersCount?: number;
}
