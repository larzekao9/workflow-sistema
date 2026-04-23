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

import { EmpresaService } from '../../shared/services/empresa.service';
import { Empresa, EmpresaRequest } from '../../shared/models/empresa.model';

export interface EmpresaFormDialogData {
  empresa?: Empresa;
}

@Component({
  selector: 'app-empresa-form-dialog',
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
    <h2 mat-dialog-title>{{ isEditMode ? 'Editar Empresa' : 'Nueva Empresa' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" novalidate class="form-container">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre <span aria-hidden="true">*</span></mat-label>
          <input matInput formControlName="nombre" autocomplete="off" />
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
          <mat-error *ngIf="form.get('nombre')?.hasError('minlength')">Mínimo 2 caracteres</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Razón Social</mat-label>
          <input matInput formControlName="razonSocial" autocomplete="off" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>NIT / RUC</mat-label>
          <input matInput formControlName="nit" autocomplete="off" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email de contacto</mat-label>
          <input matInput formControlName="emailContacto" type="email" autocomplete="email" />
          <mat-error *ngIf="form.get('emailContacto')?.hasError('email')">Ingresá un email válido</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" type="tel" autocomplete="tel" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="direccion" autocomplete="street-address" />
        </mat-form-field>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Ciudad</mat-label>
            <input matInput formControlName="ciudad" autocomplete="address-level2" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>País</mat-label>
            <input matInput formControlName="pais" autocomplete="country-name" />
          </mat-form-field>
        </div>

        <mat-slide-toggle formControlName="activa" color="primary">
          Empresa activa
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
      min-width: 380px;
      padding-top: 8px;
    }
    .full-width { width: 100%; }
    .row-fields {
      display: flex;
      gap: 12px;
    }
    .half-width { flex: 1 1 0; min-width: 0; }
    .error-message { color: #b71c1c; font-size: 13px; padding: 8px 0; }

    @media (max-width: 480px) {
      .form-container { min-width: unset; width: 100%; }
      .row-fields { flex-direction: column; gap: 0; }
      .half-width { width: 100%; }
    }
  `]
})
export class EmpresaFormDialogComponent {
  form: FormGroup;
  isEditMode: boolean;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EmpresaFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmpresaFormDialogData
  ) {
    this.isEditMode = !!data?.empresa;

    this.form = this.fb.group({
      nombre: [
        data?.empresa?.nombre ?? '',
        [Validators.required, Validators.minLength(2)]
      ],
      razonSocial:    [data?.empresa?.razonSocial    ?? ''],
      nit:            [data?.empresa?.nit            ?? ''],
      emailContacto:  [data?.empresa?.emailContacto  ?? '', [Validators.email]],
      telefono:       [data?.empresa?.telefono       ?? ''],
      direccion:      [data?.empresa?.direccion      ?? ''],
      ciudad:         [data?.empresa?.ciudad         ?? ''],
      pais:           [data?.empresa?.pais           ?? ''],
      activa:         [data?.empresa?.activa         ?? true]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const body: EmpresaRequest = {
      nombre:        this.form.value.nombre.trim(),
      razonSocial:   this.form.value.razonSocial?.trim()   || undefined,
      nit:           this.form.value.nit?.trim()           || undefined,
      emailContacto: this.form.value.emailContacto?.trim() || undefined,
      telefono:      this.form.value.telefono?.trim()      || undefined,
      direccion:     this.form.value.direccion?.trim()     || undefined,
      ciudad:        this.form.value.ciudad?.trim()        || undefined,
      pais:          this.form.value.pais?.trim()          || undefined,
      activa:        this.form.value.activa
    };

    if (this.isEditMode && this.data.empresa) {
      this.empresaService.update(this.data.empresa.id, body).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Empresa actualizada correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al actualizar la empresa.';
          console.error('Error actualizando empresa:', err);
        }
      });
    } else {
      this.empresaService.create(body).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Empresa creada correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Error al crear la empresa.';
          console.error('Error creando empresa:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
