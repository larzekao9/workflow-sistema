import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { PoliticaService } from '../../shared/services/politica.service';
import { Politica } from '../../shared/models/politica.model';

@Component({
  selector: 'app-policy-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEditMode ? 'Editar Política' : 'Nueva Política' }}</h1>
      <button mat-button routerLink="/policies">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
    </div>

    <div *ngIf="isLoading && isEditMode" class="loading-container">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <mat-card *ngIf="!isLoading || !isEditMode">
      <mat-card-content>

        <div *ngIf="isEditMode && politica && (politica.estado === 'ACTIVA' || politica.estado === 'ARCHIVADA')" class="readonly-banner">
          <mat-icon>lock</mat-icon>
          Esta política no puede editarse en estado <strong>{{ politica.estado }}</strong>. Solo se pueden editar políticas en BORRADOR o INACTIVA.
        </div>

        <form [formGroup]="form" novalidate class="form-layout">

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="nombre" placeholder="Ej: Proceso de aprobación de crédito" />
            <mat-error *ngIf="form.get('nombre')?.hasError('required')">Campo obligatorio</mat-error>
            <mat-error *ngIf="form.get('nombre')?.hasError('maxlength')">Máximo 120 caracteres</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="descripcion" rows="3" placeholder="Descripción detallada del proceso..."></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Departamento *</mat-label>
            <input matInput formControlName="departamento" placeholder="Ej: Recursos Humanos, Finanzas..." />
            <mat-error *ngIf="form.get('departamento')?.hasError('required')">Campo obligatorio</mat-error>
          </mat-form-field>

          <mat-divider class="divider"></mat-divider>
          <h3 class="section-title">Metadatos opcionales</h3>

          <mat-form-field appearance="outline">
            <mat-label>Icono (Material Icon)</mat-label>
            <input matInput formControlName="icono" placeholder="Ej: description, work, assignment" />
            <mat-icon matSuffix>{{ form.get('icono')?.value || 'description' }}</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Color (hex)</mat-label>
            <input matInput formControlName="color" placeholder="#1976d2" />
            <div matSuffix class="color-preview" [style.background-color]="form.get('color')?.value || '#1976d2'"></div>
          </mat-form-field>

          <div class="tags-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Etiquetas (tags)</mat-label>
              <mat-chip-grid #chipGrid aria-label="Tags">
                <mat-chip-row
                  *ngFor="let tag of tags"
                  (removed)="removeTag(tag)">
                  {{ tag }}
                  <button matChipRemove [attr.aria-label]="'remove ' + tag">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip-row>
              </mat-chip-grid>
              <input
                placeholder="Nueva etiqueta..."
                [matChipInputFor]="chipGrid"
                [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                (matChipInputTokenEnd)="addTag($event)"
              />
            </mat-form-field>
          </div>

        </form>
      </mat-card-content>

      <mat-card-actions align="end" class="actions">
        <button mat-button routerLink="/policies" [disabled]="isSaving">Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSubmit()"
          [disabled]="isSaving || form.invalid || (isEditMode && (politica?.estado === 'ACTIVA' || politica?.estado === 'ARCHIVADA'))">
          <mat-spinner *ngIf="isSaving" diameter="18" style="display:inline-block; margin-right:6px"></mat-spinner>
          <span>{{ isEditMode ? 'Guardar cambios' : 'Crear política' }}</span>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-header h1 { margin: 0; font-size: 24px; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .readonly-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff3e0;
      border: 1px solid #ff9800;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #e65100;
    }
    .form-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 16px;
    }
    .full-width { grid-column: 1 / -1; }
    .divider { grid-column: 1 / -1; margin: 8px 0 16px; }
    .section-title { grid-column: 1 / -1; margin: 0 0 8px; font-size: 16px; color: rgba(0,0,0,0.6); }
    .tags-section { grid-column: 1 / -1; }
    .color-preview {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.2);
      margin-right: 4px;
    }
    .actions { padding: 16px; }
  `]
})
export class PolicyFormComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  politicaId: string | null = null;
  politica: Politica | null = null;
  tags: string[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      descripcion: [''],
      departamento: ['', [Validators.required]],
      icono: ['description'],
      color: ['#1976d2']
    });
  }

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.politicaId;

    if (this.isEditMode && this.politicaId) {
      this.isLoading = true;
      this.politicaService.getById(this.politicaId).subscribe({
        next: (p) => {
          this.politica = p;
          this.tags = [...(p.metadatos?.tags ?? [])];
          this.form.patchValue({
            nombre: p.nombre,
            descripcion: p.descripcion,
            departamento: p.departamento,
            icono: p.metadatos?.icono ?? 'description',
            color: p.metadatos?.color ?? '#1976d2'
          });
          if (p.estado === 'ACTIVA' || p.estado === 'ARCHIVADA') {
            this.form.disable();
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open(err?.error?.message || 'Error al cargar la política', 'Cerrar', { duration: 4000 });
          this.router.navigate(['/policies']);
        }
      });
    }
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.isEditMode && (this.politica?.estado === 'ACTIVA' || this.politica?.estado === 'ARCHIVADA')) return;

    this.isSaving = true;
    const val = this.form.value;
    const payload = {
      nombre: val.nombre,
      descripcion: val.descripcion,
      departamento: val.departamento,
      metadatos: {
        tags: this.tags,
        icono: val.icono,
        color: val.color
      }
    };

    const request$ = this.isEditMode && this.politicaId
      ? this.politicaService.update(this.politicaId, payload)
      : this.politicaService.create(payload);

    request$.subscribe({
      next: (result) => {
        this.isSaving = false;
        const msg = this.isEditMode ? 'Política actualizada correctamente' : 'Política creada correctamente';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.router.navigate(['/policies', result.id]);
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err?.error?.message || 'Error al guardar la política', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
