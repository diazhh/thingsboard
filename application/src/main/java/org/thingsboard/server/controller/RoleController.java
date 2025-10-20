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
package org.thingsboard.server.controller;

import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.thingsboard.server.common.data.exception.ThingsboardException;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.page.PageData;
import org.thingsboard.server.common.data.page.PageLink;
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.common.data.permission.Role;
import org.thingsboard.server.common.data.permission.RoleTemplate;
import org.thingsboard.server.common.data.permission.UserRole;
import org.thingsboard.server.config.annotations.ApiOperation;
import org.thingsboard.server.dao.role.RoleService;
import org.thingsboard.server.dao.role.RoleTemplateDao;
import org.thingsboard.server.queue.util.TbCoreComponent;
import org.thingsboard.server.service.security.permission.Operation;
import org.thingsboard.server.service.security.permission.Resource;

import java.util.List;

import static org.thingsboard.server.controller.ControllerConstants.PAGE_DATA_PARAMETERS;
import static org.thingsboard.server.controller.ControllerConstants.PAGE_NUMBER_DESCRIPTION;
import static org.thingsboard.server.controller.ControllerConstants.PAGE_SIZE_DESCRIPTION;
import static org.thingsboard.server.controller.ControllerConstants.SORT_ORDER_DESCRIPTION;
import static org.thingsboard.server.controller.ControllerConstants.SORT_PROPERTY_DESCRIPTION;
import static org.thingsboard.server.controller.ControllerConstants.TENANT_OR_CUSTOMER_AUTHORITY_PARAGRAPH;

@RequiredArgsConstructor
@RestController
@TbCoreComponent
@RequestMapping("/api")
public class RoleController extends BaseController {

    public static final String ROLE_ID = "roleId";
    public static final String USER_ID = "userId";

    private final RoleService roleService;
    private final RoleTemplateDao roleTemplateDao;

    // ==================== ROLE CRUD OPERATIONS ====================

    @ApiOperation(value = "Get Role (getRoleById)",
            notes = "Fetch the Role object based on the provided Role Id. " +
                    TENANT_OR_CUSTOMER_AUTHORITY_PARAGRAPH)
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/role/{roleId}")
    @ResponseBody
    public Role getRoleById(
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId) throws ThingsboardException {
        checkParameter(ROLE_ID, strRoleId);
        RoleId roleId = new RoleId(toUUID(strRoleId));
        return checkEntityId(roleId, roleService::findRoleById, Operation.READ);
    }

