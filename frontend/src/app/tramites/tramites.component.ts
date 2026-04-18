import { Component, OnInit, ViewChild, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

import { TramiteService } from '../shared/services/tramite.service';
import { AuthService } from '../shared/services/auth.service';
import { Tramite, EstadoTramite, EstadoConfig, estadoConfig as getEstadoConfig } from '../shared/models/tramite.model';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCardModule
  ],
  template: `
    <div class="tramites-shell">
      <!-- Header -->
      <div class="tramites-header">
        <div class="tramites-header-title">
          <mat-icon aria-hidden="true">assignment</mat-icon>
          <h1>Trámites</h1>
        </div>
        <button
          mat-raised-button
          color="primary"
          routerLink="/tramites/nuevo"
          aria-label="Iniciar nuevo trámite">
          <mat-icon>add</mat-icon>
          Nuevo Trámite
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="tramites-loading" role="status" aria-label="Cargando trámites">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Empty state -->
      <div *ngIf="!isLoading && tramites.length === 0" class="tramites-empty">
        <mat-icon aria-hidden="true">inbox</mat-icon>
        <p>No hay trámites registrados.</p>
        <button mat-stroked-button color="primary" routerLink="/tramites/nuevo">
          <mat-icon>add</mat-icon>
          Iniciar primer trámite
        </button>
      </div>

      <!-- Tabla -->
      <div *ngIf="!isLoading && tramites.length > 0" class="tramites-table-wrap">
        <table
          mat-table
          [dataSource]="tramites"
          class="tramites-table"
          aria-label="Lista de trámites">

          <!-- Estado -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
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
            <th mat-header-cell *matHeaderCellDef scope="col">Política</th>
            <td mat-cell *matCellDef="let t">
              <span class="cell-primary">{{ t.politicaNombre }}</span>
              <span class="cell-secondary">v{{ t.politicaVersion }}</span>
            </td>
          </ng-container>

          <!-- Etapa -->
          <ng-container matColumnDef="etapa">
            <th mat-header-cell *matHeaderCellDef scope="col">Etapa actual</th>
            <td mat-cell *matCellDef="let t">
              <span *ngIf="t.etapaActual; else sinEtapa">{{ t.etapaActual.nombre }}</span>
              <ng-template #sinEtapa><span class="cell-muted">—</span></ng-template>
            </td>
          </ng-container>

          <!-- Fecha -->
          <ng-container matColumnDef="creadoEn">
            <th mat-header-cell *matHeaderCellDef scope="col">Creado</th>
            <td mat-cell *matCellDef="let t">
              {{ t.creadoEn | date:'dd/MM/yyyy HH:mm' }}
            </td>
          </ng-container>

          <!-- Acciones -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
            <td mat-cell *matCellDef="let t">
              <div class="acciones-cell">
                <button
                  mat-icon-button
                  color="primary"
                  matTooltip="Ver / Ejecutar"
                  aria-label="Ver o ejecutar trámite"
                  (click)="verTramite(t.id)">
                  <mat-icon>open_in_new</mat-icon>
                </button>
                <button
                  *ngIf="t.estado === 'DEVUELTO' && esCliente(t)"
                  mat-icon-button
                  color="accent"
                  matTooltip="Responder corrección"
                  aria-label="Responder corrección de trámite devuelto"
                  (click)="responderTramite(t.id)">
                  <mat-icon>reply</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              class="tramite-row"
              (click)="verTramite(row.id)"
              (keydown.enter)="verTramite(row.id)"
              tabindex="0"
              [attr.aria-label]="'Trámite ' + row.politicaNombre + ', estado ' + estadoConfig(row.estado).label">
          </tr>
        </table>

        <mat-paginator
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
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
      gap: 24px;
      padding: 0;
    }

    .tramites-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .tramites-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tramites-header-title mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #1565c0;
    }

    .tramites-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a237e;
    }

    .tramites-loading {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

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

    .tramites-table-wrap {
      overflow: auto;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.08);
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
      background-color: rgba(21, 101, 192, 0.04);
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
      font-size: 0.75rem;
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
    .cell-primary {
      display: block;
      font-weight: 500;
    }

    .cell-secondary {
      display: block;
      font-size: 0.75rem;
      color: #757575;
    }

    .cell-muted {
      color: #bdbdbd;
    }

    .acciones-cell {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    /* Responsive: ocultar columnas en mobile */
    @media (max-width: 600px) {
      .mat-column-etapa,
      .mat-column-creadoEn {
        display: none;
      }
    }
  `]
})
export class TramitesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  tramites: Tramite[] = [];
  displayedColumns = ['estado', 'politicaNombre', 'etapa', 'creadoEn', 'acciones'];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = true;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly tramiteService: TramiteService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    this.tramiteService.getAll(this.pageIndex, this.pageSize)
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

  esCliente(tramite: Tramite): boolean {
    const user = this.authService.getCurrentUser();
    return user?.id === tramite.clienteId;
  }

  verTramite(id: string): void {
    this.router.navigate(['/tramites', id]);
  }

  responderTramite(id: string): void {
    this.router.navigate(['/tramites', id, 'correccion']);
  }
}
