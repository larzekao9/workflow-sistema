import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

import { Form } from '@bpmn-io/form-js-viewer';

import { TramiteService } from '../../shared/services/tramite.service';
import { AuthService } from '../../shared/services/auth.service';
import {
  Tramite,
  EstadoTramite,
  AccionTramite,
  AvanzarTramiteRequest,
  FormularioActualResponse,
  EstadoConfig,
  estadoConfig as getEstadoConfig
} from '../../shared/models/tramite.model';

// ──────────────────────────────────────────────────────────────────────────────
// Dialog de confirmación / observaciones inline
// ──────────────────────────────────────────────────────────────────────────────
interface AccionDialogData {
  title: string;
  accion: AccionTramite;
  requireObs: boolean;
}

interface AccionDialogResult {
  confirmed: boolean;
  observaciones?: string;
}

import { Component as NgComponent } from '@angular/core';

@NgComponent({
  selector: 'app-accion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p style="margin:0 0 16px;color:#5f6368">
        {{ data.requireObs ? 'Ingresá las observaciones para continuar.' : '¿Confirmás esta acción?' }}
      </p>
      <mat-form-field *ngIf="data.requireObs" appearance="outline" style="width:100%">
        <mat-label>Observaciones</mat-label>
        <textarea
          matInput
          [formControl]="obsControl"
          rows="4"
          [required]="data.requireObs"
          placeholder="Describí el motivo o instrucciones..."
          aria-label="Observaciones">
        </textarea>
        <mat-error *ngIf="obsControl.hasError('required')">
          Las observaciones son obligatorias para esta acción.
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="gap:8px;padding:16px">
      <button mat-stroked-button (click)="cancel()" aria-label="Cancelar">Cancelar</button>
      <button
        mat-raised-button
        [color]="data.accion === 'RECHAZAR' ? 'warn' : 'primary'"
        (click)="confirm()"
        [disabled]="data.requireObs && obsControl.invalid"
        [attr.aria-label]="'Confirmar ' + data.title">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class AccionDialogComponent {
  obsControl = this.fb.control('', this.data.requireObs ? [Validators.required, Validators.minLength(5)] : []);

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<AccionDialogComponent, AccionDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AccionDialogData
  ) {}

  confirm(): void {
    if (this.data.requireObs && this.obsControl.invalid) return;
    this.ref.close({ confirmed: true, observaciones: this.obsControl.value ?? undefined });
  }

  cancel(): void {
    this.ref.close({ confirmed: false });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatTooltipModule,
    MatCardModule
  ],
  template: `
    <div class="detalle-shell">
      <!-- Top bar -->
      <div class="detalle-top-bar">
        <button
          mat-icon-button
          routerLink="/tramites"
          matTooltip="Volver a trámites"
          aria-label="Volver a la lista de trámites">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="detalle-titulo">
          {{ tramite?.politicaNombre || 'Trámite' }}
        </h1>
        <span
          *ngIf="tramite"
          class="estado-chip {{ estadoConfig(tramite.estado).cssClass }}"
          [attr.aria-label]="'Estado: ' + estadoConfig(tramite.estado).label">
          {{ estadoConfig(tramite.estado).label }}
        </span>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="detalle-loading" role="status" aria-label="Cargando trámite">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <ng-container *ngIf="!isLoading && tramite">
        <!-- Info general -->
        <mat-card class="info-card">
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Política</span>
                <span class="info-value">{{ tramite.politicaNombre }} (v{{ tramite.politicaVersion }})</span>
              </div>
              <div class="info-item" *ngIf="tramite.etapaActual">
                <span class="info-label">Etapa actual</span>
                <span class="info-value">{{ tramite.etapaActual.nombre }}</span>
              </div>
              <div class="info-item" *ngIf="tramite.etapaActual?.responsableRolNombre">
                <span class="info-label">Responsable</span>
                <span class="info-value">{{ tramite.etapaActual!.responsableRolNombre }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Creado</span>
                <span class="info-value">{{ tramite.creadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="info-item" *ngIf="tramite.fechaVencimientoEtapa">
                <span class="info-label">Vence etapa</span>
                <span class="info-value vence">{{ tramite.fechaVencimientoEtapa | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Formulario activo (form-js viewer) -->
        <mat-card *ngIf="hasFormulario" class="formulario-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon aria-hidden="true">dynamic_form</mat-icon>
              Formulario de la etapa
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="isLoadingFormulario" class="formulario-loading" role="status">
              <mat-spinner diameter="32"></mat-spinner>
            </div>
            <div #formjsContainer class="formjs-canvas" [class.hidden]="isLoadingFormulario"></div>
          </mat-card-content>
        </mat-card>

        <!-- Botones de acción para funcionarios/administradores -->
        <div *ngIf="puedeAccionar()" class="acciones-bar">
          <button
            mat-raised-button
            color="primary"
            (click)="ejecutarAccion('APROBAR')"
            [disabled]="isActuando"
            aria-label="Aprobar trámite">
            <mat-icon>check_circle</mat-icon>
            Aprobar
          </button>
          <button
            mat-raised-button
            color="accent"
            (click)="ejecutarAccion('DEVOLVER')"
            [disabled]="isActuando"
            aria-label="Devolver trámite al solicitante">
            <mat-icon>reply</mat-icon>
            Devolver
          </button>
          <button
            mat-raised-button
            color="warn"
            (click)="ejecutarAccion('RECHAZAR')"
            [disabled]="isActuando"
            aria-label="Rechazar trámite">
            <mat-icon>cancel</mat-icon>
            Rechazar
          </button>
          <mat-spinner *ngIf="isActuando" diameter="24" aria-label="Procesando acción"></mat-spinner>
        </div>

        <!-- Historial -->
        <mat-card class="historial-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon aria-hidden="true">history</mat-icon>
              Historial
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="tramite.historial.length === 0" class="historial-empty">
              <span>Sin movimientos registrados aún.</span>
            </div>
            <ol class="historial-list" *ngIf="tramite.historial.length > 0">
              <li
                *ngFor="let entry of tramite.historial; let last = last"
                class="historial-entry"
                [class.historial-entry--last]="last">
                <div class="historial-dot"></div>
                <div class="historial-content">
                  <div class="historial-header">
                    <span class="historial-accion accion-{{ entry.accion.toLowerCase() }}">
                      {{ entry.accion }}
                    </span>
                    <span class="historial-quien" *ngIf="entry.responsableNombre">
                      — {{ entry.responsableNombre }}
                    </span>
                    <span class="historial-fecha">
                      {{ entry.timestamp | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>
                  <div class="historial-etapa" *ngIf="entry.actividadNombre">
                    Etapa: {{ entry.actividadNombre }}
                  </div>
                  <div class="historial-obs" *ngIf="entry.observaciones">
                    {{ entry.observaciones }}
                  </div>
                </div>
              </li>
            </ol>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </div>
  `,
  styles: [`
    .detalle-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 900px;
    }

    /* Top bar */
    .detalle-top-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .detalle-titulo {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #1a237e;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Loading */
    .detalle-loading {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* Estado chips */
    .estado-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .chip-iniciado   { background: #e0e0e0; color: #424242; }
    .chip-en-proceso { background: #e3f2fd; color: #0d47a1; }
    .chip-completado { background: #e8f5e9; color: #1b5e20; }
    .chip-rechazado  { background: #ffebee; color: #b71c1c; }
    .chip-devuelto   { background: #fff3e0; color: #e65100; }
    .chip-cancelado  { background: #eeeeee; color: #616161; }
    .chip-escalado   { background: #f3e5f5; color: #6a1b9a; }

    /* Info card */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9e9e9e;
    }

    .info-value {
      font-size: 0.95rem;
      color: #212121;
    }

    .info-value.vence {
      color: #e65100;
      font-weight: 500;
    }

    /* Formulario */
    .formulario-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .formulario-loading {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .formjs-canvas {
      min-height: 200px;
    }

    .formjs-canvas.hidden {
      display: none;
    }

    .formjs-canvas .fjs-container,
    .formjs-canvas .fjs-form {
      height: 100% !important;
    }

    /* Acciones */
    .acciones-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    /* Historial */
    .historial-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .historial-empty {
      color: #9e9e9e;
      font-style: italic;
      padding: 16px 0;
    }

    .historial-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .historial-entry {
      display: flex;
      gap: 16px;
      position: relative;
      padding-bottom: 20px;
    }

    .historial-entry--last {
      padding-bottom: 0;
    }

    .historial-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #1565c0;
      flex-shrink: 0;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }

    .historial-entry:not(.historial-entry--last) .historial-dot::after {
      content: '';
      position: absolute;
      top: 12px;
      left: 5px;
      width: 2px;
      bottom: -20px;
      background: #e0e0e0;
    }

    .historial-content {
      flex: 1;
      min-width: 0;
    }

    .historial-header {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .historial-accion {
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .accion-aprobar  { color: #1b5e20; }
    .accion-rechazar { color: #b71c1c; }
    .accion-devolver { color: #e65100; }
    .accion-escalar  { color: #6a1b9a; }
    .accion-iniciado { color: #0d47a1; }

    .historial-quien {
      font-size: 0.85rem;
      color: #424242;
    }

    .historial-fecha {
      font-size: 0.75rem;
      color: #9e9e9e;
      margin-left: auto;
    }

    .historial-etapa {
      font-size: 0.8rem;
      color: #757575;
      margin-bottom: 4px;
    }

    .historial-obs {
      font-size: 0.875rem;
      color: #424242;
      background: #f5f5f5;
      border-left: 3px solid #1565c0;
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
    }

    @media (max-width: 600px) {
      .acciones-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .acciones-bar button {
        width: 100%;
      }
    }
  `]
})
export class TramiteDetalleComponent implements OnInit, OnDestroy {
  @ViewChild('formjsContainer') containerRef!: ElementRef<HTMLDivElement>;

