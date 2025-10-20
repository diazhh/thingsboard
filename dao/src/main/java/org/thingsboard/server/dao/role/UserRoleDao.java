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

import org.thingsboard.server.common.data.id.RoleId;
import org.thingsboard.server.common.data.id.UserId;
import org.thingsboard.server.common.data.permission.UserRole;

import java.util.List;

public interface UserRoleDao {

    /**
     * Save user role.
     *
     * @param userRole the user role
     * @return saved user role
     */
    UserRole save(UserRole userRole);

    /**
     * Find user roles by user id.
     *
     * @param userId the user id
     * @return the list of user roles
     */
    List<UserRole> findByUserId(UserId userId);

    /**
     * Find user roles by role id.
     *
     * @param roleId the role id
     * @return the list of user roles
     */
    List<UserRole> findByRoleId(RoleId roleId);

    /**
     * Find user roles by multiple user ids.
     *
     * @param userIds the list of user ids
     * @return the list of user roles
     */
    List<UserRole> findByUserIds(List<UserId> userIds);

    /**
     * Delete all roles for a user.
     *
     * @param userId the user id
     */
    void deleteByUserId(UserId userId);

    /**
     * Delete all users for a role.
     *
     * @param roleId the role id
     */
    void deleteByRoleId(RoleId roleId);

    /**
     * Delete specific user role.
     *
     * @param userId the user id
     * @param roleId the role id
     */
    void deleteByUserIdAndRoleId(UserId userId, RoleId roleId);

}
