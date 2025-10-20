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
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.permission.UserRole;
import org.thingsboard.server.dao.DaoUtil;
import org.thingsboard.server.dao.model.sql.UserRoleEntity;
import org.thingsboard.server.dao.role.UserRoleDao;
import org.thingsboard.server.dao.util.SqlDao;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@SqlDao
public class JpaUserRoleDao implements UserRoleDao {

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Override
    public UserRole save(UserRole userRole) {
        UserRoleEntity entity = new UserRoleEntity(userRole);
        UserRoleEntity saved = userRoleRepository.save(entity);
        return saved.toData();
    }

    @Override
    public List<UserRole> findByUserId(UserId userId) {
        return userRoleRepository.findByUserId(userId.getId()).stream()
                .map(UserRoleEntity::toData)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserRole> findByRoleId(RoleId roleId) {
        return userRoleRepository.findByRoleId(roleId.getId()).stream()
                .map(UserRoleEntity::toData)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserRole> findByUserIds(List<UserId> userIds) {
        List<UUID> uuidList = userIds.stream().map(UserId::getId).collect(Collectors.toList());
        return userRoleRepository.findByUserIds(uuidList).stream()
                .map(UserRoleEntity::toData)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteByUserId(UserId userId) {
        userRoleRepository.deleteByUserId(userId.getId());
    }

    @Override
    @Transactional
    public void deleteByRoleId(RoleId roleId) {
        userRoleRepository.deleteByRoleId(roleId.getId());
    }

    @Override
    @Transactional
    public void deleteByUserIdAndRoleId(UserId userId, RoleId roleId) {
        userRoleRepository.deleteByUserIdAndRoleId(userId.getId(), roleId.getId());
    }

}
