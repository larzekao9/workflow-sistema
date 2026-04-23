import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DepartmentService } from '../../shared/services/department.service';
import { Department, DepartmentRequest } from '../../shared/models/department.model';

export interface DepartmentFormDialogData {
  department?: Department;
}

@Component({
  selector: 'app-department-form-dialog',
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
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Editar Departamento' : 'Nuevo Departamento' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" novalidate class="form-container">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" autocomplete="off" />
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
          <mat-error *ngIf="form.get('nombre')?.hasError('minlength')">Mínimo 2 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            formControlName="descripcion"
            rows="3"
            placeholder="Descripción opcional del departamento">
          </textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Responsable</mat-label>
          <input matInput formControlName="responsable" autocomplete="off" />
        </mat-form-field>

        <mat-slide-toggle formControlName="activa" color="primary">
          Departamento activo
        </mat-slide-toggle>

        <div *ngIf="errorMessage" class="error-message" role="alert">
          {{ errorMessage }}
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isLoading">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="isLoading || form.invalid">
        <mat-spinner *ngIf="isLoading" diameter="18" style="display:inline-block; margin-right:6px;"></mat-spinner>
        <span *ngIf="!isLoading">{{ isEditMode ? 'Guardar' : 'Crear' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 340px;
      padding-top: 8px;
    }
    .full-width { width: 100%; }
    .error-message { color: #b71c1c; font-size: 13px; padding: 8px 0; }

    @media (max-width: 400px) {
      .form-container { min-width: unset; width: 100%; }
    }
  `]
})
export class DepartmentFormDialogComponent {
  form: FormGroup;
  isEditMode: boolean;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<DepartmentFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentFormDialogData
  ) {
    this.isEditMode = !!data?.department;

    this.form = this.fb.group({
      nombre: [
        data?.department?.nombre ?? '',
        [Validators.required, Validators.minLength(2)]
      ],
      descripcion: [data?.department?.descripcion ?? ''],
      responsable: [data?.department?.responsable ?? ''],
      activa: [data?.department?.activa ?? true]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const body: DepartmentRequest = {
      nombre: this.form.value.nombre.trim(),
      descripcion: this.form.value.descripcion?.trim() || undefined,
      responsable: this.form.value.responsable?.trim() || undefined,
      activa: this.form.value.activa
    };

    if (this.isEditMode && this.data.department) {
      this.departmentService.update(this.data.department.id, body).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Departamento actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al actualizar el departamento.';
          console.error('Error actualizando departamento:', err);
        }
      });
    } else {
      this.departmentService.create(body).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Departamento creado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al crear el departamento.';
          console.error('Error creando departamento:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
