import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';

import { TramiteService } from '../../shared/services/tramite.service';
import { PoliticaService } from '../../shared/services/politica.service';
import { Politica } from '../../shared/models/politica.model';

@Component({
  selector: 'app-nuevo-tramite',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule
  ],
  template: `
    <div class="nuevo-shell">
      <div class="nuevo-header">
        <button
          mat-icon-button
          routerLink="/tramites"
          aria-label="Volver a trámites">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Iniciar nuevo trámite</h1>
      </div>

      <mat-card class="nuevo-card">
        <mat-card-content>
          <!-- Loading políticas -->
          <div *ngIf="isLoadingPoliticas" class="loading-center" role="status" aria-label="Cargando políticas">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <!-- Formulario -->
          <form
            *ngIf="!isLoadingPoliticas"
            [formGroup]="form"
            (ngSubmit)="iniciar()"
            aria-label="Formulario para iniciar trámite"
            novalidate>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Política de negocio</mat-label>
              <mat-select
                formControlName="politicaId"
                aria-label="Seleccioná la política de negocio"
                required>
                <mat-option *ngIf="politicas.length === 0" disabled>
                  No hay políticas activas disponibles
                </mat-option>
                <mat-option
                  *ngFor="let p of politicas"
                  [value]="p.id">
                  {{ p.nombre }} (v{{ p.version }})
                  <span *ngIf="p.departamento" class="option-dept"> — Depto: {{ p.departamento }}</span>
                </mat-option>
              </mat-select>
              <mat-hint>Solo se muestran políticas en estado ACTIVA.</mat-hint>
              <mat-error *ngIf="form.get('politicaId')?.hasError('required')">
                Seleccioná una política para continuar.
              </mat-error>
            </mat-form-field>

            <!-- Card descripción de política seleccionada -->
            <div class="politica-preview" *ngIf="politicaSeleccionada" role="region" aria-label="Detalles de la política seleccionada">
              <mat-icon aria-hidden="true">info_outline</mat-icon>
              <div class="politica-preview-body">
                <strong>{{ politicaSeleccionada.nombre }}</strong>
                <p *ngIf="politicaSeleccionada.descripcion">{{ politicaSeleccionada.descripcion }}</p>
                <span *ngIf="politicaSeleccionada.departamento" class="politica-depto">
                  Departamento: {{ politicaSeleccionada.departamento }}
                </span>
              </div>
            </div>

            <!-- Texto explicativo -->
            <p class="inicio-aviso">
              Una vez iniciado el trámite, será asignado al equipo responsable para su revisión.
            </p>

            <div class="nuevo-actions">
              <button
                mat-stroked-button
                type="button"
                routerLink="/tramites"
                aria-label="Cancelar">
                Cancelar
              </button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || isSubmitting"
                aria-label="Iniciar trámite">
                <mat-spinner *ngIf="isSubmitting" diameter="18" style="margin-right:8px"></mat-spinner>
                <mat-icon *ngIf="!isSubmitting">play_arrow</mat-icon>
                Iniciar Trámite
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .nuevo-shell {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 560px;
    }

    .nuevo-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nuevo-header h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #1a237e;
    }

    .nuevo-card {
      border-radius: 8px;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .full-width {
      width: 100%;
    }

    .option-dept {
      font-size: 0.78rem;
      color: #9e9e9e;
    }

    /* Política preview */
    .politica-preview {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .politica-preview mat-icon {
      color: #2e7d32;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .politica-preview-body {
      flex: 1;
    }

    .politica-preview-body strong {
      font-size: 0.95rem;
      color: #1b5e20;
      display: block;
      margin-bottom: 4px;
    }

    .politica-preview-body p {
      margin: 0 0 6px;
      font-size: 0.875rem;
      color: #424242;
      line-height: 1.5;
    }

    .politica-depto {
      font-size: 0.78rem;
      color: #4caf50;
      font-weight: 500;
    }

    /* Texto informativo */
    .inicio-aviso {
      margin: 0 0 8px;
      font-size: 0.82rem;
      color: #5f6368;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #9e9e9e;
    }

    .nuevo-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    .nuevo-actions button {
      min-width: 140px;
    }

    @media (max-width: 600px) {
      .nuevo-actions {
        flex-direction: column-reverse;
      }

      .nuevo-actions button {
        width: 100%;
      }
    }
  `]
})
export class NuevoTramiteComponent implements OnInit {
  form: FormGroup;
  politicas: Politica[] = [];
  isLoadingPoliticas = true;
  isSubmitting = false;

  get politicaSeleccionada(): Politica | null {
    const id = this.form.get('politicaId')?.value as string | null;
    if (!id) return null;
    return this.politicas.find(p => p.id === id) ?? null;
  }

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly fb: FormBuilder,
    private readonly tramiteService: TramiteService,
    private readonly politicaService: PoliticaService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      politicaId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.politicaService.getAllPaged({ estado: 'ACTIVA', page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.politicas = res.content;
          this.isLoadingPoliticas = false;
        },
        error: (err: { error?: { message?: string } }) => {
          this.isLoadingPoliticas = false;
          console.error('[NuevoTramite] Error cargando políticas:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al cargar las políticas',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  iniciar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const politicaId = this.form.value.politicaId as string;

    this.tramiteService.create({ politicaId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tramite) => {
          this.isSubmitting = false;
          this.snackBar.open('Trámite iniciado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tramites', tramite.id]);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting = false;
          console.error('[NuevoTramite] Error creando trámite:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al iniciar el trámite',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }
}