  tramite: Tramite | null = null;
  isLoading = true;
  isActuando = false;
  hasFormulario = false;
  isLoadingFormulario = false;

  private viewer: Form | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramiteService: TramiteService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/tramites']);
      return;
    }
    this.cargarTramite(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyViewer();
  }

  estadoConfig(estado: EstadoTramite): EstadoConfig {
    return getEstadoConfig(estado);
  }

  puedeAccionar(): boolean {
    if (!this.tramite) return false;
    const estado = this.tramite.estado;
    if (estado !== 'INICIADO' && estado !== 'EN_PROCESO') return false;
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const rolNombre = (user.rolNombre ?? '').toUpperCase();
    return rolNombre.includes('FUNCIONARIO') || rolNombre.includes('ADMINISTRADOR') || rolNombre.includes('ADMIN');
  }

  ejecutarAccion(accion: AccionTramite): void {
    if (!this.tramite) return;

    const requireObs = accion === 'DEVOLVER' || accion === 'RECHAZAR';
    const titles: Record<AccionTramite, string> = {
      APROBAR:  'Aprobar trámite',
      RECHAZAR: 'Rechazar trámite',
      DEVOLVER: 'Devolver al solicitante',
      ESCALAR:  'Escalar trámite'
    };

    const ref = this.dialog.open(AccionDialogComponent, {
      data: { title: titles[accion], accion, requireObs } satisfies AccionDialogData,
      width: '440px',
      disableClose: false
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: AccionDialogResult | undefined) => {
      if (!result?.confirmed || !this.tramite) return;
      this.enviarAccion(this.tramite.id, accion, result.observaciones);
    });
  }

  private cargarTramite(id: string): void {
    this.isLoading = true;
    this.tramiteService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (t) => {
        this.tramite = t;
        this.isLoading = false;
        this.cdr.detectChanges();

        if (t.etapaActual?.formularioId && (t.estado === 'INICIADO' || t.estado === 'EN_PROCESO')) {
          this.cargarFormulario(id);
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading = false;
        console.error('[TramiteDetalle] Error cargando trámite:', err);
        this.snackBar.open(
          err?.error?.message || 'Error al cargar el trámite',
          'Cerrar',
          { duration: 4000 }
        );
        this.router.navigate(['/tramites']);
      }
    });
  }

  private cargarFormulario(tramiteId: string): void {
    this.hasFormulario = true;
    this.isLoadingFormulario = true;
    this.tramiteService.getFormularioActual(tramiteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: FormularioActualResponse) => {
        this.isLoadingFormulario = false;
        if (res.formJsSchema) {
          this.cdr.detectChanges();
          setTimeout(() => this.initViewer(res.formJsSchema!), 50);
        } else {
          this.hasFormulario = false;
        }
      },
      error: (err: unknown) => {
        this.isLoadingFormulario = false;
        this.hasFormulario = false;
        console.error('[TramiteDetalle] Error cargando formulario:', err);
      }
    });
  }

  private initViewer(schema: object): void {
    if (!this.containerRef?.nativeElement) return;
    this.destroyViewer();
    this.viewer = new Form({ container: this.containerRef.nativeElement });
    this.viewer.importSchema(schema).catch((err: unknown) => {
      console.error('[TramiteDetalle] Error importando schema:', err);
    });
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }

  private enviarAccion(id: string, accion: AccionTramite, observaciones?: string): void {
    this.isActuando = true;
    const req: AvanzarTramiteRequest = { accion, observaciones };
    this.tramiteService.avanzar(id, req).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.tramite = updated;
        this.isActuando = false;
        this.destroyViewer();
        this.hasFormulario = false;
        this.snackBar.open('Acción aplicada correctamente', 'Cerrar', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.isActuando = false;
        console.error('[TramiteDetalle] Error en acción:', err);
        this.snackBar.open(
          err?.error?.message || 'Error al procesar la acción',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }
}