    @ApiOperation(value = "Create Or Update Role (saveRole)",
            notes = "Creates or Updates the Role. " +
                    "When creating role, platform generates Role Id as time-based UUID. " +
                    "The newly created Role id will be present in the response. " +
                    "Specify existing Role id to update the role. " +
                    "Referencing non-existing Role Id will cause 'Not Found' error." +
                    "\n\nRole name is unique in scope of tenant. " +
                    "Only users with 'SYS_ADMIN' or 'TENANT_ADMIN' authority can perform this operation.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @PostMapping(value = "/role")
    @ResponseBody
    public Role saveRole(
            @Parameter(description = "A JSON value representing the role.")
            @RequestBody Role role) throws ThingsboardException {
        role.setTenantId(getCurrentUser().getTenantId());
        checkEntity(role.getId(), role, Resource.ROLE);
        return roleService.saveRole(getTenantId(), role);
    }

    @ApiOperation(value = "Delete Role (deleteRole)",
            notes = "Deletes the Role and all associated permissions and user-role assignments. " +
                    "Referencing non-existing Role Id will cause 'Not Found' error. " +
                    "System roles cannot be deleted." +
                    TENANT_OR_CUSTOMER_AUTHORITY_PARAGRAPH)
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @DeleteMapping(value = "/role/{roleId}")
    @ResponseBody
    public void deleteRole(
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId) throws ThingsboardException {
        checkParameter(ROLE_ID, strRoleId);
        RoleId roleId = new RoleId(toUUID(strRoleId));
        Role role = checkEntityId(roleId, roleService::findRoleById, Operation.DELETE);
        roleService.deleteRole(getTenantId(), role);
    }

    @ApiOperation(value = "Get Tenant Roles (getRoles)",
            notes = "Returns a page of roles owned by tenant. " + PAGE_DATA_PARAMETERS +
                    TENANT_OR_CUSTOMER_AUTHORITY_PARAGRAPH)
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/roles")
    @ResponseBody
    public PageData<Role> getRoles(
            @Parameter(description = PAGE_SIZE_DESCRIPTION, required = true)
            @RequestParam int pageSize,
            @Parameter(description = PAGE_NUMBER_DESCRIPTION, required = true)
            @RequestParam int page,
            @Parameter(description = "Role search text")
            @RequestParam(required = false) String textSearch,
            @Parameter(description = SORT_PROPERTY_DESCRIPTION)
            @RequestParam(required = false) String sortProperty,
            @Parameter(description = SORT_ORDER_DESCRIPTION)
            @RequestParam(required = false) String sortOrder) throws ThingsboardException {
        PageLink pageLink = createPageLink(pageSize, page, textSearch, sortProperty, sortOrder);
        return checkNotNull(roleService.findRolesByTenantId(getTenantId(), pageLink));
    }

    @ApiOperation(value = "Get System Roles (getSystemRoles)",
            notes = "Returns a list of all system roles.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/roles/system")
    @ResponseBody
    public List<Role> getSystemRoles() throws ThingsboardException {
        return roleService.findSystemRoles();
    }

    @ApiOperation(value = "Get Custom Roles (getCustomRoles)",
            notes = "Returns a list of custom roles created by tenant.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/roles/custom")
    @ResponseBody
    public List<Role> getCustomRoles() throws ThingsboardException {
        return roleService.findCustomRolesByTenantId(getTenantId());
    }

    // ==================== USER-ROLE OPERATIONS ====================

    @ApiOperation(value = "Assign Role to User (assignRole)",
            notes = "Assigns a role to a user.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @PostMapping(value = "/user/{userId}/role/{roleId}")
    @ResponseBody
    public UserRole assignRoleToUser(
            @Parameter(description = "User ID (UUID string)")
            @PathVariable(USER_ID) String strUserId,
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId) throws ThingsboardException {
        checkParameter(USER_ID, strUserId);
        checkParameter(ROLE_ID, strRoleId);

        UserId userId = new UserId(toUUID(strUserId));
        RoleId roleId = new RoleId(toUUID(strRoleId));

        checkUserId(userId, Operation.WRITE);
        checkEntityId(roleId, roleService::findRoleById, Operation.READ);

        return roleService.assignRoleToUser(userId, roleId);
    }

    @ApiOperation(value = "Unassign Role from User (unassignRole)",
            notes = "Removes a role assignment from a user.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @DeleteMapping(value = "/user/{userId}/role/{roleId}")
    @ResponseBody
    public void unassignRoleFromUser(
            @Parameter(description = "User ID (UUID string)")
            @PathVariable(USER_ID) String strUserId,
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId) throws ThingsboardException {
        checkParameter(USER_ID, strUserId);
        checkParameter(ROLE_ID, strRoleId);

        UserId userId = new UserId(toUUID(strUserId));
        RoleId roleId = new RoleId(toUUID(strRoleId));

        checkUserId(userId, Operation.WRITE);

        roleService.unassignRoleFromUser(userId, roleId);
    }

    @ApiOperation(value = "Get User Roles (getUserRoles)",
            notes = "Returns a list of roles assigned to a user.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping(value = "/user/{userId}/roles")
    @ResponseBody
    public List<Role> getUserRoles(
            @Parameter(description = "User ID (UUID string)")
            @PathVariable(USER_ID) String strUserId) throws ThingsboardException {
        checkParameter(USER_ID, strUserId);
        UserId userId = new UserId(toUUID(strUserId));
        checkUserId(userId, Operation.READ);
        return roleService.findRolesByUserId(userId);
    }

    // ==================== PERMISSION OPERATIONS ====================

    @ApiOperation(value = "Add Permission to Role (addPermission)",
            notes = "Adds a permission to a role.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @PostMapping(value = "/role/{roleId}/permission")
    @ResponseBody
    public Permission addPermissionToRole(
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId,
            @Parameter(description = "Resource name (DEVICE, ASSET, etc.)")
            @RequestParam String resource,
            @Parameter(description = "Operation name (READ, WRITE, DELETE, etc.)")
            @RequestParam String operation) throws ThingsboardException {
        checkParameter(ROLE_ID, strRoleId);
        RoleId roleId = new RoleId(toUUID(strRoleId));
        checkEntityId(roleId, roleService::findRoleById, Operation.WRITE);
        return roleService.addPermissionToRole(roleId, resource, operation);
    }

    @ApiOperation(value = "Remove Permission from Role (removePermission)",
            notes = "Removes a permission from a role.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @DeleteMapping(value = "/role/{roleId}/permission")
    @ResponseBody
    public void removePermissionFromRole(
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId,
            @Parameter(description = "Resource name")
            @RequestParam String resource,
            @Parameter(description = "Operation name")
            @RequestParam String operation) throws ThingsboardException {
        checkParameter(ROLE_ID, strRoleId);
        RoleId roleId = new RoleId(toUUID(strRoleId));
        checkEntityId(roleId, roleService::findRoleById, Operation.WRITE);
        roleService.removePermissionFromRole(roleId, resource, operation);
    }

    @ApiOperation(value = "Get Role Permissions (getRolePermissions)",
            notes = "Returns a list of permissions for a role.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/role/{roleId}/permissions")
    @ResponseBody
    public List<Permission> getRolePermissions(
            @Parameter(description = "Role ID (UUID string)")
            @PathVariable(ROLE_ID) String strRoleId) throws ThingsboardException {
        checkParameter(ROLE_ID, strRoleId);
        RoleId roleId = new RoleId(toUUID(strRoleId));
        checkEntityId(roleId, roleService::findRoleById, Operation.READ);
        return roleService.findPermissionsByRoleId(roleId);
    }

    @ApiOperation(value = "Get User Permissions (getUserPermissions)",
            notes = "Returns all permissions for a user (from all assigned roles).")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN', 'CUSTOMER_USER')")
    @GetMapping(value = "/user/{userId}/permissions")
    @ResponseBody
    public List<Permission> getUserPermissions(
            @Parameter(description = "User ID (UUID string)")
            @PathVariable(USER_ID) String strUserId) throws ThingsboardException {
        checkParameter(USER_ID, strUserId);
        UserId userId = new UserId(toUUID(strUserId));
        checkUserId(userId, Operation.READ);
        return roleService.findPermissionsByUserId(userId);
    }

    // ==================== ROLE TEMPLATES ====================

    @ApiOperation(value = "Get Role Templates (getRoleTemplates)",
            notes = "Returns a list of all available role templates.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @GetMapping(value = "/role/templates")
    @ResponseBody
    public List<RoleTemplate> getRoleTemplates(
            @Parameter(description = "Category filter (optional)")
            @RequestParam(required = false) String category) throws ThingsboardException {
        return roleTemplateDao.findByCategory(category);
    }

    @ApiOperation(value = "Create Role from Template (createRoleFromTemplate)",
            notes = "Creates a new role based on a template.")
    @PreAuthorize("hasAnyAuthority('SYS_ADMIN', 'TENANT_ADMIN')")
    @PostMapping(value = "/role/template/{templateName}")
    @ResponseBody
    public Role createRoleFromTemplate(
            @Parameter(description = "Template name")
            @PathVariable String templateName,
            @Parameter(description = "New role name")
            @RequestParam String roleName) throws ThingsboardException {
        RoleTemplate template = roleTemplateDao.findByName(templateName);
        if (template == null) {
            throw new ThingsboardException("Role template not found: " + templateName,
                    org.thingsboard.server.common.data.exception.ThingsboardErrorCode.ITEM_NOT_FOUND);
        }

        // Create role
        Role role = new Role();
        role.setTenantId(getTenantId());
        role.setName(roleName);
        role.setDescription(template.getDescription());
        role.setSystemRole(false);
        Role savedRole = roleService.saveRole(getTenantId(), role);

        // Add permissions from template
        if (template.getPermissionsJson() != null && template.getPermissionsJson().isArray()) {
            template.getPermissionsJson().forEach(permNode -> {
                String resource = permNode.get("resource").asText();
                String operation = permNode.get("operation").asText();
                roleService.addPermissionToRole(savedRole.getId(), resource, operation);
            });
        }

        return savedRole;
    }

}
