///
/// Copyright © 2016-2025 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { Injectable } from '@angular/core';
import { defaultHttpOptionsFromConfig, RequestConfig } from './http-utils';
import { Role, Permission, UserRole, RoleTemplate } from '@shared/models/role.models';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(
    private http: HttpClient
  ) { }

  public getRoles(pageLink: PageLink, config?: RequestConfig): Observable<PageData<Role>> {
    return this.http.get<PageData<Role>>(`/api/roles${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getRole(roleId: string, config?: RequestConfig): Observable<Role> {
    return this.http.get<Role>(`/api/role/${roleId}`, defaultHttpOptionsFromConfig(config));
  }

  public getRoleByName(name: string, config?: RequestConfig): Observable<Role> {
    return this.http.get<Role>(`/api/role/name/${encodeURIComponent(name)}`,
      defaultHttpOptionsFromConfig(config));
  }

  public saveRole(role: Role, config?: RequestConfig): Observable<Role> {
    return this.http.post<Role>('/api/role', role, defaultHttpOptionsFromConfig(config));
  }

  public deleteRole(roleId: string, config?: RequestConfig): Observable<void> {
    return this.http.delete<void>(`/api/role/${roleId}`, defaultHttpOptionsFromConfig(config));
  }

  public getSystemRoles(config?: RequestConfig): Observable<Role[]> {
    return this.http.get<Role[]>('/api/roles/system', defaultHttpOptionsFromConfig(config));
  }

  // Permission endpoints
  public getRolePermissions(roleId: string, config?: RequestConfig): Observable<Permission[]> {
    return this.http.get<Permission[]>(`/api/role/${roleId}/permissions`,
      defaultHttpOptionsFromConfig(config));
  }

  public savePermission(permission: Permission, config?: RequestConfig): Observable<Permission> {
    return this.http.post<Permission>('/api/permission', permission, defaultHttpOptionsFromConfig(config));
  }

  public deletePermission(permissionId: string, config?: RequestConfig): Observable<void> {
    return this.http.delete<void>(`/api/permission/${permissionId}`, defaultHttpOptionsFromConfig(config));
  }

  public deleteRolePermissions(roleId: string, config?: RequestConfig): Observable<void> {
    return this.http.delete<void>(`/api/role/${roleId}/permissions`, defaultHttpOptionsFromConfig(config));
  }

  // User-Role endpoints
  public assignRoleToUser(userId: string, roleId: string, config?: RequestConfig): Observable<UserRole> {
    return this.http.post<UserRole>(`/api/user/${userId}/role/${roleId}`, null,
      defaultHttpOptionsFromConfig(config));
  }

  public unassignRoleFromUser(userId: string, roleId: string, config?: RequestConfig): Observable<void> {
    return this.http.delete<void>(`/api/user/${userId}/role/${roleId}`, defaultHttpOptionsFromConfig(config));
  }

  public getUserRoles(userId: string, config?: RequestConfig): Observable<Role[]> {
    return this.http.get<Role[]>(`/api/user/${userId}/roles`, defaultHttpOptionsFromConfig(config));
  }

  public getRoleUsers(roleId: string, pageLink: PageLink, config?: RequestConfig): Observable<PageData<UserRole>> {
    return this.http.get<PageData<UserRole>>(`/api/role/${roleId}/users${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getUserPermissions(userId: string, config?: RequestConfig): Observable<Permission[]> {
    return this.http.get<Permission[]>(`/api/user/${userId}/permissions`,
      defaultHttpOptionsFromConfig(config));
  }

  public checkUserPermission(userId: string, resource: string, operation: string,
                             config?: RequestConfig): Observable<boolean> {
    return this.http.get<boolean>(`/api/user/${userId}/permission/check`,
      {
        ...defaultHttpOptionsFromConfig(config),
        params: { resource, operation }
      });
  }

  // Role Template endpoints
  public getRoleTemplates(category?: string, config?: RequestConfig): Observable<RoleTemplate[]> {
    let url = '/api/role/templates';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    return this.http.get<RoleTemplate[]>(url, defaultHttpOptionsFromConfig(config));
  }

  public createRoleFromTemplate(templateId: string, roleName: string,
                                config?: RequestConfig): Observable<Role> {
    return this.http.post<Role>(`/api/role/template/${templateId}/create`,
      { name: roleName },
      defaultHttpOptionsFromConfig(config));
  }

  public saveRoleAsTemplate(roleId: string, template: RoleTemplate,
                            config?: RequestConfig): Observable<RoleTemplate> {
    return this.http.post<RoleTemplate>(`/api/role/${roleId}/template`, template,
      defaultHttpOptionsFromConfig(config));
  }
}
