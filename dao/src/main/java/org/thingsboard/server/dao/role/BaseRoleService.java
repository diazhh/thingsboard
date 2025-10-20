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

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thingsboard.server.common.data.CacheConstants;
import org.thingsboard.server.common.data.EntityType;
import org.thingsboard.server.common.data.id.EntityId;
import org.thingsboard.server.common.data.id.HasId;
import org.thingsboard.server.common.data.id.PermissionId;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.TenantId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.page.PageData;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.common.data.permission.UserRole;
import org.thingsboard.server.dao.entity.AbstractEntityService;
import org.thingsboard.server.dao.service.DataValidator;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service("RoleDaoService")
@Slf4j
public class BaseRoleService extends AbstractEntityService implements RoleService {

    public static final String INCORRECT_ROLE_ID = "Incorrect roleId ";
    public static final String CANNOT_DELETE_SYSTEM_ROLE = "System roles cannot be deleted";

    @Autowired
    private RoleDao roleDao;

    @Autowired
    private PermissionDao permissionDao;

    @Autowired
    private UserRoleDao userRoleDao;

    @Autowired
    private DataValidator<Role> roleValidator;

    @Override
    @Cacheable(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #roleId}")
    public Role findRoleById(TenantId tenantId, RoleId roleId) {
        log.trace("Executing findRoleById [{}]", roleId);
        return roleDao.findById(tenantId, roleId.getId());
    }

    @Override
    @Cacheable(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #name}")
    public Role findRoleByTenantIdAndName(TenantId tenantId, String name) {
        log.trace("Executing findRoleByTenantIdAndName [{}][{}]", tenantId, name);
        return roleDao.findByTenantIdAndName(tenantId, name);
    }

    @Override
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #role.id}"),
            @CacheEvict(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #role.name}"),
            @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, allEntries = true)
    })
    public Role saveRole(TenantId tenantId, Role role) {
        log.trace("Executing saveRole [{}]", role);
        roleValidator.validate(role, r -> tenantId);

        if (role.getId() == null) {
            role.setId(new RoleId(UUID.randomUUID()));
        }

        if (role.getSearchText() == null && role.getName() != null) {
            role.setSearchText(role.getName().toLowerCase());
        }

        return roleDao.save(tenantId, role);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #role.id}"),
            @CacheEvict(cacheNames = CacheConstants.ROLES_CACHE, key = "{#tenantId, #role.name}"),
            @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, allEntries = true)
    })
    public void deleteRole(TenantId tenantId, Role role) {
        log.trace("Executing deleteRole [{}]", role);

        if (role.isSystemRole()) {
            throw new IllegalArgumentException(CANNOT_DELETE_SYSTEM_ROLE);
        }

        RoleId roleId = role.getId();

        // Delete all permissions for this role
        permissionDao.deleteByRoleId(roleId);

        // Delete all user-role assignments
        userRoleDao.deleteByRoleId(roleId);

        // Delete the role
        roleDao.removeById(tenantId, roleId.getId());
    }

    @Override
    public PageData<Role> findRolesByTenantId(TenantId tenantId, PageLink pageLink) {
        log.trace("Executing findRolesByTenantId, tenantId [{}], pageLink [{}]", tenantId, pageLink);
        return roleDao.findByTenantId(tenantId.getId(), pageLink);
    }

    @Override
    @Cacheable(cacheNames = CacheConstants.ROLES_CACHE, key = "'system_roles'")
    public List<Role> findSystemRoles() {
        log.trace("Executing findSystemRoles");
        return roleDao.findSystemRoles();
    }

    @Override
    public List<Role> findCustomRolesByTenantId(TenantId tenantId) {
        log.trace("Executing findCustomRolesByTenantId [{}]", tenantId);
        return roleDao.findCustomRolesByTenantId(tenantId.getId());
    }

    @Override
    @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, key = "#userId")
    public UserRole assignRoleToUser(UserId userId, RoleId roleId) {
        log.trace("Executing assignRoleToUser [{}][{}]", userId, roleId);
        UserRole userRole = new UserRole(userId, roleId);
        return userRoleDao.save(userRole);
    }

    @Override
    @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, key = "#userId")
    public void unassignRoleFromUser(UserId userId, RoleId roleId) {
        log.trace("Executing unassignRoleFromUser [{}][{}]", userId, roleId);
        userRoleDao.deleteByUserIdAndRoleId(userId, roleId);
    }

    @Override
    public List<Role> findRolesByUserId(UserId userId) {
        log.trace("Executing findRolesByUserId [{}]", userId);
        List<UserRole> userRoles = userRoleDao.findByUserId(userId);
        return userRoles.stream()
                .map(ur -> roleDao.findById(TenantId.SYS_TENANT_ID, ur.getRoleId().getId()))
                .filter(role -> role != null)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserRole> findUserRolesByUserId(UserId userId) {
        log.trace("Executing findUserRolesByUserId [{}]", userId);
        return userRoleDao.findByUserId(userId);
    }

    @Override
    @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, allEntries = true)
    public Permission addPermissionToRole(RoleId roleId, String resource, String operation) {
        log.trace("Executing addPermissionToRole [{}][{}][{}]", roleId, resource, operation);

        // Check if permission already exists
        Permission existing = permissionDao.findByRoleIdAndResourceAndOperation(roleId, resource, operation);
        if (existing != null) {
            return existing;
        }

        // Get role to obtain tenant ID
        Role role = roleDao.findById(TenantId.SYS_TENANT_ID, roleId.getId());
        if (role == null) {
            throw new IllegalArgumentException("Role not found: " + roleId);
        }

        Permission permission = new Permission();
        permission.setId(new PermissionId(UUID.randomUUID()));
        permission.setRoleId(roleId);
        permission.setResource(resource);
        permission.setOperation(operation);
        permission.setCreatedTime(System.currentTimeMillis());

        return permissionDao.save(role.getTenantId(), permission);
    }

    @Override
    @CacheEvict(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, allEntries = true)
    public void removePermissionFromRole(RoleId roleId, String resource, String operation) {
        log.trace("Executing removePermissionFromRole [{}][{}][{}]", roleId, resource, operation);
        Permission permission = permissionDao.findByRoleIdAndResourceAndOperation(roleId, resource, operation);
        if (permission != null) {
            permissionDao.removeById(TenantId.SYS_TENANT_ID, permission.getId().getId());
        }
    }

    @Override
    public List<Permission> findPermissionsByRoleId(RoleId roleId) {
        log.trace("Executing findPermissionsByRoleId [{}]", roleId);
        return permissionDao.findByRoleId(roleId);
    }

    @Override
    @Cacheable(cacheNames = CacheConstants.USER_PERMISSIONS_CACHE, key = "#userId")
    public List<Permission> findPermissionsByUserId(UserId userId) {
        log.trace("Executing findPermissionsByUserId [{}]", userId);
        List<UserRole> userRoles = userRoleDao.findByUserId(userId);
        List<RoleId> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .collect(Collectors.toList());

        if (roleIds.isEmpty()) {
            return List.of();
        }

        return permissionDao.findByRoleIds(roleIds);
    }

    @Override
    public boolean hasPermission(UserId userId, String resource, String operation) {
        log.trace("Executing hasPermission [{}][{}][{}]", userId, resource, operation);
        List<Permission> permissions = findPermissionsByUserId(userId);

        return permissions.stream()
                .anyMatch(p ->
                    (p.getResource().equals(resource) || p.getResource().equals("ALL")) &&
                    (p.getOperation().equals(operation) || p.getOperation().equals("ALL"))
                );
    }

    @Override
    public Optional<HasId<?>> findEntity(TenantId tenantId, EntityId entityId) {
        return Optional.ofNullable(findRoleById(tenantId, new RoleId(entityId.getId())));
    }

    @Override
    public EntityType getEntityType() {
        return EntityType.ROLE;
    }

}
