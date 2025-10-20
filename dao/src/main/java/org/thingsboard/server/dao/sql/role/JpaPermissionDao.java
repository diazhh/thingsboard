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
package org.thingsboard.server.dao.sql.role;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.EntityType;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.permission.Permission;
import org.thingsboard.server.dao.DaoUtil;
import org.thingsboard.server.dao.model.sql.PermissionEntity;
import org.thingsboard.server.dao.role.PermissionDao;
import org.thingsboard.server.dao.sql.JpaAbstractDao;
import org.thingsboard.server.dao.util.SqlDao;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@SqlDao
public class JpaPermissionDao extends JpaAbstractDao<PermissionEntity, Permission> implements PermissionDao {

    @Autowired
    private PermissionRepository permissionRepository;

    @Override
    protected Class<PermissionEntity> getEntityClass() {
        return PermissionEntity.class;
    }

    @Override
    protected JpaRepository<PermissionEntity, UUID> getRepository() {
        return permissionRepository;
    }

    @Override
    public List<Permission> findByRoleId(RoleId roleId) {
        return DaoUtil.convertDataList(permissionRepository.findByRoleId(roleId.getId()));
    }

    @Override
    public List<Permission> findByRoleIds(List<RoleId> roleIds) {
        List<UUID> uuidList = roleIds.stream().map(RoleId::getId).collect(Collectors.toList());
        return DaoUtil.convertDataList(permissionRepository.findByRoleIds(uuidList));
    }

    @Override
    public Permission findByRoleIdAndResourceAndOperation(RoleId roleId, String resource, String operation) {
        return DaoUtil.getData(permissionRepository.findByRoleIdAndResourceAndOperation(roleId.getId(), resource, operation));
    }

    @Override
    @Transactional
    public void deleteByRoleId(RoleId roleId) {
        permissionRepository.deleteByRoleId(roleId.getId());
    }

    @Override
    @Transactional
    public void deleteByRoleIdAndResource(RoleId roleId, String resource) {
        permissionRepository.deleteByRoleIdAndResource(roleId.getId(), resource);
    }

    @Override
    public EntityType getEntityType() {
        return EntityType.PERMISSION;
    }

}
