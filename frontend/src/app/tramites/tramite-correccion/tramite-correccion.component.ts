import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';

import { TramiteService } from '../../shared/services/tramite.service';
import { Tramite, HistorialEntry } from '../../shared/models/tramite.model';

@Component({
  selector: 'app-tramite-correccion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule
  ],
  template: `
    <div class="correccion-shell">
      <!-- Header -->
      <div class="correccion-header">
        <button
          mat-icon-button
          [routerLink]="['/tramites', tramiteId]"
          aria-label="Volver al trámite">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-titles">
          <h1>Responder corrección</h1>
          <p *ngIf="tramite" class="header-sub">{{ tramite.politicaNombre }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-center" role="status" aria-label="Cargando trámite">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <ng-container *ngIf="!isLoading && tramite">
        <!-- Observaciones del devuelto -->
        <mat-card *ngIf="ultimaDevolucion" class="obs-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon aria-hidden="true">info</mat-icon>
              Motivo de la devolución
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="obs-responsable" *ngIf="ultimaDevolucion.responsableNombre">
              <strong>Por:</strong> {{ ultimaDevolucion.responsableNombre }}
              — {{ ultimaDevolucion.timestamp | date:'dd/MM/yyyy HH:mm' }}
            </p>
            <blockquote class="obs-text">
              {{ ultimaDevolucion.observaciones || 'Sin observaciones adicionales.' }}
            </blockquote>
          </mat-card-content>
        </mat-card>

        <!-- Formulario de respuesta -->
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Tu respuesta</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form
              [formGroup]="form"
              (ngSubmit)="reenviar()"
              novalidate
              aria-label="Formulario de corrección">

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Respuesta / Corrección</mat-label>
                <textarea
                  matInput
                  formControlName="observaciones"
                  rows="6"
                  required
                  placeholder="Describí los cambios realizados o tu respuesta al motivo de devolución..."
                  aria-label="Respuesta o corrección">
                </textarea>
                <mat-hint align="end">
                  {{ form.get('observaciones')?.value?.length || 0 }} / 1000
                </mat-hint>
                <mat-error *ngIf="form.get('observaciones')?.hasError('required')">
                  La respuesta es obligatoria para reenviar el trámite.
                </mat-error>
                <mat-error *ngIf="form.get('observaciones')?.hasError('minlength')">
                  Ingresá al menos 10 caracteres.
                </mat-error>
                <mat-error *ngIf="form.get('observaciones')?.hasError('maxlength')">
                  La respuesta no puede superar los 1000 caracteres.
                </mat-error>
              </mat-form-field>

              <div class="correccion-actions">
                <button
                  mat-stroked-button
                  type="button"
                  [routerLink]="['/tramites', tramiteId]"
                  aria-label="Cancelar y volver al trámite">
                  Cancelar
                </button>
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="form.invalid || isSubmitting"
                  aria-label="Reenviar trámite con corrección">
                  <mat-spinner *ngIf="isSubmitting" diameter="18" style="margin-right:8px"></mat-spinner>
                  <mat-icon *ngIf="!isSubmitting">send</mat-icon>
                  Reenviar trámite
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </div>
  `,
  styles: [`
    .correccion-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 680px;
    }

    .correccion-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .header-titles h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #1a237e;
    }

    .header-sub {
      margin: 2px 0 0;
      font-size: 0.875rem;
      color: #757575;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    /* Observaciones card */
    .obs-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      color: #e65100;
    }

    .obs-card mat-card-title mat-icon {
      color: #e65100;
    }

    .obs-responsable {
      font-size: 0.85rem;
      color: #757575;
      margin: 0 0 12px;
    }

    .obs-text {
      margin: 0;
      padding: 12px 16px;
      background: #fff3e0;
      border-left: 4px solid #ff8f00;
      border-radius: 0 4px 4px 0;
      font-size: 0.9rem;
      color: #424242;
      line-height: 1.6;
    }

    /* Formulario */
    .full-width {
      width: 100%;
    }

    .correccion-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .correccion-actions button {
      min-width: 140px;
    }

    @media (max-width: 600px) {
      .correccion-actions {
        flex-direction: column-reverse;
      }

      .correccion-actions button {
        width: 100%;
      }
    }
  `]
})
export class TramiteCorreccionComponent implements OnInit {
  form: FormGroup;
  tramite: Tramite | null = null;
  tramiteId = '';
  isLoading = true;
  isSubmitting = false;

  get ultimaDevolucion(): HistorialEntry | null {
    if (!this.tramite) return null;
    const devoluciones = this.tramite.historial.filter(h => h.accion === 'DEVOLVER');
    return devoluciones.length > 0 ? devoluciones[devoluciones.length - 1] : null;
  }

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramiteService: TramiteService,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      observaciones: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/tramites']);
      return;
    }
    this.tramiteId = id;

    this.tramiteService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => {
          this.tramite = t;
          this.isLoading = false;

          // Si no está en estado DEVUELTO, redirige al detalle
          if (t.estado !== 'DEVUELTO') {
            this.router.navigate(['/tramites', id]);
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.isLoading = false;
          console.error('[TramiteCorreccion] Error cargando trámite:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al cargar el trámite',
            'Cerrar',
            { duration: 4000 }
          );
          this.router.navigate(['/tramites']);
        }
      });
  }

  reenviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const observaciones = this.form.value.observaciones as string;

    this.tramiteService.responder(this.tramiteId, observaciones)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('Trámite reenviado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tramites', this.tramiteId]);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting = false;
          console.error('[TramiteCorreccion] Error reenviando:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al reenviar el trámite',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }
}
