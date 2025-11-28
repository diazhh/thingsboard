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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '@core/http/user.service';
import { User, ActivationMethod, ActivationLinkInfo, activationMethodTranslations } from '@shared/models/user.model';
import { Authority } from '@shared/models/authority.enum';
import { TenantId } from '@shared/models/id/tenant-id';
import { CustomerId } from '@shared/models/id/customer-id';
import { DialogComponent } from '@shared/components/dialog.component';
import { Observable, switchMap } from 'rxjs';
import { ActivationLinkDialogComponent, ActivationLinkDialogData } from '@modules/home/pages/user/activation-link-dialog.component';

// Enum para método de activación extendido
export enum ExtendedActivationMethod {
  DISPLAY_ACTIVATION_LINK = 'DISPLAY_ACTIVATION_LINK',
  SEND_ACTIVATION_MAIL = 'SEND_ACTIVATION_MAIL',
  SET_PASSWORD_DIRECTLY = 'SET_PASSWORD_DIRECTLY'
}

export interface RoleOption {
  value: Authority;
  label: string;
}

export interface AddTenantUserDialogData {
  tenantId: string;
  availableRoles: RoleOption[];
}

@Component({
  selector: 'tb-add-tenant-user-dialog',
  templateUrl: './add-tenant-user-dialog.component.html',
  styleUrls: ['./add-tenant-user-dialog.component.scss']
})
export class AddTenantUserDialogComponent extends DialogComponent<AddTenantUserDialogComponent, User> implements OnInit {

  userForm: UntypedFormGroup;
  
  // Métodos de activación extendidos
  extendedActivationMethods = [
    { value: ExtendedActivationMethod.SET_PASSWORD_DIRECTLY, label: 'Establecer contraseña directamente' },
    { value: ExtendedActivationMethod.DISPLAY_ACTIVATION_LINK, label: 'Mostrar enlace de activación' },
    { value: ExtendedActivationMethod.SEND_ACTIVATION_MAIL, label: 'Enviar email de activación' }
  ];
  
