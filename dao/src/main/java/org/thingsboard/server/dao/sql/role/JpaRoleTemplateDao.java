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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.EntityType;
import org.thingsboard.server.common.data.permission.RoleTemplate;
import org.thingsboard.server.dao.DaoUtil;
import org.thingsboard.server.dao.model.sql.RoleTemplateEntity;
import org.thingsboard.server.dao.role.RoleTemplateDao;
import org.thingsboard.server.dao.sql.JpaAbstractDao;
import org.thingsboard.server.dao.util.SqlDao;

import java.util.List;
import java.util.UUID;

@Component
@SqlDao
public class JpaRoleTemplateDao extends JpaAbstractDao<RoleTemplateEntity, RoleTemplate> implements RoleTemplateDao {

    @Autowired
    private RoleTemplateRepository roleTemplateRepository;

    @Override
    protected Class<RoleTemplateEntity> getEntityClass() {
        return RoleTemplateEntity.class;
    }

    @Override
    protected JpaRepository<RoleTemplateEntity, UUID> getRepository() {
        return roleTemplateRepository;
    }

    @Override
    public RoleTemplate findByName(String name) {
        return DaoUtil.getData(roleTemplateRepository.findByName(name));
    }

    @Override
    public List<RoleTemplate> findByCategory(String category) {
        return DaoUtil.convertDataList(roleTemplateRepository.findByCategory(category));
    }

    @Override
    public List<RoleTemplate> findAll() {
        return DaoUtil.convertDataList(roleTemplateRepository.findAll());
    }

    @Override
    public EntityType getEntityType() {
        return EntityType.ROLE_TEMPLATE;
    }

}
