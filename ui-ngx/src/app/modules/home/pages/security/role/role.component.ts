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

import { ChangeDetectorRef, Component, Inject, Optional } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { EntityComponent } from '../../../components/entity/entity.component';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Role } from '@shared/models/role.models';
import { EntityTableConfig } from '@home/models/entity/entities-table-config.models';
import { ActionNotificationShow } from '@app/core/notification/notification.actions';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'tb-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.scss']
})
export class RoleComponent extends EntityComponent<Role> {

  constructor(
    protected store: Store<AppState>,
    @Optional() @Inject('entity') protected entityValue: Role,
    @Optional() @Inject('entitiesTableConfig') protected entitiesTableConfigValue: EntityTableConfig<Role>,
    public fb: UntypedFormBuilder,
    protected cd: ChangeDetectorRef,
    protected translate: TranslateService
  ) {
    super(store, fb, entityValue, entitiesTableConfigValue, cd);
  }

  hideDelete() {
    if (this.entitiesTableConfig) {
      return !this.entitiesTableConfig.deleteEnabled(this.entity);
    } else {
      return this.entity?.systemRole || false;
    }
  }

  isSystemRole(): boolean {
    return this.entity?.systemRole === true;
  }

  buildForm(entity: Role): UntypedFormGroup {
    return this.fb.group({
      name: [
        { value: entity ? entity.name : '', disabled: this.isSystemRole() },
        [Validators.required, Validators.maxLength(255)]
      ],
      description: [
        entity ? entity.description : '',
        [Validators.maxLength(1000)]
      ]
    });
  }

  updateForm(entity: Role) {
    this.entityForm.patchValue({ name: entity.name });
    this.entityForm.patchValue({ description: entity.description });

    if (this.isSystemRole()) {
      this.entityForm.get('name').disable();
    }
  }

  onRoleIdCopied($event) {
    this.store.dispatch(new ActionNotificationShow({
      message: this.translate.instant('role.idCopiedMessage'),
      type: 'success',
      duration: 750,
      verticalPosition: 'bottom',
      horizontalPosition: 'right'
    }));
  }
}
