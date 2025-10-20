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
import org.thingsboard.server.dao.model.sql.PermissionEntity;

import java.util.List;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<PermissionEntity, UUID> {

    List<PermissionEntity> findByRoleId(UUID roleId);

    @Query("SELECT p FROM PermissionEntity p WHERE p.roleId IN :roleIds")
    List<PermissionEntity> findByRoleIds(@Param("roleIds") List<UUID> roleIds);

    PermissionEntity findByRoleIdAndResourceAndOperation(UUID roleId, String resource, String operation);

    @Modifying
    @Query("DELETE FROM PermissionEntity p WHERE p.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") UUID roleId);

    @Modifying
    @Query("DELETE FROM PermissionEntity p WHERE p.roleId = :roleId AND p.resource = :resource")
    void deleteByRoleIdAndResource(@Param("roleId") UUID roleId, @Param("resource") String resource);

}
