import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';

import { PoliticaService } from '../../shared/services/politica.service';
import { ActividadService } from '../../shared/services/actividad.service';
import { PoliticaRelacionService } from '../../shared/services/politica-relacion.service';
import { Politica, EstadoPolitica } from '../../shared/models/politica.model';
import { Actividad } from '../../shared/models/actividad.model';
import {
  PoliticaRelacionResponse,
  CreatePoliticaRelacionRequest,
  TipoRelacion
} from '../../shared/models/politica-relacion.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

// ─── Dialog interno para agregar relación ────────────────────────────────────

interface AgregarRelacionDialogData {
  politicasActivas: Politica[];
}

@Component({
  selector: 'app-agregar-relacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Agregar relación</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Política destino</mat-label>
          <mat-select formControlName="politicaDestinoId">
            <mat-option *ngFor="let p of data.politicasActivas" [value]="p.id">
              {{ p.nombre }} (v{{ p.version }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('politicaDestinoId')?.hasError('required')">Obligatorio</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de relación</mat-label>
          <mat-select formControlName="tipoRelacion">
            <mat-option value="DEPENDENCIA">DEPENDENCIA</mat-option>
            <mat-option value="PRECEDENCIA">PRECEDENCIA</mat-option>
            <mat-option value="COMPLEMENTO">COMPLEMENTO</mat-option>
            <mat-option value="EXCLUSION">EXCLUSION</mat-option>
            <mat-option value="OVERRIDE">OVERRIDE</mat-option>
            <mat-option value="ESCALAMIENTO">ESCALAMIENTO</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('tipoRelacion')?.hasError('required')">Obligatorio</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Prioridad</mat-label>
          <input matInput type="number" formControlName="prioridad" min="1" />
          <mat-error *ngIf="form.get('prioridad')?.hasError('required')">Obligatorio</mat-error>
          <mat-error *ngIf="form.get('prioridad')?.hasError('min')">Debe ser mayor a 0</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción (opcional)</mat-label>
          <textarea matInput formControlName="descripcion" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="confirm()">
        Agregar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display: flex; flex-direction: column; gap: 4px; min-width: 360px; } .full-width { width: 100%; }`]
})
export class AgregarRelacionDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AgregarRelacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AgregarRelacionDialogData,
    fb: FormBuilder
  ) {
    this.form = fb.group({
      politicaDestinoId: ['', Validators.required],
      tipoRelacion: ['DEPENDENCIA', Validators.required],
      prioridad: [1, [Validators.required, Validators.min(1)]]
    ,
      descripcion: ['']
    });
  }

  confirm(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const request: CreatePoliticaRelacionRequest = {
      politicaDestinoId: val.politicaDestinoId,
      tipoRelacion: val.tipoRelacion as TipoRelacion,
      prioridad: val.prioridad,
      descripcion: val.descripcion || undefined
    };
    this.dialogRef.close(request);
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
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
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule
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
          <mat-icon mat-card-avatar [style.color]="politica.metadatos.color || '#1976d2'">
            {{ politica.metadatos.icono || 'description' }}
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

      <!-- ── MEJORA 1: Panel de Relaciones ──────────────────────────────── -->
      <mat-card
        class="relations-card"
        *ngIf="politica.estado === 'BORRADOR' || politica.estado === 'ACTIVA'">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>device_hub</mat-icon>
            Relaciones con otras políticas
          </mat-card-title>
          <mat-card-subtitle>{{ relaciones.length }} relación(es) configurada(s)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="loadingRelaciones" class="loading-container">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <div *ngIf="!loadingRelaciones && relaciones.length === 0" class="empty-relations">
            <mat-icon class="empty-icon">device_hub</mat-icon>
            <p>Sin relaciones configuradas.</p>
          </div>

          <div *ngIf="!loadingRelaciones && relaciones.length > 0" class="relations-list">
            <div *ngFor="let rel of relaciones" class="relation-chip-row">
              <span
                class="tipo-badge"
                [style.background]="getTipoRelacionColor(rel.tipoRelacion)"
                [style.color]="'white'">
                {{ rel.tipoRelacion }}
              </span>
              <mat-icon class="arrow-icon">arrow_forward</mat-icon>
              <span class="dest-nombre">{{ rel.politicaDestinoNombre }}</span>
              <span class="prioridad-label">(prioridad: {{ rel.prioridad }})</span>
              <span *ngIf="rel.descripcion" class="rel-desc">— {{ rel.descripcion }}</span>
              <button
                mat-icon-button
                color="warn"
                class="delete-rel-btn"
                matTooltip="Eliminar relación"
                (click)="deleteRelacion(rel)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="accent" (click)="openAgregarRelacion()">
            <mat-icon>add_link</mat-icon>
            Agregar relación
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- ── MEJORA 3: Árbol de versiones ───────────────────────────────── -->
      <mat-card
        class="versions-card"
        *ngIf="todasLasVersiones.length > 0">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>history</mat-icon>
            Historial de versiones
          </mat-card-title>
          <mat-card-subtitle>{{ todasLasVersiones.length }} versión(es) en el árbol</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="loadingVersiones" class="loading-container">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <div *ngIf="!loadingVersiones" class="version-stepper">
            <ng-container *ngFor="let v of todasLasVersiones; let last = last">
              <div
                class="version-step"
                [class.version-step--current]="v.id === politica.id">
                <div class="version-step__circle">
                  <mat-icon *ngIf="v.id === politica.id">star</mat-icon>
                  <span *ngIf="v.id !== politica.id">v{{ v.version }}</span>
                </div>
                <div class="version-step__info">
                  <span class="version-step__label">
                    v{{ v.version }}
                    <span *ngIf="v.id === politica.id" class="actual-label">(actual)</span>
                  </span>
                  <mat-chip [ngClass]="getEstadoClass(v.estado)" selected class="version-chip">
                    {{ v.estado }}
                  </mat-chip>
                  <span class="version-step__date">{{ v.creadoEn | date:'dd/MM/yyyy' }}</span>
                </div>
                <button
                  *ngIf="v.id !== politica.id"
                  mat-icon-button
                  [routerLink]="['/policies', v.id]"
                  matTooltip="Ver versión">
                  <mat-icon>visibility</mat-icon>
                </button>
              </div>
              <div *ngIf="!last" class="version-connector">
                <mat-icon>arrow_downward</mat-icon>
              </div>
            </ng-container>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Versiones relacionadas (panel colapsable legacy, se mantiene para no romper) -->
      <mat-expansion-panel class="versions-panel" *ngIf="versiones.length > 0">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>history</mat-icon>&nbsp;
            Otras versiones relacionadas ({{ versiones.length }})
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
    .relations-card { margin-bottom: 20px; }
    .versions-card { margin-bottom: 20px; }
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
    .empty-activities, .empty-relations {
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

    /* Relaciones */
    .relations-list { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    .relation-chip-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.03);
      flex-wrap: wrap;
    }
    .tipo-badge {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .arrow-icon { font-size: 18px; width: 18px; height: 18px; color: rgba(0,0,0,0.4); }
    .dest-nombre { font-weight: 500; font-size: 14px; }
    .prioridad-label { font-size: 12px; color: rgba(0,0,0,0.5); }
    .rel-desc { font-size: 12px; color: rgba(0,0,0,0.5); font-style: italic; flex: 1; }
    .delete-rel-btn { margin-left: auto; }

    /* Árbol de versiones */
    .version-stepper {
      display: flex;
      flex-direction: column;
      padding: 8px 0;
    }
    .version-step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.12);
      background: white;
    }
    .version-step--current {
      border-color: #1976d2;
      background: #e3f2fd;
    }
    .version-step__circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .version-step--current .version-step__circle {
      background: #1976d2;
      color: white;
    }
    .version-step--current .version-step__circle mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: white;
    }
    .version-step__info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      flex-wrap: wrap;
    }
    .version-step__label { font-weight: 600; font-size: 14px; }
    .actual-label { font-size: 11px; color: #1976d2; font-weight: 400; }
    .version-step__date { font-size: 12px; color: rgba(0,0,0,0.5); }
    .version-connector {
      display: flex;
      justify-content: center;
      color: rgba(0,0,0,0.3);
      padding: 2px 0;
    }
  `]
})
export class PolicyDetailComponent implements OnInit {
  politica: Politica | null = null;
  actividades: Actividad[] = [];
  versiones: Politica[] = [];

