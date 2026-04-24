import {
  Component,
  OnInit,
  OnDestroy,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TramiteService } from '../shared/services/tramite.service';
import {
  Tramite,
  EstadoTramite,
  EstadoConfig,
  estadoConfig as getEstadoConfig
} from '../shared/models/tramite.model';

/** Left-border color per estado */
const ESTADO_BORDER: Record<EstadoTramite, string> = {
  INICIADO:     '#9e9e9e',
  EN_PROCESO:   '#1565c0',
  COMPLETADO:   '#2e7d32',
  RECHAZADO:    '#b71c1c',
  DEVUELTO:     '#e65100',
  CANCELADO:    '#757575',
  ESCALADO:     '#6a1b9a',
  SIN_ASIGNAR:  '#f9a825',
  EN_APELACION: '#283593'
};

@Component({
  selector: 'app-mis-tramites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="portal-shell">

      <!-- ─── HEADER ─── -->
      <div class="portal-header">
        <div class="portal-header-title">
          <mat-icon aria-hidden="true">assignment</mat-icon>
          <h1>Mis trámites</h1>
        </div>
        <button
          mat-raised-button
          color="primary"
          routerLink="/tramites/nuevo"
          aria-label="Iniciar nuevo trámite">
          <mat-icon>add</mat-icon>
          Iniciar nuevo trámite
        </button>
      </div>

      <!-- ─── FILTRO ─── -->
      <mat-card class="filter-card">
        <mat-card-content>
          <form [formGroup]="filtroForm" class="filter-form" aria-label="Filtros de trámites">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="estado" aria-label="Filtrar por estado">
                <mat-option value="">Todos</mat-option>
                <mat-option value="INICIADO">Iniciado</mat-option>
                <mat-option value="EN_PROCESO">En Proceso</mat-option>
                <mat-option value="COMPLETADO">Completado</mat-option>
                <mat-option value="RECHAZADO">Rechazado</mat-option>
                <mat-option value="DEVUELTO">Devuelto</mat-option>
                <mat-option value="CANCELADO">Cancelado</mat-option>
                <mat-option value="ESCALADO">Escalado</mat-option>
                <mat-option value="EN_APELACION">En apelación</mat-option>
              </mat-select>
            </mat-form-field>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- ─── LOADING ─── -->
      <div
        *ngIf="isLoading"
        class="loading-container"
        role="status"
        aria-label="Cargando trámites">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- ─── EMPTY STATE ─── -->
      <div
        *ngIf="!isLoading && tramites.length === 0"
        class="empty-state"
        role="status">
        <mat-icon aria-hidden="true">inbox</mat-icon>
        <p>No tenés trámites{{ filtroEstado ? ' en estado "' + estadoLabel(filtroEstado) + '"' : '' }}.</p>
        <button
          mat-stroked-button
          color="primary"
          routerLink="/tramites/nuevo"
          aria-label="Iniciar primer trámite">
          <mat-icon>add</mat-icon>
          Iniciar primer trámite
        </button>
      </div>

      <!-- ─── LISTA ─── -->
      <div
        *ngIf="!isLoading && tramites.length > 0"
        class="tramites-list"
        aria-label="Lista de trámites">

        <article
          *ngFor="let t of tramites"
          class="tramite-card"
          [style.border-left-color]="borderColor(t.estado)"
          [attr.aria-label]="'Trámite ' + t.politicaNombre + ', estado ' + estadoConfig(t.estado).label">

          <!-- Card header: chip + fecha -->
          <div class="card-header">
            <span
              class="estado-chip {{ estadoConfig(t.estado).cssClass }}"
              [attr.aria-label]="'Estado: ' + estadoConfig(t.estado).label">
              {{ estadoConfig(t.estado).label }}
            </span>
            <span class="card-date" [attr.aria-label]="'Fecha de creación ' + (t.creadoEn | date:'dd/MM/yyyy')">
              {{ t.creadoEn | date:'dd/MM/yyyy' }}
            </span>
          </div>

          <!-- Nombre política + versión -->
          <div class="card-body">
            <span class="card-politica">{{ t.politicaNombre }}</span>
            <span class="card-version">v{{ t.politicaVersion }}</span>
          </div>

          <!-- Etapa actual -->
          <div *ngIf="t.etapaActual" class="card-etapa">
            <mat-icon aria-hidden="true" class="etapa-icon">arrow_forward</mat-icon>
            <span>{{ t.etapaActual.nombre }}</span>
            <span *ngIf="t.etapaActual.area" class="etapa-area">— {{ t.etapaActual.area }}</span>
          </div>

          <!-- Apelacion countdown -->
          <div
            *ngIf="tieneConteoApelacion(t)"
            class="card-apelacion"
            [class.countdown-warn]="esConteoWarning(t)"
            [class.countdown-danger]="esConteoDanger(t)"
            [class.countdown-vencido]="conteoVencido(t)"
            role="timer"
            [attr.aria-label]="'Tiempo restante para apelar: ' + (countdownMap.get(t.id) ?? 'calculando')">
            <mat-icon aria-hidden="true">timer</mat-icon>
            <span *ngIf="!conteoVencido(t)">
              Plazo para apelar: <strong>{{ countdownMap.get(t.id) ?? '...' }}</strong>
            </span>
            <span *ngIf="conteoVencido(t)">
              Plazo vencido
            </span>
          </div>

          <!-- Acciones -->
          <div class="card-actions">
            <button
              mat-stroked-button
              [routerLink]="['/tramites', t.id]"
              [attr.aria-label]="'Ver detalle del trámite ' + t.politicaNombre">
              <mat-icon>open_in_new</mat-icon>
              Ver detalle
            </button>

            <button
              *ngIf="t.estado === 'DEVUELTO'"
              mat-flat-button
              color="warn"
              [routerLink]="['/tramites', t.id, 'correccion']"
              [attr.aria-label]="'Corregir trámite ' + t.politicaNombre">
              <mat-icon>edit</mat-icon>
              Corregir ahora
            </button>

            <button
              *ngIf="t.estado === 'EN_APELACION' && t.apelacion?.estado === 'PENDIENTE'"
              mat-flat-button
              color="primary"
              [routerLink]="['/tramites', t.id, 'apelacion']"
              [attr.aria-label]="'Apelar trámite ' + t.politicaNombre">
              <mat-icon>gavel</mat-icon>
              Apelar ahora
            </button>
          </div>

        </article>

      </div>

      <!-- ─── PAGINADOR ─── -->
      <mat-paginator
        *ngIf="!isLoading && totalElements > 0"
        [length]="totalElements"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        [pageIndex]="pageIndex"
        aria-label="Paginación de trámites"
        (page)="onPage($event)">
      </mat-paginator>

    </div>
  `,
  styles: [`
    .portal-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 4px;
    }

    /* ─── Header ─── */
    .portal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .portal-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .portal-header-title mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #1565c0;
    }

    .portal-header-title h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a237e;
    }

    /* ─── Filter ─── */
    .filter-card {
      border-radius: 8px;
    }

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 8px;
    }

    .filter-field {
      min-width: 180px;
      flex: 1;
    }

    /* ─── Loading ─── */
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* ─── Empty state ─── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 64px 24px;
      text-align: center;
      color: #5f6368;
    }

    .empty-state mat-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #bdbdbd;
    }

    .empty-state p {
      margin: 0;
      font-size: 1rem;
    }

    /* ─── Tramites list ─── */
    .tramites-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ─── Tramite card ─── */
    .tramite-card {
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-left: 4px solid #9e9e9e; /* overridden inline per estado */
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: box-shadow 150ms ease-out;
    }

    .tramite-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* ─── Card header ─── */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-date {
      font-size: 0.8rem;
      color: #757575;
    }

    /* ─── Estado chips ─── */
    .estado-chip {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .chip-iniciado    { background: #e0e0e0; color: #424242; }
    .chip-en-proceso  { background: #e3f2fd; color: #0d47a1; }
    .chip-completado  { background: #e8f5e9; color: #1b5e20; }
    .chip-rechazado   { background: #ffebee; color: #b71c1c; }
    .chip-devuelto    { background: #fff3e0; color: #e65100; }
    .chip-cancelado   { background: #eeeeee; color: #616161; }
    .chip-escalado    { background: #f3e5f5; color: #6a1b9a; }
    .chip-sin-asignar { background: #fff8e1; color: #e65100; border: 1px solid #ffcc02; }
    .chip-en-apelacion { background: #e8eaf6; color: #283593; }

    /* ─── Card body (policy) ─── */
    .card-body {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .card-politica {
      font-size: 1rem;
      font-weight: 600;
      color: #1a237e;
    }

    .card-version {
      font-size: 0.75rem;
      color: #5f6368;
    }

    /* ─── Etapa ─── */
    .card-etapa {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: #5f6368;
    }

    .etapa-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #9e9e9e;
    }

    .etapa-area {
      font-size: 0.8rem;
      color: #9e9e9e;
    }

    /* ─── Apelacion countdown ─── */
    .card-apelacion {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      background: #e8eaf6;
      color: #283593;
      width: fit-content;
    }

    .card-apelacion mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .countdown-warn {
      background: #fff3e0;
      color: #e65100;
    }

    .countdown-danger {
      background: #ffebee;
      color: #b71c1c;
    }

    .countdown-vencido {
      background: #eeeeee;
      color: #757575;
      text-decoration: line-through;
    }

    /* ─── Card actions ─── */
    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 4px;
    }

    /* ─── Mobile ─── */
    @media (max-width: 600px) {
      .portal-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .portal-header button {
        width: 100%;
      }

      .card-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .card-actions button {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 360px) {
      .portal-shell {
        padding: 0;
      }

      .tramite-card {
        border-radius: 0;
        border-left-width: 4px;
      }
    }
  `]
})
export class MisTramitesComponent implements OnInit, OnDestroy {
  tramites: Tramite[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = true;

  filtroForm: FormGroup;

  /** countdown display strings keyed by tramiteId */
  readonly countdownMap = new Map<string, string>();

  /** ms remaining keyed by tramiteId — for threshold checks */
  private readonly countdownMsMap = new Map<string, number>();

  private countdownSub: Subscription | null = null;

  private readonly destroyRef = inject(DestroyRef);

  get filtroEstado(): string {
    return (this.filtroForm.get('estado')?.value as string) ?? '';
  }

  constructor(
    private readonly tramiteService: TramiteService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder
  ) {
    this.filtroForm = this.fb.group({ estado: [''] });
  }

  ngOnInit(): void {
    this.load();

    this.filtroForm.get('estado')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });

    // Tick every 1s to update countdown displays
    this.countdownSub = interval(1000).subscribe(() => this.tickCountdowns());
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
  }

  private load(): void {
    this.isLoading = true;
    const estado = this.filtroEstado || undefined;

    this.tramiteService
      .getMisTramites(this.pageIndex, this.pageSize, estado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.tramites = res.content;
          this.totalElements = res.totalElements;
          this.isLoading = false;
          this.initCountdowns();
        },
        error: (err: { error?: { message?: string } }) => {
          this.isLoading = false;
          console.error('[MisTramites] Error al cargar:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al cargar tus trámites',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  /** Seed countdownMap from current tramites list */
  private initCountdowns(): void {
    this.countdownMap.clear();
    this.countdownMsMap.clear();
    for (const t of this.tramites) {
      if (this.tieneConteoApelacion(t)) {
        this.calcCountdown(t);
      }
    }
  }

  /** Called every 1s by interval subscription */
  private tickCountdowns(): void {
    for (const t of this.tramites) {
      if (this.tieneConteoApelacion(t)) {
        this.calcCountdown(t);
      }
    }
  }

  private calcCountdown(t: Tramite): void {
    const limite = t.apelacion?.fechaLimite;
    if (!limite) return;

    const ms = new Date(limite).getTime() - Date.now();
    this.countdownMsMap.set(t.id, ms);

    if (ms <= 0) {
      this.countdownMap.set(t.id, 'Plazo vencido');
      return;
    }

    const totalSecs = Math.floor(ms / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);

    this.countdownMap.set(t.id, parts.join(' ') + ' restantes');
  }

  // ─── Template helpers ───────────────────────────────────────

  estadoConfig(estado: EstadoTramite): EstadoConfig {
    return getEstadoConfig(estado);
  }

  estadoLabel(estado: string): string {
    return getEstadoConfig(estado as EstadoTramite).label;
  }

  borderColor(estado: EstadoTramite): string {
    return ESTADO_BORDER[estado] ?? '#9e9e9e';
  }

  tieneConteoApelacion(t: Tramite): boolean {
    return (
      t.estado === 'EN_APELACION' &&
      t.apelacion?.estado === 'PENDIENTE' &&
      !!t.apelacion?.fechaLimite
    );
  }

  conteoVencido(t: Tramite): boolean {
    const ms = this.countdownMsMap.get(t.id);
    return ms !== undefined && ms <= 0;
  }

  /** < 6 hours but > 1 hour remaining */
  esConteoWarning(t: Tramite): boolean {
    const ms = this.countdownMsMap.get(t.id);
    if (ms === undefined || ms <= 0) return false;
    const hours = ms / (1000 * 60 * 60);
    return hours < 6 && hours >= 1;
  }

  /** < 1 hour remaining */
  esConteoDanger(t: Tramite): boolean {
    const ms = this.countdownMsMap.get(t.id);
    if (ms === undefined || ms <= 0) return false;
    return ms < 1000 * 60 * 60;
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }
}
