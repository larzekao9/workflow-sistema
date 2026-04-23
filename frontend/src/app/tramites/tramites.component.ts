import { Component, OnInit, ViewChild, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { TramiteService } from '../shared/services/tramite.service';
import { AuthService } from '../shared/services/auth.service';
import { Tramite, EstadoTramite, EstadoConfig, estadoConfig as getEstadoConfig } from '../shared/models/tramite.model';
import { User } from '../shared/models/user.model';

type Rol = 'ADMINISTRADOR' | 'FUNCIONARIO' | 'CLIENTE';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  template: `
    <div class="tramites-shell">

      <!-- ─────────────── HEADER por rol ─────────────── -->
      <div class="tramites-header">
        <div class="tramites-header-title">
          <mat-icon aria-hidden="true">{{ headerIcon }}</mat-icon>
          <div>
            <h1>{{ headerTitle }}</h1>
            <p class="header-sub" *ngIf="pendientesCount > 0 && rol === 'FUNCIONARIO'">
              <span class="badge-count" [attr.aria-label]="pendientesCount + ' pendientes'">
                {{ pendientesCount }}
              </span>
              pendientes de acción
            </p>
          </div>
        </div>

        <!-- Acción principal por rol -->
        <button
          *ngIf="rol === 'CLIENTE'"
          mat-raised-button
          color="primary"
          routerLink="/tramites/nuevo"
          aria-label="Iniciar nuevo trámite">
          <mat-icon>add</mat-icon>
          Nuevo Trámite
        </button>
      </div>

      <!-- Banner devueltos (CLIENTE) -->
      <div
        *ngIf="rol === 'CLIENTE' && tieneDevueltos"
        class="alert-banner alert-warn"
        role="alert"
        aria-live="polite">
        <mat-icon aria-hidden="true">warning_amber</mat-icon>
        <span>Atención: tenés trámites pendientes de corrección.</span>
      </div>

      <!-- ─────────────── FILTROS ─────────────── -->
      <mat-card class="filtros-card">
        <mat-card-content>
          <form [formGroup]="filtrosForm" class="filtros-form" aria-label="Filtros de trámites">

            <!-- Filtro estado (todos los roles) -->
            <mat-form-field appearance="outline" class="filtro-field">
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
              </mat-select>
            </mat-form-field>

            <!-- Búsqueda por nombre política (FUNCIONARIO + ADMIN) -->
            <mat-form-field
              *ngIf="rol !== 'CLIENTE'"
              appearance="outline"
              class="filtro-field filtro-field--wide">
              <mat-label>Buscar por política</mat-label>
              <input
                matInput
                formControlName="busqueda"
                placeholder="Nombre de la política..."
                aria-label="Buscar por nombre de política">
              <mat-icon matSuffix aria-hidden="true">search</mat-icon>
            </mat-form-field>

            <!-- Rango de fechas (ADMIN) -->
            <ng-container *ngIf="rol === 'ADMINISTRADOR'">
              <mat-form-field appearance="outline" class="filtro-field">
                <mat-label>Desde</mat-label>
                <input matInput type="date" formControlName="fechaDesde" aria-label="Fecha desde">
              </mat-form-field>
              <mat-form-field appearance="outline" class="filtro-field">
                <mat-label>Hasta</mat-label>
                <input matInput type="date" formControlName="fechaHasta" aria-label="Fecha hasta">
              </mat-form-field>
            </ng-container>

          </form>
        </mat-card-content>
      </mat-card>

      <!-- ─────────────── Loading ─────────────── -->
      <div *ngIf="isLoading" class="tramites-loading" role="status" aria-label="Cargando trámites">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- ─────────────── Empty state ─────────────── -->
      <div *ngIf="!isLoading && tramites.length === 0" class="tramites-empty">
        <mat-icon aria-hidden="true">inbox</mat-icon>
        <p>{{ emptyMessage }}</p>
        <button
          *ngIf="rol === 'CLIENTE'"
          mat-stroked-button
          color="primary"
          routerLink="/tramites/nuevo">
          <mat-icon>add</mat-icon>
          Iniciar primer trámite
        </button>
      </div>

      <!-- ─────────────── TABLA ─────────────── -->
      <div *ngIf="!isLoading && tramites.length > 0" class="tramites-table-wrap">
        <table
          mat-table
          [dataSource]="tramites"
          matSort
          class="tramites-table"
          [attr.aria-label]="headerTitle">

          <!-- Estado -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef mat-sort-header scope="col">Estado</th>
            <td mat-cell *matCellDef="let t">
              <span
                class="estado-chip {{ estadoConfig(t.estado).cssClass }}"
                [attr.aria-label]="'Estado: ' + estadoConfig(t.estado).label">
                {{ estadoConfig(t.estado).label }}
              </span>
            </td>
          </ng-container>

          <!-- Política -->
          <ng-container matColumnDef="politicaNombre">
            <th mat-header-cell *matHeaderCellDef mat-sort-header scope="col">Política</th>
            <td mat-cell *matCellDef="let t">
              <span class="cell-primary">{{ t.politicaNombre }}</span>
              <span class="cell-secondary">v{{ t.politicaVersion }}</span>
            </td>
          </ng-container>

          <!-- Cliente (FUNCIONARIO / ADMIN) -->
          <ng-container matColumnDef="clienteNombre">
            <th mat-header-cell *matHeaderCellDef scope="col">Cliente</th>
            <td mat-cell *matCellDef="let t">{{ t.clienteNombre || '—' }}</td>
          </ng-container>

          <!-- Etapa -->
          <ng-container matColumnDef="etapa">
            <th mat-header-cell *matHeaderCellDef scope="col">Etapa actual</th>
            <td mat-cell *matCellDef="let t">
              <span *ngIf="t.etapaActual; else sinEtapa">{{ t.etapaActual.nombre }}</span>
              <ng-template #sinEtapa><span class="cell-muted">—</span></ng-template>
              <br *ngIf="t.etapaActual?.area" />
              <small *ngIf="t.etapaActual?.area" class="cell-area">{{ t.etapaActual!.area }}</small>
            </td>
          </ng-container>

          <!-- Fecha -->
          <ng-container matColumnDef="creadoEn">
            <th mat-header-cell *matHeaderCellDef mat-sort-header scope="col">Fecha</th>
            <td mat-cell *matCellDef="let t">
              <span [class.urgente]="esUrgente(t)" [matTooltip]="esUrgente(t) ? 'Más de 3 días sin resolución' : ''">
                {{ t.creadoEn | date:'dd/MM/yyyy' }}
              </span>
              <span *ngIf="esUrgente(t)" class="urgente-badge" aria-label="Urgente">URGENTE</span>
            </td>
          </ng-container>

          <!-- Acciones -->
          <!-- Columna asignado — solo FUNCIONARIO -->
          <ng-container matColumnDef="asignado">
            <th mat-header-cell *matHeaderCellDef scope="col">Asignado</th>
            <td mat-cell *matCellDef="let t">
              <ng-container *ngIf="t.asignadoAId === currentUserId && currentUserId">
                <span class="asignado-tuyo">
                  <mat-icon style="font-size:14px;vertical-align:middle">person</mat-icon> Tuyo
                </span>
              </ng-container>
              <ng-container *ngIf="t.asignadoAId && t.asignadoAId !== currentUserId">
                <span class="asignado-otro" [matTooltip]="t.asignadoANombre || ''">
                  {{ (t.asignadoANombre || '') | slice:0:12 }}…
                </span>
              </ng-container>
              <ng-container *ngIf="!t.asignadoAId && (t.estado === 'INICIADO' || t.estado === 'EN_PROCESO')">
                <button mat-stroked-button color="primary" style="font-size:12px;height:28px;line-height:28px"
                  (click)="tomarTramite(t.id, $event)">
                  <mat-icon style="font-size:14px">assignment_ind</mat-icon> Tomar
                </button>
              </ng-container>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
            <td mat-cell *matCellDef="let t">
              <div class="acciones-cell">
                <!-- Ver siempre -->
                <button
                  mat-icon-button
                  color="primary"
                  matTooltip="Ver trámite"
                  [attr.aria-label]="'Ver trámite de ' + t.politicaNombre"
                  (click)="verTramite(t.id, $event)">
                  <mat-icon>open_in_new</mat-icon>
                </button>

                <!-- Resolver (FUNCIONARIO) -->
                <button
                  *ngIf="rol === 'FUNCIONARIO' && (t.estado === 'INICIADO' || t.estado === 'EN_PROCESO' || t.estado === 'ESCALADO')"
                  mat-flat-button
                  [color]="t.estado === 'ESCALADO' ? 'accent' : 'primary'"
                  matTooltip="Resolver trámite"
                  [attr.aria-label]="'Resolver trámite ' + t.politicaNombre"
                  (click)="verTramite(t.id, $event)">
                  Resolver
                </button>

                <!-- Responder (CLIENTE con DEVUELTO) -->
                <button
                  *ngIf="rol === 'CLIENTE' && t.estado === 'DEVUELTO'"
                  mat-flat-button
                  color="warn"
                  matTooltip="Responder corrección"
                  [attr.aria-label]="'Responder corrección del trámite ' + t.politicaNombre"
                  (click)="responderTramite(t.id, $event)">
                  <mat-icon>reply</mat-icon>
                  Responder
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns;"
            class="tramite-row"
            (click)="verTramite(row.id)"
            (keydown.enter)="verTramite(row.id)"
            tabindex="0"
            [attr.aria-label]="'Trámite ' + row.politicaNombre + ', estado ' + estadoConfig(row.estado).label">
          </tr>
        </table>

        <mat-paginator
          #paginator
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [pageIndex]="pageIndex"
          aria-label="Paginación de trámites"
          (page)="onPage($event)">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .tramites-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Header */
    .tramites-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .tramites-header-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .tramites-header-title mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #1565c0;
      margin-top: 4px;
    }

    .tramites-header-title h1 {
      margin: 0 0 2px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a237e;
    }

    .header-sub {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: #5f6368;
    }

    .badge-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      background: #e65100;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Alert banner */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .alert-warn {
      background: #fff8e1;
      border: 1px solid #ffc107;
      color: #5d4037;
    }

    .alert-warn mat-icon { color: #f57f17; }

    /* Filtros */
    .filtros-card {
      border-radius: 8px;
    }

    .filtros-form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 8px;
    }

    .filtro-field {
      min-width: 160px;
      flex: 1;
    }

    .filtro-field--wide {
      min-width: 220px;
      flex: 2;
    }

    /* Loading */
    .tramites-loading {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* Empty state */
    .tramites-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 64px 24px;
      text-align: center;
      color: #5f6368;
    }

    .tramites-empty mat-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #bdbdbd;
    }

    .tramites-empty p {
      margin: 0;
      font-size: 1rem;
    }

    /* Tabla */
    .tramites-table-wrap {
      overflow: auto;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.08);
    }

    .tramites-table {
      width: 100%;
      background: white;
    }

    .tramite-row {
      cursor: pointer;
      transition: background-color 150ms ease-out;
    }

    .tramite-row:hover {
      background: rgba(21, 101, 192, 0.04);
    }

    .tramite-row:focus {
      outline: 2px solid #1565c0;
      outline-offset: -2px;
    }

    /* Estado chips */
    .estado-chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
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

    /* Cell helpers */
    .cell-primary { display: block; font-weight: 500; }
    .cell-secondary { display: block; font-size: 0.75rem; color: #757575; }
    .cell-muted { color: #bdbdbd; }
    .cell-area { color: #757575; font-size: 11px; }

    /* Urgente */
    .urgente { color: #b71c1c; font-weight: 600; }
    .urgente-badge {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #ffebee;
      color: #b71c1c;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      vertical-align: middle;
    }

    /* Acciones */
    .asignado-tuyo {
      display: inline-flex; align-items: center; gap: 2px;
      background: #e8f5e9; color: #2e7d32;
      padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;
    }
    .asignado-otro {
      color: #9e9e9e; font-size: 12px;
    }
    .acciones-cell {
      display: flex;
      gap: 4px;
      align-items: center;
      flex-wrap: nowrap;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .mat-column-clienteNombre,
      .mat-column-etapa { display: none; }
    }

    @media (max-width: 480px) {
      .mat-column-creadoEn { display: none; }
    }
  `]
})
export class TramitesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  tramites: Tramite[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = true;

  rol: Rol = 'CLIENTE';
  user: User | null = null;
  currentUserId = '';

  filtrosForm: FormGroup;

  private readonly destroyRef = inject(DestroyRef);

  // Configuración por rol
  get headerTitle(): string {
    const titles: Record<Rol, string> = {
      ADMINISTRADOR: 'Monitor Global',
      FUNCIONARIO:   'Bandeja de Trabajo',
      CLIENTE:       'Mis Trámites'
    };
    return titles[this.rol];
  }

  get headerIcon(): string {
    const icons: Record<Rol, string> = {
      ADMINISTRADOR: 'monitor_heart',
      FUNCIONARIO:   'inbox',
      CLIENTE:       'assignment'
    };
    return icons[this.rol];
  }

  get displayedColumns(): string[] {
    if (this.rol === 'ADMINISTRADOR') {
      return ['estado', 'politicaNombre', 'clienteNombre', 'etapa', 'creadoEn', 'acciones'];
    }
    if (this.rol === 'FUNCIONARIO') {
      return ['estado', 'politicaNombre', 'clienteNombre', 'etapa', 'asignado', 'creadoEn', 'acciones'];
    }
    // CLIENTE
    return ['estado', 'politicaNombre', 'etapa', 'creadoEn', 'acciones'];
  }

  get pageSizeOptions(): number[] {
    return this.rol === 'ADMINISTRADOR' ? [10, 25, 50, 100] : [10, 20, 50];
  }

  get emptyMessage(): string {
    const estado = this.filtrosForm.get('estado')?.value as string;
    if (estado) return `No hay trámites en estado "${estado}" con los filtros actuales.`;
    const msgs: Record<Rol, string> = {
      ADMINISTRADOR: 'No hay trámites registrados en el sistema.',
      FUNCIONARIO:   'No hay trámites pendientes en tu bandeja.',
      CLIENTE:       'No tenés trámites iniciados.'
    };
    return msgs[this.rol];
  }

  get pendientesCount(): number {
    return this.tramites.filter(
      t => t.estado === 'INICIADO' || t.estado === 'EN_PROCESO' || t.estado === 'ESCALADO'
    ).length;
  }

  get tieneDevueltos(): boolean {
    return this.tramites.some(t => t.estado === 'DEVUELTO');
  }

  constructor(
    private readonly tramiteService: TramiteService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder
  ) {
    this.filtrosForm = this.fb.group({
      estado:     [''],
      busqueda:   [''],
      fechaDesde: [''],
      fechaHasta: ['']
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.currentUserId = this.user?.id ?? '';
    this.resolveRol();
    this.load();

    // Recargar al cambiar filtros (debounce para búsqueda de texto)
    this.filtrosForm.get('estado')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });

    this.filtrosForm.get('busqueda')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });

    this.filtrosForm.get('fechaDesde')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    this.filtrosForm.get('fechaHasta')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
      .subscribe(() => { this.pageIndex = 0; this.load(); });
  }

  private resolveRol(): void {
    const rolNombre = (this.user?.rolNombre ?? 'CLIENTE').toUpperCase();
    if (rolNombre.includes('ADMIN'))       this.rol = 'ADMINISTRADOR';
    else if (rolNombre.includes('FUNCION')) this.rol = 'FUNCIONARIO';
    else                                   this.rol = 'CLIENTE';
  }

  private load(): void {
    this.isLoading = true;
    const estado = this.filtrosForm.get('estado')?.value as string | undefined;

    this.tramiteService.getAll(this.pageIndex, this.pageSize, estado || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.tramites = res.content;
          this.totalElements = res.totalElements;
          this.isLoading = false;
        },
        error: (err: { error?: { message?: string } }) => {
          this.isLoading = false;
          console.error('[Tramites] Error al cargar:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al cargar los trámites',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  estadoConfig(estado: EstadoTramite): EstadoConfig {
    return getEstadoConfig(estado);
  }

  esUrgente(tramite: Tramite): boolean {
    if (tramite.estado === 'COMPLETADO' || tramite.estado === 'RECHAZADO' || tramite.estado === 'CANCELADO') {
      return false;
    }
    const creadoEn = new Date(tramite.creadoEn).getTime();
    const ahora = Date.now();
    const dias = (ahora - creadoEn) / (1000 * 60 * 60 * 24);
    return dias > 3;
  }

  verTramite(id: string, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/tramites', id]);
  }

  responderTramite(id: string, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/tramites', id, 'correccion']);
  }

  tomarTramite(id: string, event?: Event): void {
    event?.stopPropagation();
    this.tramiteService.tomar(id).subscribe({
      next: () => {
        this.snackBar.open('Trámite tomado — ahora está asignado a vos', '', { duration: 2500 });
        this.load();
      },
      error: (e: { error?: { message?: string } }) =>
        this.snackBar.open(e?.error?.message || 'Error al tomar el trámite', 'Cerrar', { duration: 3000 })
    });
  }
}