  // Mejora 1: relaciones
  relaciones: PoliticaRelacionResponse[] = [];
  loadingRelaciones = false;

  // Mejora 3: árbol de versiones completo
  todasLasVersiones: Politica[] = [];
  loadingVersiones = false;

  isLoading = false;
  loadingActividades = false;
  isActioning = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private actividadService: ActividadService,
    private relacionService: PoliticaRelacionService,
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
        this.loadVersionTree(p);
        if (p.estado === 'BORRADOR' || p.estado === 'ACTIVA') {
          this.loadRelaciones(id);
        }
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

  // ── Mejora 3: árbol completo de versiones ──────────────────────────────────

  private loadVersionTree(p: Politica): void {
    // Solo mostramos si hay árbol (versionPadreId existe o versión > 1)
    if (!p.versionPadreId && p.version <= 1) {
      this.todasLasVersiones = [];
      return;
    }
    this.loadingVersiones = true;
    const parentId = p.versionPadreId ?? p.id;
    this.politicaService.getVersiones(parentId).subscribe({
      next: (vs) => {
        // Incluir la política raíz si no está en el listado (cuando getVersiones filtra por versionPadreId)
        const incluyeRaiz = vs.some(v => v.id === parentId);
        if (!incluyeRaiz) {
          // Cargar la raíz por separado
          this.politicaService.getById(parentId).subscribe({
            next: (raiz) => {
              const todas = [raiz, ...vs].sort((a, b) => a.version - b.version);
              // Asegurarse de que la política actual está en el árbol
              const estaActual = todas.some(v => v.id === p.id);
              this.todasLasVersiones = estaActual
                ? todas
                : [...todas.filter(v => v.id !== p.id), p].sort((a, b) => a.version - b.version);
              this.loadingVersiones = false;
            },
            error: () => {
              this.todasLasVersiones = vs.sort((a, b) => a.version - b.version);
              this.loadingVersiones = false;
            }
          });
        } else {
          const todas = vs.sort((a, b) => a.version - b.version);
          const estaActual = todas.some(v => v.id === p.id);
          this.todasLasVersiones = estaActual
            ? todas
            : [...todas, p].sort((a, b) => a.version - b.version);
          this.loadingVersiones = false;
        }
      },
      error: () => {
        this.todasLasVersiones = [];
        this.loadingVersiones = false;
      }
    });
  }

