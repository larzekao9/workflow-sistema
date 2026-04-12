import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserService } from '../../shared/services/user.service';
import { RoleService } from '../../shared/services/role.service';
import { User, CreateUserRequest, UpdateUserRequest } from '../../shared/models/user.model';
import { Role } from '../../shared/models/role.model';

export interface UserFormData {
  user?: User;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" novalidate class="form-container">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombreCompleto" />
          <mat-error *ngIf="form.get('nombreCompleto')?.hasError('required')">Campo obligatorio</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de usuario</mat-label>
          <input matInput formControlName="username" />
          <mat-error *ngIf="form.get('username')?.hasError('required')">Campo obligatorio</mat-error>
          <mat-error *ngIf="form.get('username')?.hasError('minlength')">Mínimo 3 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Campo obligatorio</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Correo inválido</mat-error>
        </mat-form-field>

        <mat-form-field *ngIf="!isEditMode" appearance="outline" class="full-width">
          <mat-label>Contraseña</mat-label>
          <input matInput type="password" formControlName="password" />
          <mat-error *ngIf="form.get('password')?.hasError('required')">Campo obligatorio</mat-error>
          <mat-error *ngIf="form.get('password')?.hasError('minlength')">Mínimo 6 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rolId">
            <mat-option *ngFor="let role of roles" [value]="role.id">
              {{ role.nombre }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('rolId')?.hasError('required')">Seleccioná un rol</mat-error>
        </mat-form-field>

        <mat-slide-toggle *ngIf="isEditMode" formControlName="activo" color="primary">
          Usuario activo
        </mat-slide-toggle>

        <div *ngIf="errorMessage" class="error-message">{{ errorMessage }}</div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isLoading">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="isLoading || form.invalid">
        <mat-spinner *ngIf="isLoading" diameter="18" style="display:inline-block"></mat-spinner>
        <span *ngIf="!isLoading">{{ isEditMode ? 'Guardar' : 'Crear' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; gap: 4px; min-width: 380px; padding-top: 8px; }
    .full-width { width: 100%; }
    .error-message { color: #f44336; font-size: 13px; padding: 8px 0; }
  `]
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean;
  isLoading = false;
  errorMessage = '';
  roles: Role[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormData
  ) {
    this.isEditMode = !!data?.user;

    this.form = this.fb.group({
      nombreCompleto: [data?.user?.nombreCompleto ?? '', [Validators.required]],
      username: [data?.user?.username ?? '', [Validators.required, Validators.minLength(3)]],
      email: [data?.user?.email ?? '', [Validators.required, Validators.email]],
      password: [
        '',
        this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]
      ],
      rolId: [data?.user?.rolId ?? '', [Validators.required]],
      activo: [data?.user?.activo ?? true]
    });
  }

  ngOnInit(): void {
    this.roleService.getAll().subscribe({
      next: (roles) => { this.roles = roles; },
      error: () => { this.roles = []; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isEditMode && this.data.user) {
      const updateData: UpdateUserRequest = {
        nombreCompleto: this.form.value.nombreCompleto,
        rolId: this.form.value.rolId,
        activo: this.form.value.activo
      };

      this.userService.update(this.data.user.id, updateData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Usuario actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al actualizar el usuario.';
        }
      });
    } else {
      const createData: CreateUserRequest = {
        nombreCompleto: this.form.value.nombreCompleto,
        username: this.form.value.username,
        email: this.form.value.email,
        password: this.form.value.password,
        rolId: this.form.value.rolId
      };

      this.userService.create(createData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Usuario creado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al crear el usuario.';
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