  activationMethod = ExtendedActivationMethod.SET_PASSWORD_DIRECTLY;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    protected store: Store<AppState>,
    protected router: Router,
    @Inject(MAT_DIALOG_DATA) public data: AddTenantUserDialogData,
    public dialogRef: MatDialogRef<AddTenantUserDialogComponent, User>,
    private fb: UntypedFormBuilder,
    private userService: UserService,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    super(store, router, dialogRef);
  }

  ngOnInit(): void {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: [''],
      authority: [Authority.OPERADOR, Validators.required],
      description: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Validador para confirmar que las contraseñas coinciden
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  // Verificar si se requiere contraseña
  get requiresPassword(): boolean {
    return this.activationMethod === ExtendedActivationMethod.SET_PASSWORD_DIRECTLY;
  }

  // Actualizar validadores cuando cambia el método de activación
  onActivationMethodChange(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');
    
    if (this.requiresPassword) {
      passwordControl.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl.setValidators([Validators.required]);
    } else {
      passwordControl.clearValidators();
      confirmPasswordControl.clearValidators();
      passwordControl.setValue('');
      confirmPasswordControl.setValue('');
    }
    passwordControl.updateValueAndValidity();
    confirmPasswordControl.updateValueAndValidity();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  add(): void {
    if (this.userForm.valid || (!this.requiresPassword && this.isFormValidWithoutPassword())) {
      const formValue = this.userForm.value;
      
      const user: User = {
        email: formValue.email,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        phone: formValue.phone || '',
        authority: formValue.authority,
        tenantId: new TenantId(this.data.tenantId),
        customerId: new CustomerId('13814000-1dd2-11b2-8080-808080808080'), // NULL UUID for tenant users
        additionalInfo: {
          description: formValue.description || ''
        }
      } as User;

      const sendActivationEmail = this.activationMethod === ExtendedActivationMethod.SEND_ACTIVATION_MAIL;
      
      this.userService.saveUser(user, sendActivationEmail).subscribe({
        next: (savedUser) => {
          if (this.activationMethod === ExtendedActivationMethod.SET_PASSWORD_DIRECTLY) {
            // Obtener el token de activación y establecer la contraseña directamente
            this.userService.getActivationLink(savedUser.id.id).subscribe({
              next: (activationLink) => {
                // Extraer el token del link
                const activateToken = this.extractActivateToken(activationLink);
                if (activateToken) {
                  // Activar el usuario con la contraseña
                  this.activateUserWithPassword(activateToken, formValue.password).subscribe({
                    next: () => {
                      this.dialogRef.close(savedUser);
                    },
                    error: (err) => {
                      console.error('Error activating user:', err);
                      // Aún así cerramos con el usuario creado
                      this.dialogRef.close(savedUser);
                    }
                  });
                } else {
                  this.dialogRef.close(savedUser);
                }
              },
              error: () => {
                this.dialogRef.close(savedUser);
              }
            });
          } else if (this.activationMethod === ExtendedActivationMethod.DISPLAY_ACTIVATION_LINK) {
            this.userService.getActivationLinkInfo(savedUser.id.id).subscribe((activationLinkInfo) => {
              this.displayActivationLink(activationLinkInfo).subscribe(() => {
                this.dialogRef.close(savedUser);
              });
            });
          } else {
            this.dialogRef.close(savedUser);
          }
        },
        error: (error) => {
          console.error('Error creating user:', error);
        }
      });
    }
  }

  // Verificar si el formulario es válido sin los campos de contraseña
  private isFormValidWithoutPassword(): boolean {
    const controls = ['email', 'firstName', 'lastName', 'authority'];
    return controls.every(name => this.userForm.get(name)?.valid);
  }

  // Extraer el token de activación del link
  private extractActivateToken(activationLink: string): string | null {
    try {
      const url = new URL(activationLink);
      return url.searchParams.get('activateToken');
    } catch {
      // Si no es una URL válida, intentar extraer el token directamente
      const match = activationLink.match(/activateToken=([^&]+)/);
      return match ? match[1] : null;
    }
  }

  // Activar usuario con contraseña usando el endpoint noauth
  private activateUserWithPassword(activateToken: string, password: string): Observable<any> {
    return this.http.post('/api/noauth/activate?sendActivationMail=false', {
      activateToken,
      password
    });
  }

  displayActivationLink(activationLinkInfo: ActivationLinkInfo): Observable<void> {
    return this.dialog.open<ActivationLinkDialogComponent, ActivationLinkDialogData, void>(
      ActivationLinkDialogComponent, {
        disableClose: true,
        panelClass: ['tb-dialog', 'tb-fullscreen-dialog'],
        data: { activationLinkInfo }
      }
    ).afterClosed();
  }

  getRoleIcon(authority: Authority): string {
    const icons: { [key: string]: string } = {
      [Authority.TENANT_ADMIN]: 'admin_panel_settings',
      [Authority.INGENIERO]: 'engineering',
      [Authority.OPERADOR]: 'person',
      [Authority.REPORTES]: 'assessment',
      [Authority.LABORATORIO]: 'science'
    };
    return icons[authority] || 'person';
  }

  getRoleDescription(authority: Authority): string {
    const descriptions: { [key: string]: string } = {
      [Authority.TENANT_ADMIN]: 'Acceso completo al sistema. Puede gestionar usuarios, configuraciones y todos los recursos.',
      [Authority.INGENIERO]: 'Acceso a configuración de tanques, monitoreo, reglas y entidades. Puede modificar configuraciones técnicas.',
      [Authority.OPERADOR]: 'Acceso a monitoreo de tanques, alarmas y dashboards. Solo lectura de configuraciones.',
      [Authority.REPORTES]: 'Acceso a dashboards, monitoreo y logs de auditoría. Enfocado en reportes y análisis.',
      [Authority.LABORATORIO]: 'Acceso a monitoreo de tanques y gestión de assets. Enfocado en datos de laboratorio.'
    };
    return descriptions[authority] || 'Rol personalizado';
  }
}
