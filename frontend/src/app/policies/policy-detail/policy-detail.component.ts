import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { PoliticaService } from '../../shared/services/politica.service';
import { ActividadService } from '../../shared/services/actividad.service';
import { Politica, EstadoPolitica } from '../../shared/models/politica.model';
import { Actividad } from '../../shared/models/actividad.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
    <div class="page-header">
      <h1>Detalle de Política</h1>
      <button mat-button routerLink="/policies">
        <mat-icon>arrow_back</mat-icon>
        Volver al listado
      </button>
    </div>

    <div *ngIf="isLoading" class="loading-container">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <ng-container *ngIf="!isLoading && politica">

      <!-- Info principal -->
      <mat-card class="main-card">
        <mat-card-header>
          <mat-icon mat-card-avatar [style.color]="politica.metadatos.color ?? '#1976d2'">
            {{ politica.metadatos.icono ?? 'description' }}
          </mat-icon>
          <mat-card-title>{{ politica.nombre }}</mat-card-title>
          <mat-card-subtitle>
            Versión {{ politica.version }} &nbsp;|&nbsp; Departamento: {{ politica.departamento }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="description">{{ politica.descripcion || 'Sin descripción' }}</p>

          <div class="meta-row">
            <span class="meta-label">Estado:</span>
            <mat-chip [ngClass]="getEstadoClass(politica.estado)" selected>{{ politica.estado }}</mat-chip>
          </div>

          <div class="meta-row" *ngIf="politica.metadatos?.tags?.length">
            <span class="meta-label">Etiquetas:</span>
            <mat-chip-set>
              <mat-chip *ngFor="let tag of politica.metadatos.tags">{{ tag }}</mat-chip>
            </mat-chip-set>
          </div>

          <div class="meta-row">
            <span class="meta-label">Creado:</span>
            <span>{{ politica.creadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Actualizado:</span>
            <span>{{ politica.actualizadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
        </mat-card-content>
        <mat-card-actions class="actions-row">
          <button
            mat-raised-button
            color="accent"
            *ngIf="politica.estado === 'BORRADOR'"
            [routerLink]="['/policies', politica.id, 'edit']">
            <mat-icon>edit</mat-icon>
            Editar
          </button>
          <button
            mat-raised-button
            color="primary"
            *ngIf="politica.estado === 'BORRADOR'"
            (click)="publish()"
            [disabled]="isActioning">
            <mat-icon>publish</mat-icon>
            Publicar
          </button>
          <button
            mat-raised-button
            *ngIf="politica.estado === 'ACTIVA' || politica.estado === 'ARCHIVADA'"
            (click)="newVersion()"
            [disabled]="isActioning">
            <mat-icon>file_copy</mat-icon>
            Nueva versión
          </button>
          <button
            mat-raised-button
            color="warn"
            *ngIf="politica.estado === 'ACTIVA'"
            (click)="deactivate()"
            [disabled]="isActioning">
            <mat-icon>pause_circle</mat-icon>
            Desactivar
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Actividades / Editor de flujo -->
      <mat-card class="activities-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_tree</mat-icon>
            Flujo de Actividades
          </mat-card-title>
          <mat-card-subtitle>{{ actividades.length }} actividades configuradas</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="loadingActividades" class="loading-container">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <div *ngIf="!loadingActividades && actividades.length === 0" class="empty-activities">
            <mat-icon class="empty-icon">account_tree</mat-icon>
            <p>No hay actividades configuradas. Abrí el editor de flujo para comenzar.</p>
          </div>

          <mat-list *ngIf="!loadingActividades && actividades.length > 0">
            <mat-list-item *ngFor="let act of actividades" class="activity-item">
              <mat-icon matListItemIcon [style.color]="getTipoColor(act.tipo)">
                {{ getTipoIcon(act.tipo) }}
              </mat-icon>
              <div matListItemTitle>{{ act.nombre }}</div>
              <div matListItemLine>
                {{ act.tipo }} &nbsp;|&nbsp; {{ act.descripcion || 'Sin descripción' }}
                <span *ngIf="act.tiempoLimiteHoras"> &nbsp;|&nbsp; Límite: {{ act.tiempoLimiteHoras }}h</span>
              </div>
            </mat-list-item>
          </mat-list>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" [routerLink]="['/policies', politica.id, 'flow']">
            <mat-icon>edit_note</mat-icon>
            Abrir Editor de Flujo
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Versiones relacionadas -->
      <mat-expansion-panel class="versions-panel" *ngIf="versiones.length > 0">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>history</mat-icon>&nbsp;
            Historial de versiones ({{ versiones.length }})
          </mat-panel-title>
        </mat-expansion-panel-header>
        <mat-list>
          <mat-list-item *ngFor="let v of versiones" class="version-item">
            <mat-icon matListItemIcon>description</mat-icon>
            <div matListItemTitle>
              v{{ v.version }} — {{ v.nombre }}
              <mat-chip class="version-chip" [ngClass]="getEstadoClass(v.estado)" selected>{{ v.estado }}</mat-chip>
            </div>
            <div matListItemLine>{{ v.creadoEn | date:'dd/MM/yyyy' }}</div>
            <button mat-icon-button [routerLink]="['/policies', v.id]" matTooltip="Ver" matListItemMeta>
              <mat-icon>visibility</mat-icon>
            </button>
          </mat-list-item>
        </mat-list>
      </mat-expansion-panel>

    </ng-container>
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
    .main-card { margin-bottom: 20px; }
    .activities-card { margin-bottom: 20px; }
    .versions-panel { margin-bottom: 20px; }
    .description { color: rgba(0,0,0,0.7); margin-bottom: 16px; }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .meta-label { font-weight: 500; color: rgba(0,0,0,0.6); min-width: 90px; }
    .actions-row { padding: 8px 16px 16px; display: flex; gap: 8px; flex-wrap: wrap; }
    .empty-activities {
      text-align: center;
      padding: 32px;
      color: rgba(0,0,0,0.4);
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .activity-item { border-bottom: 1px solid rgba(0,0,0,0.06); }
    .version-item { border-bottom: 1px solid rgba(0,0,0,0.06); }
    .version-chip { margin-left: 8px; font-size: 11px; }
    .chip-borrador { background-color: #9e9e9e !important; color: white !important; }
    .chip-activa   { background-color: #4caf50 !important; color: white !important; }
    .chip-inactiva { background-color: #ff9800 !important; color: white !important; }
    .chip-archivada{ background-color: #f44336 !important; color: white !important; }
    mat-card-header mat-icon[mat-card-avatar] {
      font-size: 36px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
    }
  `]
})
export class PolicyDetailComponent implements OnInit {
  politica: Politica | null = null;
  actividades: Actividad[] = [];
  versiones: Politica[] = [];
  isLoading = false;
  loadingActividades = false;
  isActioning = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private actividadService: ActividadService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/policies']);
      return;
    }
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.isLoading = true;
    this.politicaService.getById(id).subscribe({
      next: (p) => {
        this.politica = p;
        this.isLoading = false;
        this.loadActividades(id);
        this.loadVersiones(p);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err?.error?.message || 'Error al cargar la política', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/policies']);
      }
    });
  }

  private loadActividades(politicaId: string): void {
    this.loadingActividades = true;
    this.actividadService.getByPolitica(politicaId).subscribe({
      next: (acts) => {
        this.actividades = acts;
        this.loadingActividades = false;
      },
      error: () => { this.loadingActividades = false; }
    });
  }

  private loadVersiones(p: Politica): void {
    const parentId = p.versionPadreId ?? p.id;
    this.politicaService.getVersiones(parentId).subscribe({
      next: (vs) => {
        this.versiones = vs.filter(v => v.id !== p.id);
      },
      error: () => { this.versiones = []; }
    });
  }

  getEstadoClass(estado: EstadoPolitica): string {
    const map: Record<EstadoPolitica, string> = {
      BORRADOR: 'chip-borrador',
      ACTIVA: 'chip-activa',
      INACTIVA: 'chip-inactiva',
      ARCHIVADA: 'chip-archivada'
    };
    return map[estado] ?? '';
  }

  getTipoIcon(tipo: string): string {
    const m: Record<string, string> = {
      INICIO: 'play_circle',
      TAREA: 'task_alt',
      DECISION: 'device_hub',
      FIN: 'stop_circle'
    };
    return m[tipo] ?? 'circle';
  }

  getTipoColor(tipo: string): string {
    const m: Record<string, string> = {
      INICIO: '#4caf50',
      TAREA: '#1976d2',
      DECISION: '#f9a825',
      FIN: '#f44336'
    };
    return m[tipo] ?? '#9e9e9e';
  }

  publish(): void {
    if (!this.politica) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Publicar política',
        message: `¿Confirmás que querés publicar "${this.politica.nombre}"?`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.politica) return;
      this.isActioning = true;
      this.politicaService.publish(this.politica.id).subscribe({
        next: (p) => {
          this.politica = p;
          this.isActioning = false;
          this.snackBar.open('Política publicada', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.isActioning = false;
          this.snackBar.open(err?.error?.message || 'Error al publicar', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  deactivate(): void {
    if (!this.politica) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Desactivar política',
        message: `¿Confirmás que querés desactivar "${this.politica.nombre}"?`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.politica) return;
      this.isActioning = true;
      this.politicaService.deactivate(this.politica.id).subscribe({
        next: (p) => {
          this.politica = p;
          this.isActioning = false;
          this.snackBar.open('Política desactivada', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.isActioning = false;
          this.snackBar.open(err?.error?.message || 'Error al desactivar', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  newVersion(): void {
    if (!this.politica) return;
    this.isActioning = true;
    this.politicaService.newVersion(this.politica.id).subscribe({
      next: (nueva) => {
        this.isActioning = false;
        this.snackBar.open('Nueva versión creada', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/policies', nueva.id, 'edit']);
      },
      error: (err) => {
        this.isActioning = false;
        this.snackBar.open(err?.error?.message || 'Error al crear versión', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