  // ── Mejora 1: Relaciones ───────────────────────────────────────────────────

  private loadRelaciones(politicaId: string): void {
    this.loadingRelaciones = true;
    this.relacionService.getByPolitica(politicaId).subscribe({
      next: (rels) => {
        this.relaciones = rels;
        this.loadingRelaciones = false;
      },
      error: () => {
        this.loadingRelaciones = false;
        this.snackBar.open('No se pudieron cargar las relaciones', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openAgregarRelacion(): void {
    if (!this.politica) return;
    // Cargar políticas activas para el select
    this.politicaService.getAll({ estado: 'ACTIVA' }).subscribe({
      next: (politicas) => {
        const disponibles = politicas.filter(p => p.id !== this.politica!.id);
        const ref = this.dialog.open(AgregarRelacionDialogComponent, {
          data: { politicasActivas: disponibles } as AgregarRelacionDialogData,
          width: '460px'
        });
        ref.afterClosed().subscribe((request: CreatePoliticaRelacionRequest | null) => {
          if (!request || !this.politica) return;
          this.relacionService.create(this.politica.id, request).subscribe({
            next: (nueva) => {
              this.relaciones = [...this.relaciones, nueva];
              this.snackBar.open('Relación agregada', 'Cerrar', { duration: 3000 });
            },
            error: (err) => {
              this.snackBar.open(err?.error?.message || 'Error al agregar relación', 'Cerrar', { duration: 4000 });
            }
          });
        });
      },
      error: () => {
        this.snackBar.open('No se pudieron cargar las políticas activas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  deleteRelacion(rel: PoliticaRelacionResponse): void {
    if (!this.politica) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar relación',
        message: `¿Eliminás la relación "${rel.tipoRelacion}" con "${rel.politicaDestinoNombre}"?`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.politica) return;
      this.relacionService.delete(this.politica.id, rel.id).subscribe({
        next: () => {
          this.relaciones = this.relaciones.filter(r => r.id !== rel.id);
          this.snackBar.open('Relación eliminada', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err?.error?.message || 'Error al eliminar relación', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  getTipoRelacionColor(tipo: TipoRelacion): string {
    const map: Record<TipoRelacion, string> = {
      DEPENDENCIA: '#1976d2',
      PRECEDENCIA: '#e65100',
      COMPLEMENTO: '#388e3c',
      EXCLUSION: '#d32f2f',
      OVERRIDE: '#7b1fa2',
      ESCALAMIENTO: '#f9a825'
    };
    return map[tipo] ?? '#757575';
  }

  // ── Acciones existentes ────────────────────────────────────────────────────

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
