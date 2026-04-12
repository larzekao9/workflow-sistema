import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { RoleService } from '../../shared/services/role.service';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../shared/models/role.model';

export interface RoleFormData {
  role?: Role;
}

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatChipsModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Editar Rol' : 'Nuevo Rol' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" novalidate class="form-container">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del rol</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: Administrador" />
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">Campo obligatorio</mat-error>
          <mat-error *ngIf="form.get('nombre')?.hasError('minlength')">Mínimo 3 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="3" placeholder="Describe las responsabilidades de este rol..."></textarea>
        </mat-form-field>

        <!-- Permisos como chips editables -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Permisos</mat-label>
          <mat-chip-grid #chipGrid>
            <mat-chip-row
              *ngFor="let perm of permisos"
              (removed)="removePermission(perm)">
              {{ perm }}
              <button matChipRemove>
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip-row>
          </mat-chip-grid>
          <input
            placeholder="Agregar permiso (Enter para confirmar)..."
            [matChipInputFor]="chipGrid"
            [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
            (matChipInputTokenEnd)="addPermission($event)" />
          <mat-hint>Presioná Enter o coma para agregar un permiso</mat-hint>
        </mat-form-field>

        <mat-slide-toggle *ngIf="isEditMode" formControlName="activo" color="primary">
          Rol activo
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
    .form-container { display: flex; flex-direction: column; gap: 8px; min-width: 400px; padding-top: 8px; }
    .full-width { width: 100%; }
    .error-message { color: #f44336; font-size: 13px; padding: 8px 0; }
  `]
})
export class RoleFormComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean;
  isLoading = false;
  errorMessage = '';
  permisos: string[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RoleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleFormData
  ) {
    this.isEditMode = !!data?.role;
    this.permisos = data?.role?.permisos ? [...data.role.permisos] : [];

    this.form = this.fb.group({
      nombre: [data?.role?.nombre ?? '', [Validators.required, Validators.minLength(3)]],
      descripcion: [data?.role?.descripcion ?? ''],
      activo: [data?.role?.activo ?? true]
    });
  }

  ngOnInit(): void {}

  addPermission(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.permisos.includes(value)) {
      this.permisos.push(value);
    }
    event.chipInput!.clear();
  }

  removePermission(perm: string): void {
    const idx = this.permisos.indexOf(perm);
    if (idx >= 0) {
      this.permisos.splice(idx, 1);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isEditMode && this.data.role) {
      const updateData: UpdateRoleRequest = {
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion,
        permisos: this.permisos,
        activo: this.form.value.activo
      };

      this.roleService.update(this.data.role.id, updateData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Rol actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al actualizar el rol.';
        }
      });
    } else {
      const createData: CreateRoleRequest = {
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion,
        permisos: this.permisos
      };

      this.roleService.create(createData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Rol creado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al crear el rol.';
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
