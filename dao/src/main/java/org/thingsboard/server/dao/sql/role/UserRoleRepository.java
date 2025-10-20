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

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.thingsboard.server.dao.model.sql.UserRoleEntity;

import java.util.List;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRoleEntity, UserRoleEntity.UserRoleCompositeKey> {

    List<UserRoleEntity> findByUserId(UUID userId);

    List<UserRoleEntity> findByRoleId(UUID roleId);

    @Query("SELECT ur FROM UserRoleEntity ur WHERE ur.userId IN :userIds")
    List<UserRoleEntity> findByUserIds(@Param("userIds") List<UUID> userIds);

    @Modifying
    @Query("DELETE FROM UserRoleEntity ur WHERE ur.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM UserRoleEntity ur WHERE ur.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") UUID roleId);

    @Modifying
    @Query("DELETE FROM UserRoleEntity ur WHERE ur.userId = :userId AND ur.roleId = :roleId")
    void deleteByUserIdAndRoleId(@Param("userId") UUID userId, @Param("roleId") UUID roleId);

}
