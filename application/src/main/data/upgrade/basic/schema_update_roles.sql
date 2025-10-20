--
-- Copyright © 2016-2025 The Thingsboard Authors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--

-- =====================================================
-- GRANULAR RBAC SYSTEM - SCHEMA UPDATE
-- =====================================================

-- Table: role
-- Stores custom roles and system roles
CREATE TABLE IF NOT EXISTS role (
    id uuid NOT NULL CONSTRAINT role_pkey PRIMARY KEY,
    created_time bigint NOT NULL,
    tenant_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    description varchar(1000),
    is_system_role boolean NOT NULL DEFAULT false,
    search_text varchar(255),
    version bigint DEFAULT 1,
    CONSTRAINT role_name_tenant_unq UNIQUE (name, tenant_id)
);

-- Table: permission
-- Stores granular permissions for each role
CREATE TABLE IF NOT EXISTS permission (
    id uuid NOT NULL CONSTRAINT permission_pkey PRIMARY KEY,
    role_id uuid NOT NULL,
    resource varchar(255) NOT NULL,
    operation varchar(255) NOT NULL,
    created_time bigint NOT NULL,
    CONSTRAINT fk_permission_role FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
    CONSTRAINT permission_role_resource_operation_unq UNIQUE (role_id, resource, operation)
);

-- Table: user_role
-- Many-to-many relationship between users and roles
CREATE TABLE IF NOT EXISTS user_role (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_time bigint NOT NULL,
    CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES tb_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE
);

-- Table: role_template
-- Predefined role templates for quick setup
CREATE TABLE IF NOT EXISTS role_template (
    id uuid NOT NULL CONSTRAINT role_template_pkey PRIMARY KEY,
    created_time bigint NOT NULL,
    name varchar(255) NOT NULL,
    description varchar(1000),
    permissions_json varchar(100000) NOT NULL,
    category varchar(50),
    CONSTRAINT role_template_name_unq UNIQUE (name)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_role_tenant_id ON role(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_name ON role(name);
CREATE INDEX IF NOT EXISTS idx_role_search_text ON role(search_text);

CREATE INDEX IF NOT EXISTS idx_permission_role_id ON permission(role_id);
CREATE INDEX IF NOT EXISTS idx_permission_resource ON permission(resource);
CREATE INDEX IF NOT EXISTS idx_permission_operation ON permission(operation);

CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON user_role(role_id);

CREATE INDEX IF NOT EXISTS idx_role_template_category ON role_template(category);

-- =====================================================
-- DATA MIGRATION
-- =====================================================

-- Insert system roles based on existing authorities
-- Note: Using special system tenant ID for system roles

-- System Admin Role
INSERT INTO role (id, created_time, tenant_id, name, description, is_system_role, search_text)
VALUES (
    '13814000-1dd2-11b2-8080-808080808001',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    '13814000-1dd2-11b2-8080-808080808080',
    'System Administrator',
    'Full system administration access',
    true,
    'system administrator'
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Tenant Admin Role
INSERT INTO role (id, created_time, tenant_id, name, description, is_system_role, search_text)
VALUES (
    '13814000-1dd2-11b2-8080-808080808002',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    '13814000-1dd2-11b2-8080-808080808080',
    'Tenant Administrator',
    'Full tenant administration access',
    true,
    'tenant administrator'
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- Customer User Role
INSERT INTO role (id, created_time, tenant_id, name, description, is_system_role, search_text)
VALUES (
    '13814000-1dd2-11b2-8080-808080808003',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    '13814000-1dd2-11b2-8080-808080808080',
    'Customer User',
    'Customer user access',
    true,
    'customer user'
) ON CONFLICT (name, tenant_id) DO NOTHING;

-- =====================================================
-- SYSTEM ADMIN PERMISSIONS
-- =====================================================

-- Admin Settings
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'ADMIN_SETTINGS', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'ADMIN_SETTINGS' AND operation = 'ALL');

-- Dashboard
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'DASHBOARD', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'DASHBOARD' AND operation = 'READ');

-- Tenant
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'TENANT', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'TENANT' AND operation = 'ALL');

-- User
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'USER', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'USER' AND operation = 'ALL');

-- Domain
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'DOMAIN', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'DOMAIN' AND operation = 'ALL');

-- Tenant Profile
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808001', 'TENANT_PROFILE', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808001' AND resource = 'TENANT_PROFILE' AND operation = 'ALL');

-- =====================================================
-- TENANT ADMIN PERMISSIONS
-- =====================================================

-- Admin Settings
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'ADMIN_SETTINGS', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'ADMIN_SETTINGS' AND operation = 'ALL');

-- Alarm
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'ALARM', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'ALARM' AND operation = 'ALL');

-- Asset
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'ASSET', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'ASSET' AND operation = 'ALL');

-- Device
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'DEVICE', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'DEVICE' AND operation = 'ALL');

-- Customer
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'CUSTOMER', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'CUSTOMER' AND operation = 'ALL');

-- Dashboard
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'DASHBOARD', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'DASHBOARD' AND operation = 'ALL');

-- User
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'USER', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'USER' AND operation = 'ALL');

-- Rule Chain
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'RULE_CHAIN', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'RULE_CHAIN' AND operation = 'ALL');

-- Device Profile
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808002', 'DEVICE_PROFILE', 'ALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808002' AND resource = 'DEVICE_PROFILE' AND operation = 'ALL');

-- =====================================================
-- CUSTOMER USER PERMISSIONS
-- =====================================================

-- Alarm (Read only)
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'ALARM', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'ALARM' AND operation = 'READ');

-- Asset (Read, Read Attributes, Read Telemetry)
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'ASSET', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'ASSET' AND operation = 'READ');

INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'ASSET', 'READ_ATTRIBUTES', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'ASSET' AND operation = 'READ_ATTRIBUTES');

INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'ASSET', 'READ_TELEMETRY', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'ASSET' AND operation = 'READ_TELEMETRY');

-- Device (Read, RPC Call, Read Credentials, Read Attributes, Read Telemetry)
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'DEVICE', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'DEVICE' AND operation = 'READ');

INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'DEVICE', 'RPC_CALL', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'DEVICE' AND operation = 'RPC_CALL');

-- Dashboard (Read)
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'DASHBOARD', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'DASHBOARD' AND operation = 'READ');

-- Customer (Read)
INSERT INTO permission (id, role_id, resource, operation, created_time)
SELECT gen_random_uuid(), '13814000-1dd2-11b2-8080-808080808003', 'CUSTOMER', 'READ', EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE role_id = '13814000-1dd2-11b2-8080-808080808003' AND resource = 'CUSTOMER' AND operation = 'READ');

-- =====================================================
-- MIGRATE EXISTING USERS TO NEW ROLE SYSTEM
-- =====================================================

-- Migrate SYS_ADMIN users
INSERT INTO user_role (user_id, role_id, created_time)
SELECT
    id,
    '13814000-1dd2-11b2-8080-808080808001',
    EXTRACT(EPOCH FROM NOW()) * 1000
FROM tb_user
WHERE authority = 'SYS_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Migrate TENANT_ADMIN users
INSERT INTO user_role (user_id, role_id, created_time)
SELECT
    id,
    '13814000-1dd2-11b2-8080-808080808002',
    EXTRACT(EPOCH FROM NOW()) * 1000
FROM tb_user
WHERE authority = 'TENANT_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Migrate CUSTOMER_USER users
INSERT INTO user_role (user_id, role_id, created_time)
SELECT
    id,
    '13814000-1dd2-11b2-8080-808080808003',
    EXTRACT(EPOCH FROM NOW()) * 1000
FROM tb_user
WHERE authority = 'CUSTOMER_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =====================================================
-- ROLE TEMPLATES
-- =====================================================

-- Template: Device Operator
INSERT INTO role_template (id, created_time, name, description, permissions_json, category)
VALUES (
    gen_random_uuid(),
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'Device Operator',
    'Can manage devices and view telemetry',
    '[{"resource":"DEVICE","operation":"READ"},{"resource":"DEVICE","operation":"WRITE"},{"resource":"DEVICE","operation":"READ_TELEMETRY"},{"resource":"DEVICE","operation":"READ_ATTRIBUTES"},{"resource":"DEVICE","operation":"RPC_CALL"},{"resource":"DASHBOARD","operation":"READ"}]',
    'operations'
) ON CONFLICT (name) DO NOTHING;

-- Template: Dashboard Viewer
INSERT INTO role_template (id, created_time, name, description, permissions_json, category)
VALUES (
    gen_random_uuid(),
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'Dashboard Viewer',
    'Read-only access to dashboards and telemetry',
    '[{"resource":"DASHBOARD","operation":"READ"},{"resource":"DEVICE","operation":"READ"},{"resource":"DEVICE","operation":"READ_TELEMETRY"},{"resource":"ASSET","operation":"READ"},{"resource":"ASSET","operation":"READ_TELEMETRY"}]',
    'viewer'
) ON CONFLICT (name) DO NOTHING;

-- Template: Alarm Manager
INSERT INTO role_template (id, created_time, name, description, permissions_json, category)
VALUES (
    gen_random_uuid(),
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'Alarm Manager',
    'Can view and manage alarms',
    '[{"resource":"ALARM","operation":"READ"},{"resource":"ALARM","operation":"WRITE"},{"resource":"DEVICE","operation":"READ"},{"resource":"ASSET","operation":"READ"},{"resource":"DASHBOARD","operation":"READ"}]',
    'operations'
) ON CONFLICT (name) DO NOTHING;

-- Template: Asset Manager
INSERT INTO role_template (id, created_time, name, description, permissions_json, category)
VALUES (
    gen_random_uuid(),
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'Asset Manager',
    'Can manage assets and assign them to customers',
    '[{"resource":"ASSET","operation":"ALL"},{"resource":"CUSTOMER","operation":"READ"},{"resource":"DASHBOARD","operation":"READ"}]',
    'management'
) ON CONFLICT (name) DO NOTHING;

-- Template: Rule Chain Editor
INSERT INTO role_template (id, created_time, name, description, permissions_json, category)
VALUES (
    gen_random_uuid(),
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'Rule Chain Editor',
    'Can create and modify rule chains',
    '[{"resource":"RULE_CHAIN","operation":"ALL"},{"resource":"DEVICE","operation":"READ"},{"resource":"ASSET","operation":"READ"},{"resource":"DASHBOARD","operation":"READ"}]',
    'development'
) ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- AUDIT TRIGGER (Optional - for tracking role changes)
-- =====================================================

-- Note: Implement audit logging through application layer
-- using existing AuditLogService

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE role IS 'Stores custom roles and system roles for granular access control';
COMMENT ON TABLE permission IS 'Granular permissions mapping resources and operations to roles';
COMMENT ON TABLE user_role IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE role_template IS 'Predefined role templates for quick role setup';

COMMENT ON COLUMN role.is_system_role IS 'If true, role cannot be deleted or modified';
COMMENT ON COLUMN role.search_text IS 'Lowercase name for text search';
COMMENT ON COLUMN permission.resource IS 'Resource type from Resource enum (DEVICE, ASSET, etc.)';
COMMENT ON COLUMN permission.operation IS 'Operation type from Operation enum (READ, WRITE, etc.)';
