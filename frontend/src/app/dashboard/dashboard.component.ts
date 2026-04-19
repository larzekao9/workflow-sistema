import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../shared/services/auth.service';
import { TramiteService } from '../shared/services/tramite.service';
import { Tramite, TramiteStats, EstadoTramite, EstadoConfig, estadoConfig as getEstadoConfig } from '../shared/models/tramite.model';
import { User } from '../shared/models/user.model';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="dashboard-shell">

      <!-- Loading skeleton -->
      <div *ngIf="isLoading" class="loading-center" role="status" aria-label="Cargando dashboard">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <ng-container *ngIf="!isLoading && user">

        <!-- ─────────────────────────────── CLIENTE ─────────────────────────────── -->
        <ng-container *ngIf="rolIs('CLIENTE')">
          <!-- Welcome -->
          <div class="welcome-block">
            <div class="welcome-text">
              <h1 class="welcome-title">Bienvenido, {{ user.nombreCompleto.split(' ')[0] }}</h1>
              <p class="welcome-sub">Consultá el estado de tus trámites o iniciá uno nuevo.</p>
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

          <!-- Banner devueltos -->
          <div
            *ngIf="stats && stats.devueltos > 0"
            class="alert-banner alert-warn"
            role="alert"
            aria-live="polite">
            <mat-icon aria-hidden="true">warning_amber</mat-icon>
            <span>
              Tenés <strong>{{ stats.devueltos }}</strong>
              {{ stats.devueltos === 1 ? 'trámite devuelto que requiere' : 'trámites devueltos que requieren' }}
              tu atención.
            </span>
            <button
              mat-stroked-button
              routerLink="/tramites"
              aria-label="Ir a mis trámites devueltos">
              Ver bandeja
            </button>
          </div>

          <!-- Stat cards CLIENTE: 3 cards -->
          <div class="stats-grid stats-grid--3" *ngIf="stats" role="list">
            <mat-card
              class="stat-card stat-primary"
              role="listitem"
              [attr.aria-label]="'Total mis trámites: ' + stats.total">
              <mat-card-content>
                <mat-icon aria-hidden="true">assignment</mat-icon>
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">Mis Trámites</span>
              </mat-card-content>
            </mat-card>

            <mat-card
              class="stat-card stat-accent"
              role="listitem"
              [attr.aria-label]="'En proceso: ' + stats.enProceso">
              <mat-card-content>
                <mat-icon aria-hidden="true">pending_actions</mat-icon>
                <span class="stat-value">{{ stats.enProceso }}</span>
                <span class="stat-label">En Proceso</span>
              </mat-card-content>
            </mat-card>

            <mat-card
              class="stat-card stat-warn"
              role="listitem"
              [attr.aria-label]="'Devueltos: ' + stats.devueltos">
              <mat-card-content>
                <mat-icon aria-hidden="true">reply</mat-icon>
                <span class="stat-value">{{ stats.devueltos }}</span>
                <span class="stat-label">Devueltos</span>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Tabla últimos 5 tramites -->
          <mat-card class="table-card" *ngIf="ultimosTramites.length > 0">
            <mat-card-header>
              <mat-card-title>
                <mat-icon aria-hidden="true">history</mat-icon>
                Últimos trámites
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="ultimosTramites" aria-label="Últimos trámites del cliente">
                <ng-container matColumnDef="politicaNombre">
                  <th mat-header-cell *matHeaderCellDef scope="col">Política</th>
                  <td mat-cell *matCellDef="let t">{{ t.politicaNombre }}</td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="estado-chip {{ estadoConfig(t.estado).cssClass }}"
                          [attr.aria-label]="'Estado: ' + estadoConfig(t.estado).label">
                      {{ estadoConfig(t.estado).label }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="creadoEn">
                  <th mat-header-cell *matHeaderCellDef scope="col">Fecha</th>
                  <td mat-cell *matCellDef="let t">{{ t.creadoEn | date:'dd/MM/yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col">Ver</th>
                  <td mat-cell *matCellDef="let t">
                    <button mat-icon-button color="primary"
                            [routerLink]="['/tramites', t.id]"
                            [attr.aria-label]="'Ver trámite ' + t.politicaNombre">
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="clienteCols"></tr>
                <tr mat-row *matRowDef="let row; columns: clienteCols;"
                    class="clickable-row"
                    [routerLink]="['/tramites', row.id]"
                    tabindex="0"
                    (keydown.enter)="navigate('/tramites/' + row.id)"
                    [attr.aria-label]="'Ir al trámite ' + row.politicaNombre">
                </tr>
              </table>
            </mat-card-content>
          </mat-card>

          <!-- Empty state -->
          <div *ngIf="!stats || stats.total === 0" class="empty-state">
            <mat-icon aria-hidden="true">inbox</mat-icon>
            <p>Aún no tenés trámites iniciados.</p>
            <button mat-raised-button color="primary" routerLink="/tramites/nuevo">
              <mat-icon>add</mat-icon>
              Iniciar primer trámite
            </button>
          </div>
        </ng-container>

        <!-- ──────────────────────────────── FUNCIONARIO ──────────────────────────────── -->
        <ng-container *ngIf="rolIs('FUNCIONARIO')">
          <div class="welcome-block">
            <div class="welcome-text">
              <h1 class="welcome-title">Bandeja — {{ user.nombreCompleto.split(' ')[0] }}</h1>
              <p class="welcome-sub">Trámites pendientes de revisión asignados a tu rol.</p>
            </div>
            <button mat-raised-button color="primary" routerLink="/tramites"
                    aria-label="Ver bandeja completa">
              <mat-icon>inbox</mat-icon>
              Ver bandeja
            </button>
          </div>

          <!-- 4 stat cards -->
          <div class="stats-grid stats-grid--4" *ngIf="stats" role="list">
            <mat-card class="stat-card stat-warn" role="listitem"
                      [attr.aria-label]="'Pendientes: ' + pendientes">
              <mat-card-content>
                <mat-icon aria-hidden="true">pending_actions</mat-icon>
                <span class="stat-value">{{ pendientes }}</span>
                <span class="stat-label">Pendientes</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-success" role="listitem"
                      [attr.aria-label]="'Completados: ' + stats.completados">
              <mat-card-content>
                <mat-icon aria-hidden="true">check_circle</mat-icon>
                <span class="stat-value">{{ stats.completados }}</span>
                <span class="stat-label">Completados</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-purple" role="listitem"
                      [attr.aria-label]="'Escalados: ' + stats.escalados">
              <mat-card-content>
                <mat-icon aria-hidden="true">escalator_warning</mat-icon>
                <span class="stat-value">{{ stats.escalados }}</span>
                <span class="stat-label">Escalados</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-muted" role="listitem"
                      [attr.aria-label]="'Total: ' + stats.total">
              <mat-card-content>
                <mat-icon aria-hidden="true">summarize</mat-icon>
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">Total</span>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Tabla urgentes -->
          <mat-card class="table-card" *ngIf="ultimosTramites.length > 0">
            <mat-card-header>
              <mat-card-title>
                <mat-icon aria-hidden="true">priority_high</mat-icon>
                Trámites recientes activos
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="tramitesActivos" aria-label="Trámites activos recientes">
                <ng-container matColumnDef="politicaNombre">
                  <th mat-header-cell *matHeaderCellDef scope="col">Política</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="cell-primary">{{ t.politicaNombre }}</span>
                    <span class="cell-secondary" *ngIf="t.clienteNombre">{{ t.clienteNombre }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="etapa">
                  <th mat-header-cell *matHeaderCellDef scope="col">Etapa</th>
                  <td mat-cell *matCellDef="let t">
                    <span *ngIf="t.etapaActual">{{ t.etapaActual.nombre }}</span>
                    <span *ngIf="!t.etapaActual" class="cell-muted">—</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="estado-chip {{ estadoConfig(t.estado).cssClass }}"
                          [attr.aria-label]="'Estado: ' + estadoConfig(t.estado).label">
                      {{ estadoConfig(t.estado).label }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="creadoEn">
                  <th mat-header-cell *matHeaderCellDef scope="col">Fecha</th>
                  <td mat-cell *matCellDef="let t">{{ t.creadoEn | date:'dd/MM/yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col">Resolver</th>
                  <td mat-cell *matCellDef="let t">
                    <button mat-flat-button
                            [color]="t.estado === 'ESCALADO' ? 'accent' : 'primary'"
                            [routerLink]="['/tramites', t.id]"
                            [attr.aria-label]="'Resolver trámite ' + t.politicaNombre">
                      Resolver
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="funcionarioCols"></tr>
                <tr mat-row *matRowDef="let row; columns: funcionarioCols;"
                    class="clickable-row"
                    [routerLink]="['/tramites', row.id]"
                    tabindex="0"
                    (keydown.enter)="navigate('/tramites/' + row.id)"
                    [attr.aria-label]="'Ir al trámite ' + row.politicaNombre">
                </tr>
              </table>
            </mat-card-content>
          </mat-card>
        </ng-container>

        <!-- ──────────────────────────────── ADMIN ──────────────────────────────── -->
        <ng-container *ngIf="rolIs('ADMIN')">
          <div class="welcome-block">
            <div class="welcome-text">
              <h1 class="welcome-title">Panel Administrativo</h1>
              <p class="welcome-sub">Visión global del sistema de trámites.</p>
            </div>
          </div>

          <!-- 7 stat cards en grid -->
          <div class="stats-grid stats-grid--auto" *ngIf="stats" role="list">
            <mat-card class="stat-card stat-muted" role="listitem"
                      [attr.aria-label]="'Total trámites: ' + stats.total">
              <mat-card-content>
                <mat-icon aria-hidden="true">summarize</mat-icon>
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">Total</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-blue" role="listitem"
                      [attr.aria-label]="'Iniciados: ' + stats.iniciados">
              <mat-card-content>
                <mat-icon aria-hidden="true">play_circle</mat-icon>
                <span class="stat-value">{{ stats.iniciados }}</span>
                <span class="stat-label">Iniciados</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-accent" role="listitem"
                      [attr.aria-label]="'En proceso: ' + stats.enProceso">
              <mat-card-content>
                <mat-icon aria-hidden="true">pending_actions</mat-icon>
                <span class="stat-value">{{ stats.enProceso }}</span>
                <span class="stat-label">En Proceso</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-success" role="listitem"
                      [attr.aria-label]="'Completados: ' + stats.completados">
              <mat-card-content>
                <mat-icon aria-hidden="true">check_circle</mat-icon>
                <span class="stat-value">{{ stats.completados }}</span>
                <span class="stat-label">Completados</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-error" role="listitem"
                      [attr.aria-label]="'Rechazados: ' + stats.rechazados">
              <mat-card-content>
                <mat-icon aria-hidden="true">cancel</mat-icon>
                <span class="stat-value">{{ stats.rechazados }}</span>
                <span class="stat-label">Rechazados</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-warn" role="listitem"
                      [attr.aria-label]="'Devueltos: ' + stats.devueltos">
              <mat-card-content>
                <mat-icon aria-hidden="true">reply</mat-icon>
                <span class="stat-value">{{ stats.devueltos }}</span>
                <span class="stat-label">Devueltos</span>
              </mat-card-content>
            </mat-card>
            <mat-card class="stat-card stat-purple" role="listitem"
                      [attr.aria-label]="'Escalados: ' + stats.escalados">
              <mat-card-content>
                <mat-icon aria-hidden="true">escalator_warning</mat-icon>
                <span class="stat-value">{{ stats.escalados }}</span>
                <span class="stat-label">Escalados</span>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Tabla últimas actividades -->
          <mat-card class="table-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon aria-hidden="true">history</mat-icon>
                Últimas actividades
              </mat-card-title>
              <mat-card-subtitle>{{ ultimosTramites.length }} trámites más recientes</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div *ngIf="ultimosTramites.length === 0" class="empty-table">
                Sin trámites registrados aún.
              </div>
              <table mat-table [dataSource]="ultimosTramites" aria-label="Últimas actividades del sistema"
                     *ngIf="ultimosTramites.length > 0">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef scope="col">ID</th>
                  <td mat-cell *matCellDef="let t">
                    <code class="id-code" [matTooltip]="t.id">{{ t.id.slice(0, 8) }}...</code>
                  </td>
                </ng-container>
                <ng-container matColumnDef="politicaNombre">
                  <th mat-header-cell *matHeaderCellDef scope="col">Política</th>
                  <td mat-cell *matCellDef="let t">{{ t.politicaNombre }}</td>
                </ng-container>
                <ng-container matColumnDef="clienteNombre">
                  <th mat-header-cell *matHeaderCellDef scope="col">Cliente</th>
                  <td mat-cell *matCellDef="let t">{{ t.clienteNombre || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="etapa">
                  <th mat-header-cell *matHeaderCellDef scope="col">Etapa</th>
                  <td mat-cell *matCellDef="let t">
                    <span *ngIf="t.etapaActual">{{ t.etapaActual.nombre }}</span>
                    <span *ngIf="!t.etapaActual" class="cell-muted">—</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="estado-chip {{ estadoConfig(t.estado).cssClass }}"
                          [attr.aria-label]="'Estado: ' + estadoConfig(t.estado).label">
                      {{ estadoConfig(t.estado).label }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="creadoEn">
                  <th mat-header-cell *matHeaderCellDef scope="col">Fecha</th>
                  <td mat-cell *matCellDef="let t">{{ t.creadoEn | date:'dd/MM/yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col">Ver</th>
                  <td mat-cell *matCellDef="let t">
                    <button mat-icon-button color="primary"
                            [routerLink]="['/tramites', t.id]"
                            [attr.aria-label]="'Ver trámite ' + t.id.slice(0,8)">
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="adminCols"></tr>
                <tr mat-row *matRowDef="let row; columns: adminCols;"
                    class="clickable-row"
                    [routerLink]="['/tramites', row.id]"
                    tabindex="0"
                    (keydown.enter)="navigate('/tramites/' + row.id)"
                    [attr.aria-label]="'Ir al trámite ' + row.id.slice(0,8)">
                </tr>
              </table>
            </mat-card-content>
          </mat-card>
        </ng-container>

      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Loading */
    .loading-center {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* Welcome block */
    .welcome-block {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .welcome-title {
      margin: 0 0 4px;
      font-size: 1.6rem;
      font-weight: 700;
      color: #1a237e;
    }

    .welcome-sub {
      margin: 0;
      font-size: 0.95rem;
      color: #5f6368;
    }

    /* Alert banner */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      flex-wrap: wrap;
    }

    .alert-warn {
      background: #fff8e1;
      border: 1px solid #ffc107;
      color: #5d4037;
    }

    .alert-warn mat-icon {
      color: #f57f17;
      flex-shrink: 0;
    }

    .alert-banner span {
      flex: 1;
    }

    /* Stats grids */
    .stats-grid {
      display: grid;
      gap: 16px;
    }

    .stats-grid--3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .stats-grid--4 {
      grid-template-columns: repeat(4, 1fr);
    }

    .stats-grid--auto {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    @media (max-width: 900px) {
      .stats-grid--4 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 600px) {
      .stats-grid--3 { grid-template-columns: repeat(2, 1fr); }
      .stats-grid--4 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 400px) {
      .stats-grid--3 { grid-template-columns: 1fr; }
    }

    /* Stat cards */
    .stat-card {
      border-radius: 10px;
      transition: transform 150ms ease-out, box-shadow 150ms ease-out;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }

    .stat-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 20px 16px !important;
      text-align: center;
    }

    .stat-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .stat-label {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.75;
    }

    /* Stat card color variants */
    .stat-primary { background: #e3f2fd; }
    .stat-primary .stat-value,
    .stat-primary mat-icon { color: #0d47a1; }

    .stat-accent  { background: #e8eaf6; }
    .stat-accent .stat-value,
    .stat-accent mat-icon  { color: #283593; }

    .stat-warn    { background: #fff3e0; }
    .stat-warn .stat-value,
    .stat-warn mat-icon    { color: #e65100; }

    .stat-success { background: #e8f5e9; }
    .stat-success .stat-value,
    .stat-success mat-icon { color: #1b5e20; }

    .stat-error   { background: #ffebee; }
    .stat-error .stat-value,
    .stat-error mat-icon   { color: #b71c1c; }

    .stat-purple  { background: #f3e5f5; }
    .stat-purple .stat-value,
    .stat-purple mat-icon  { color: #6a1b9a; }

    .stat-muted   { background: #fafafa; }
    .stat-muted .stat-value,
    .stat-muted mat-icon   { color: #424242; }

    .stat-blue    { background: #e1f5fe; }
    .stat-blue .stat-value,
    .stat-blue mat-icon    { color: #01579b; }

    /* Table card */
    .table-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .table-card {
      border-radius: 10px;
      overflow: hidden;
    }

    table[mat-table] {
      width: 100%;
    }

    .clickable-row {
      cursor: pointer;
      transition: background-color 150ms ease-out;
    }

    .clickable-row:hover {
      background: rgba(21, 101, 192, 0.04);
    }

    .clickable-row:focus {
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

    /* ID code */
    .id-code {
      font-family: 'Courier New', monospace;
      font-size: 0.78rem;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      color: #424242;
    }

    /* Empty states */
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

    .empty-table {
      padding: 24px;
      text-align: center;
      color: #9e9e9e;
      font-style: italic;
    }

    /* Responsive: ocultar cols en mobile */
    @media (max-width: 600px) {
      .mat-column-creadoEn,
      .mat-column-clienteNombre,
      .mat-column-id { display: none; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  stats: TramiteStats | null = null;
  ultimosTramites: Tramite[] = [];
  isLoading = true;

  readonly clienteCols    = ['politicaNombre', 'estado', 'creadoEn', 'acciones'];
  readonly funcionarioCols = ['politicaNombre', 'etapa', 'estado', 'creadoEn', 'acciones'];
  readonly adminCols      = ['id', 'politicaNombre', 'clienteNombre', 'etapa', 'estado', 'creadoEn', 'acciones'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly authService: AuthService,
    private readonly tramiteService: TramiteService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadData();
  }

  estadoConfig(estado: EstadoTramite): EstadoConfig {
    return getEstadoConfig(estado);
  }

  rolIs(rol: string): boolean {
    return (this.user?.rolNombre ?? 'CLIENTE').toUpperCase().includes(rol.toUpperCase());
  }

  get pendientes(): number {
    if (!this.stats) return 0;
    return this.stats.iniciados + this.stats.enProceso;
  }

  get tramitesActivos(): Tramite[] {
    return this.ultimosTramites.filter(
      t => t.estado === 'INICIADO' || t.estado === 'EN_PROCESO'
    ).slice(0, 5);
  }

  navigate(url: string): void {
    this.router.navigateByUrl(url);
  }

  private loadData(): void {
    const pageSize = this.rolIs('ADMIN') ? 10 : 5;

    forkJoin({
      stats: this.tramiteService.getStats().pipe(
        catchError((err: unknown) => {
          console.error('[Dashboard] Error cargando stats:', err);
          return of(null);
        })
      ),
      tramites: this.tramiteService.getAll(0, pageSize).pipe(
        catchError((err: unknown) => {
          console.error('[Dashboard] Error cargando trámites:', err);
          return of({ content: [], totalElements: 0 });
        })
      )
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ stats, tramites }) => {
        this.stats = stats;
        this.ultimosTramites = tramites.content;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar el dashboard', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
