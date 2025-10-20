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

import org.thingsboard.server.common.data.permission.RoleTemplate;
import org.thingsboard.server.dao.Dao;

import java.util.List;

public interface RoleTemplateDao extends Dao<RoleTemplate> {

    /**
     * Find role template by name.
     *
     * @param name the template name
     * @return the role template entity
     */
    RoleTemplate findByName(String name);

    /**
     * Find role templates by category.
     *
     * @param category the category
     * @return the list of role templates
     */
    List<RoleTemplate> findByCategory(String category);

    /**
     * Find all role templates.
     *
     * @return the list of all role templates
     */
    List<RoleTemplate> findAll();

}
