import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PoliticaService } from '../../shared/services/politica.service';
import { CreatePoliticaRequest } from '../../shared/models/politica.model';

@Component({
  selector: 'app-create-politica-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Nueva Política</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de la política</mat-label>
          <input
            matInput
            formControlName="nombre"
            placeholder="Ej: Autorización de compras"
            autofocus />
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">
            El nombre es obligatorio
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            formControlName="descripcion"
            rows="4"
            placeholder="Descripción de la política..."></textarea>
          <mat-error *ngIf="form.get('descripcion')?.hasError('required')">
            La descripción es obligatoria
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Departamento</mat-label>
          <input
            matInput
            formControlName="departamento"
            placeholder="Ej: Finanzas"
            [attr.disabled]="isSubmitting" />
        </mat-form-field>

        <div *ngIf="errorMessage" class="error-message">
          <mat-icon style="font-size:18px;width:18px;height:18px;">error_outline</mat-icon>
          {{ errorMessage }}
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-stroked-button
        (click)="onCancel()"
        [disabled]="isSubmitting">
        Cancelar
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="form.invalid || isSubmitting">
        <mat-spinner
          *ngIf="isSubmitting"
          diameter="16"
          style="display:inline-block;margin-right:6px"></mat-spinner>
        Crear
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 360px;
    }
    .full-width { width: 100%; }
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c62828;
      background: #ffebee;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 13px;
      margin-top: 8px;
    }
    mat-dialog-actions { padding: 16px 0 0 0; }
  `]
})
export class CreatePoliticaDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private politicaService: PoliticaService,
    private dialogRef: MatDialogRef<CreatePoliticaDialogComponent>
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      departamento: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    const request: CreatePoliticaRequest = this.form.getRawValue();

    this.politicaService.create(request).subscribe({
      next: (nuevaPolitica) => {
        this.isSubmitting = false;
        this.dialogRef.close(nuevaPolitica);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ||
          'Error al crear la política. Intenta nuevamente.';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
