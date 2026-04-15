import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  Subject,
  forkJoin,
  debounceTime,
  takeUntil
} from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

import { PoliticaService } from '../../shared/services/politica.service';
import { ActividadService } from '../../shared/services/actividad.service';
import { RoleService } from '../../shared/services/role.service';
import { FormularioService } from '../../shared/services/formulario.service';
import { FormularioResponse } from '../../shared/models/formulario.model';
import { Politica } from '../../shared/models/politica.model';
import { Role } from '../../shared/models/role.model';
import {
  Actividad,
  TipoActividad,
  Transicion,
  CreateActividadRequest,
  UpdateActividadRequest
} from '../../shared/models/actividad.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

// ── Interfaces internas ──────────────────────────────────────────────────────

interface NodoSVG extends Actividad {
  /** Subtipo visual sólo en frontend (para nodos avanzados mapeados a TAREA). */
  subtipoVisual?: SubtipoVisual;
  /** Errores de validación actuales para este nodo. */
  validationErrors?: string[];
  /** Warnings de validación para este nodo. */
  validationWarnings?: string[];
}

type SubtipoVisual =
  | 'APROBACION'
  | 'NOTIFICACION'
  | 'PARALELO'
  | 'SUBPROCESO';

interface ConexionUI {
  desde: NodoSVG;
  hasta: NodoSVG;
  transicion: Transicion;
  path: string;
  midX: number;
  midY: number;
}

interface PaletteItem {
  tipo: TipoActividad;
  subtipoVisual?: SubtipoVisual;
  label: string;
  group: 'basic' | 'advanced';
  defaultNombre: string;
  defaultDescripcion: string;
}

interface ValidationError {
  type: 'NO_START' | 'NO_END' | 'ORPHAN_NODE' | 'DEAD_END' | 'DUPLICATE_START';
  message: string;
  nodeId?: string;
}

interface ValidationWarning {
  message: string;
  nodeId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

type PanelMode = 'none' | 'nodo' | 'conexion';
type VistaEditor = 'grafo' | 'swimlane';

interface SwimlaneLane {
  rolId: string | null;
  rolNombre: string;
  actividades: NodoSVG[];
}

// ── Palette catalog ──────────────────────────────────────────────────────────

const PALETTE_ITEMS: PaletteItem[] = [
  { tipo: 'INICIO',    subtipoVisual: undefined, label: 'Inicio',        group: 'basic',    defaultNombre: 'Inicio',        defaultDescripcion: 'Punto de inicio del flujo' },
  { tipo: 'TAREA',     subtipoVisual: undefined, label: 'Tarea',         group: 'basic',    defaultNombre: 'Nueva tarea',   defaultDescripcion: '' },
  { tipo: 'DECISION',  subtipoVisual: undefined, label: 'Decisión',      group: 'basic',    defaultNombre: 'Decisión',      defaultDescripcion: '' },
  { tipo: 'FIN',       subtipoVisual: undefined, label: 'Fin',           group: 'basic',    defaultNombre: 'Fin',           defaultDescripcion: 'Punto de fin del flujo' },
  { tipo: 'TAREA', subtipoVisual: 'APROBACION',  label: 'Aprobación',    group: 'advanced', defaultNombre: 'Aprobación',    defaultDescripcion: 'Requiere aprobación de un responsable' },
  { tipo: 'TAREA', subtipoVisual: 'NOTIFICACION',label: 'Notificación',  group: 'advanced', defaultNombre: 'Notificación',  defaultDescripcion: 'Envía una notificación automática' },
  { tipo: 'TAREA', subtipoVisual: 'PARALELO',    label: 'Paralelo',      group: 'advanced', defaultNombre: 'Proceso paralelo', defaultDescripcion: 'Ejecuta tareas en paralelo' },
  { tipo: 'TAREA', subtipoVisual: 'SUBPROCESO',  label: 'Subproceso',    group: 'advanced', defaultNombre: 'Subproceso',    defaultDescripcion: 'Llama a un subproceso externo' },
];

// ── Dimensiones de nodos SVG ─────────────────────────────────────────────────

const NODE_DIMS: Record<TipoActividad, { w: number; h: number }> = {
  INICIO:   { w: 100, h: 70 },
  TAREA:    { w: 140, h: 64 },
  DECISION: { w: 120, h: 70 },
  FIN:      { w: 100, h: 70 }
};

@Component({
  selector: 'app-flow-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
<div class="wb-shell" (click)="onCanvasBackgroundClick($event)">

  <!-- ╔══════════════ TOP BAR ══════════════╗ -->
  <header class="wb-topbar" (click)="$event.stopPropagation()">
    <button mat-icon-button
      [routerLink]="['/policies', politicaId]"
      matTooltip="Volver al detalle"
      aria-label="Volver al detalle de la política"
      class="wb-back-btn">
      <mat-icon>arrow_back</mat-icon>
    </button>

    <div class="wb-logo-divider"></div>

    <!-- Nombre editable inline -->
    <div class="wb-title-area">
      <span *ngIf="!editingName"
        class="wb-title"
        (click)="startEditingName()"
        [matTooltip]="politica?.estado === 'BORRADOR' ? 'Clic para editar el nombre' : ''"
        [class.wb-title--editable]="politica?.estado === 'BORRADOR'"
        role="button"
        tabindex="0"
        (keydown.enter)="startEditingName()"
        (keydown.space)="startEditingName()"
        [attr.aria-label]="'Nombre de política: ' + (politica?.nombre ?? '')">
        <mat-icon class="wb-title-icon">account_tree</mat-icon>
        {{ politica?.nombre ?? 'Cargando...' }}
        <mat-icon *ngIf="politica?.estado === 'BORRADOR'" class="wb-title-edit-icon">edit</mat-icon>
      </span>
      <div *ngIf="editingName && politica?.estado === 'BORRADOR'" class="wb-title-edit-wrapper">
        <input
          type="text"
          [(ngModel)]="editingNameValue"
          class="wb-title-input"
          (keydown.escape)="cancelEditingName()"
          (keydown.enter)="saveEditingName()"
          (blur)="saveEditingName()"
          aria-label="Editar nombre de política"
          #titleInput />
        <mat-spinner *ngIf="isSavingName" diameter="16"></mat-spinner>
      </div>
    </div>

    <div class="wb-topbar-spacer"></div>

    <!-- Estado badge -->
    <span *ngIf="politica?.estado !== 'BORRADOR'" class="wb-readonly-badge">
      <mat-icon>lock</mat-icon>
      Solo lectura — {{ politica?.estado }}
    </span>

    <!-- Dirty indicator -->
    <span *ngIf="isDirty && politica?.estado === 'BORRADOR'" class="wb-dirty-dot" matTooltip="Cambios sin guardar"></span>

    <!-- Toggle vista -->
    <mat-button-toggle-group [(ngModel)]="vistaActual" aria-label="Vista del editor" class="wb-view-toggle">
      <mat-button-toggle value="grafo" matTooltip="Vista grafo" aria-label="Vista grafo">
        <mat-icon>account_tree</mat-icon>
      </mat-button-toggle>
      <mat-button-toggle value="swimlane" matTooltip="Vista swimlane" aria-label="Vista swimlane">
        <mat-icon>view_column</mat-icon>
      </mat-button-toggle>
    </mat-button-toggle-group>

    <!-- Zoom controls (sólo en vista grafo) -->
    <div class="wb-zoom-controls" *ngIf="vistaActual === 'grafo'">
      <button mat-icon-button (click)="zoomOut()" matTooltip="Alejar (–)" aria-label="Alejar zoom">
        <mat-icon>remove</mat-icon>
      </button>
      <span class="wb-zoom-label">{{ (zoom * 100).toFixed(0) }}%</span>
      <button mat-icon-button (click)="zoomIn()" matTooltip="Acercar (+)" aria-label="Acercar zoom">
        <mat-icon>add</mat-icon>
      </button>
      <button mat-icon-button (click)="resetZoom()" matTooltip="Ajustar vista (F)" aria-label="Ajustar vista completa">
        <mat-icon>fit_screen</mat-icon>
      </button>
    </div>

    <!-- Guardar -->
    <button mat-raised-button
      color="primary"
      *ngIf="politica?.estado === 'BORRADOR'"
      (click)="guardarCambios()"
      [disabled]="isSaving"
      class="wb-save-btn"
      aria-label="Guardar cambios del flujo">
      <mat-spinner *ngIf="isSaving" diameter="16" class="wb-btn-spinner"></mat-spinner>
      <mat-icon *ngIf="!isSaving">save</mat-icon>
      Guardar
    </button>
  </header>

  <!-- ╔══════════════ BODY ══════════════╗ -->
  <div class="wb-body" *ngIf="!isLoading; else loadingTpl">

    <!-- ── VISTA GRAFO ────────────────────────────────────── -->
    <ng-container *ngIf="vistaActual === 'grafo'">

      <!-- LEFT PALETTE -->
      <aside class="wb-palette" aria-label="Paleta de nodos" (click)="$event.stopPropagation()">

        <div class="wb-palette-group">
          <span class="wb-palette-group-label">Flujo básico</span>
          <div
            *ngFor="let item of paletteBasic"
            class="wb-palette-item"
            [class.wb-palette-item--disabled]="politica?.estado !== 'BORRADOR'"
            (click)="politica?.estado === 'BORRADOR' && addNodo(item)"
            role="button"
            tabindex="0"
            (keydown.enter)="politica?.estado === 'BORRADOR' && addNodo(item)"
            [attr.aria-label]="'Agregar nodo ' + item.label"
            [matTooltip]="politica?.estado !== 'BORRADOR' ? 'Solo lectura' : 'Agregar ' + item.label">
            <div class="wb-palette-icon" [ngClass]="'wb-palette-icon--' + (item.subtipoVisual ?? item.tipo).toLowerCase()">
              <svg width="28" height="28" viewBox="0 0 28 28">
                <ng-container [ngSwitch]="item.tipo">
                  <ng-container *ngSwitchCase="'INICIO'">
                    <circle cx="14" cy="14" r="12" fill="#16a34a"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'TAREA'">
                    <rect x="1" y="5" width="26" height="18" rx="4" fill="#1e3a8a"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'DECISION'">
                    <polygon points="14,2 26,14 14,26 2,14" fill="#d97706"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'FIN'">
                    <circle cx="14" cy="14" r="12" fill="none" stroke="#dc2626" stroke-width="2.5"/>
                    <circle cx="14" cy="14" r="7" fill="#dc2626"/>
                  </ng-container>
                </ng-container>
              </svg>
            </div>
            <span class="wb-palette-label">{{ item.label }}</span>
          </div>
        </div>

        <div class="wb-palette-divider"></div>

        <div class="wb-palette-group">
          <span class="wb-palette-group-label">Flujo avanzado</span>
          <div
            *ngFor="let item of paletteAdvanced"
            class="wb-palette-item"
            [class.wb-palette-item--disabled]="politica?.estado !== 'BORRADOR'"
            (click)="politica?.estado === 'BORRADOR' && addNodo(item)"
            role="button"
            tabindex="0"
            (keydown.enter)="politica?.estado === 'BORRADOR' && addNodo(item)"
            [attr.aria-label]="'Agregar nodo ' + item.label"
            [matTooltip]="politica?.estado !== 'BORRADOR' ? 'Solo lectura' : 'Agregar ' + item.label">
            <div class="wb-palette-icon" [ngClass]="'wb-palette-icon--' + (item.subtipoVisual ?? item.tipo).toLowerCase()">
              <svg width="28" height="28" viewBox="0 0 28 28">
                <rect x="1" y="5" width="26" height="18" rx="4" [attr.fill]="getAdvancedColor(item.subtipoVisual)"/>
                <ng-container [ngSwitch]="item.subtipoVisual">
                  <ng-container *ngSwitchCase="'APROBACION'">
                    <polyline points="8,14 12,18 20,10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'NOTIFICACION'">
                    <path d="M14 7 C11 7 9 9 9 11 L9 15 L7 17 L21 17 L19 15 L19 11 C19 9 17 7 14 7 Z" fill="white" opacity="0.9"/>
                    <circle cx="14" cy="19.5" r="1.5" fill="white"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'PARALELO'">
                    <line x1="11" y1="8" x2="11" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="17" y1="8" x2="17" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                  </ng-container>
                  <ng-container *ngSwitchCase="'SUBPROCESO'">
                    <line x1="14" y1="8" x2="14" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="8" y1="14" x2="20" y2="14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                  </ng-container>
                </ng-container>
              </svg>
            </div>
            <span class="wb-palette-label">{{ item.label }}</span>
          </div>
        </div>

        <div class="wb-palette-divider"></div>

        <!-- Acciones de conexión -->
        <div class="wb-palette-actions">
          <div *ngIf="modoConexion" class="wb-conexion-hint">
            <mat-icon class="wb-conexion-hint-icon">link</mat-icon>
            <span>Clic en el nodo destino</span>
            <button mat-stroked-button color="warn" (click)="cancelarConexion()" class="wb-cancel-conn-btn">
              Cancelar
            </button>
          </div>

          <button
            mat-stroked-button
            *ngIf="selectedNodo && !modoConexion && politica?.estado === 'BORRADOR'"
            (click)="iniciarConexion()"
            class="wb-palette-action-btn"
            aria-label="Conectar desde el nodo seleccionado">
            <mat-icon>link</mat-icon>
            Conectar
          </button>

          <button
            mat-stroked-button
            color="warn"
            *ngIf="selectedNodo && politica?.estado === 'BORRADOR'"
            (click)="deleteNodo(selectedNodo)"
            class="wb-palette-action-btn wb-palette-action-btn--warn"
            aria-label="Eliminar nodo seleccionado">
            <mat-icon>delete</mat-icon>
            Eliminar nodo
          </button>
        </div>
      </aside>

      <!-- CENTER CANVAS -->
      <div class="wb-canvas-container"
        #canvasContainer
        (wheel)="onWheel($event)"
        (mousedown)="onCanvasMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (mouseleave)="onMouseLeave()"
        [class.wb-canvas-container--panning]="isPanning"
        [class.wb-canvas-container--connecting]="modoConexion"
        (click)="$event.stopPropagation()">

        <svg
          #svgCanvas
          class="wb-canvas"
          [attr.width]="canvasWidth"
          [attr.height]="canvasHeight"
          [attr.viewBox]="svgViewBox"
          aria-label="Editor de flujo de trabajo"
          role="img">

          <defs>
            <!-- Grid punteado -->
            <pattern id="wb-grid" [attr.width]="gridSize" [attr.height]="gridSize" patternUnits="userSpaceOnUse"
              [attr.patternTransform]="'translate(' + (-panX % gridSize) + ',' + (-panY % gridSize) + ')'">
              <circle [attr.cx]="gridSize/2" [attr.cy]="gridSize/2" r="1" fill="#94a3b8" opacity="0.5"/>
            </pattern>

            <!-- Marcadores de flechas -->
            <marker id="wb-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
            </marker>
            <marker id="wb-arrow-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/>
            </marker>
            <marker id="wb-arrow-error" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626"/>
            </marker>

            <!-- Filtro: sombra para nodo seleccionado -->
            <filter id="wb-shadow-selected" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#3b82f6" flood-opacity="0.6"/>
            </filter>
            <filter id="wb-shadow-error" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#dc2626" flood-opacity="0.7"/>
            </filter>
            <filter id="wb-shadow-warning" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#d97706" flood-opacity="0.7"/>
            </filter>
          </defs>

          <!-- Fondo con grid -->
          <rect width="100%" height="100%" fill="url(#wb-grid)"/>

          <!-- Línea de previsualización de conexión -->
          <line
            *ngIf="modoConexion && previewLine"
            [attr.x1]="previewLine.x1" [attr.y1]="previewLine.y1"
            [attr.x2]="previewLine.x2" [attr.y2]="previewLine.y2"
            stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,4" opacity="0.8"/>

          <!-- Aristas -->
          <g *ngFor="let conn of conexiones">
            <path
              [attr.d]="conn.path"
              class="wb-edge"
              [class.wb-edge--selected]="selectedConexion === conn"
              [attr.marker-end]="selectedConexion === conn ? 'url(#wb-arrow-selected)' : 'url(#wb-arrow)'"
              (click)="selectConexion(conn, $event)"
              cursor="pointer"/>
            <!-- Área de click más amplia sobre la arista -->
            <path
              [attr.d]="conn.path"
              stroke="transparent" stroke-width="14" fill="none"
              (click)="selectConexion(conn, $event)"
              cursor="pointer"/>
            <text [attr.x]="conn.midX" [attr.y]="conn.midY - 8" class="wb-edge-label" text-anchor="middle">
              {{ conn.transicion.etiqueta || conn.transicion.condicion }}
            </text>
          </g>

          <!-- Nodos -->
          <g
            *ngFor="let nodo of nodos"
            [attr.transform]="getNodeTransform(nodo)"
            (mousedown)="onNodoMouseDown($event, nodo)"
            (click)="selectNodo(nodo, $event)"
            class="wb-node-group"
            [class.wb-node-group--dragging]="dragging?.id === nodo.id"
            cursor="pointer">

            <ng-container [ngSwitch]="nodo.tipo">

              <!-- INICIO -->
              <ng-container *ngSwitchCase="'INICIO'">
                <circle cx="35" cy="35" r="30"
                  [attr.fill]="selectedNodo?.id === nodo.id ? '#15803d' : '#16a34a'"
                  [attr.filter]="getNodeFilter(nodo)"
                  stroke="white" stroke-width="2.5"/>
                <circle cx="35" cy="35" r="22"
                  fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
                <text x="35" y="40" text-anchor="middle" fill="white" font-size="11" font-weight="700" letter-spacing="0.5">INICIO</text>
              </ng-container>

              <!-- TAREA / subtipos avanzados -->
              <ng-container *ngSwitchCase="'TAREA'">
                <rect x="0" y="0" width="140" height="64" rx="8"
                  [attr.fill]="getTareaFill(nodo, false)"
                  [attr.filter]="getNodeFilter(nodo)"
                  stroke="white" stroke-width="2"/>
                <!-- Franja superior de color -->
                <rect x="0" y="0" width="140" height="14" rx="8"
                  [attr.fill]="getTareaFill(nodo, true)"
                  clip-path="inset(0 0 0 0 round 8px 8px 0 0)"/>
                <rect x="0" y="7" width="140" height="7"
                  [attr.fill]="getTareaFill(nodo, true)"/>
                <!-- Icono subtipo -->
                <text x="12" y="40" text-anchor="middle"
                  fill="white" font-family="Material Icons" font-size="16" opacity="0.85">
                  {{ getTareaIconCode(nodo.subtipoVisual) }}
                </text>
                <!-- Nombre -->
                <text x="76" y="35" text-anchor="middle" fill="white" font-size="11" font-weight="700">
                  {{ nodo.nombre | slice:0:16 }}{{ nodo.nombre.length > 16 ? '…' : '' }}
                </text>
                <!-- Subtipo label -->
                <text x="76" y="52" text-anchor="middle" fill="white" font-size="9" opacity="0.75" letter-spacing="0.5">
                  {{ getTareaSubtipoLabel(nodo.subtipoVisual) }}
                </text>
              </ng-container>

              <!-- DECISION -->
              <ng-container *ngSwitchCase="'DECISION'">
                <polygon points="60,4 116,35 60,66 4,35"
                  [attr.fill]="selectedNodo?.id === nodo.id ? '#b45309' : '#d97706'"
                  [attr.filter]="getNodeFilter(nodo)"
                  stroke="white" stroke-width="2"/>
                <text x="60" y="31" text-anchor="middle" fill="#1e293b" font-size="9" font-weight="600" opacity="0.7">DECISIÓN</text>
                <text x="60" y="46" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="700">
                  {{ nodo.nombre | slice:0:10 }}{{ nodo.nombre.length > 10 ? '…' : '' }}
                </text>
              </ng-container>

              <!-- FIN -->
              <ng-container *ngSwitchCase="'FIN'">
                <circle cx="35" cy="35" r="30"
                  fill="none"
                  stroke="#dc2626" stroke-width="4"
                  [attr.filter]="getNodeFilter(nodo)"/>
                <circle cx="35" cy="35" r="20"
                  [attr.fill]="selectedNodo?.id === nodo.id ? '#b91c1c' : '#dc2626'"/>
                <text x="35" y="40" text-anchor="middle" fill="white" font-size="11" font-weight="700" letter-spacing="0.5">FIN</text>
              </ng-container>

            </ng-container>

            <!-- Indicador de error/warning sobre el nodo -->
            <g *ngIf="(nodo.validationErrors?.length ?? 0) > 0" [attr.transform]="getNodeBadgeTransform(nodo)">
              <circle r="9" fill="#dc2626" stroke="white" stroke-width="1.5"/>
              <text y="4" text-anchor="middle" fill="white" font-size="10" font-weight="700">!</text>
            </g>
            <g *ngIf="(nodo.validationErrors?.length ?? 0) === 0 && (nodo.validationWarnings?.length ?? 0) > 0"
              [attr.transform]="getNodeBadgeTransform(nodo)">
              <circle r="9" fill="#d97706" stroke="white" stroke-width="1.5"/>
              <text y="4" text-anchor="middle" fill="white" font-size="10" font-weight="700">!</text>
            </g>

          </g>
        </svg>

        <!-- Minimap -->
        <div class="wb-minimap" aria-hidden="true" aria-label="Minimapa del flujo">
          <svg class="wb-minimap-svg" viewBox="0 0 1400 900" width="180" height="110" preserveAspectRatio="xMidYMid meet">
            <!-- Fondo -->
            <rect width="1400" height="900" fill="#e2e8f0" rx="4"/>
            <!-- Nodos a escala -->
            <g *ngFor="let nodo of nodos">
              <rect
                [attr.x]="nodo.posicion.x"
                [attr.y]="nodo.posicion.y"
                [attr.width]="NODE_DIMS[nodo.tipo].w"
                [attr.height]="NODE_DIMS[nodo.tipo].h"
                rx="4"
                [attr.fill]="getMinimapColor(nodo)"
                opacity="0.85"/>
            </g>
            <!-- Viewport indicator -->
            <rect
              [attr.x]="minimapViewport.x"
              [attr.y]="minimapViewport.y"
              [attr.width]="minimapViewport.w"
              [attr.height]="minimapViewport.h"
              fill="none"
              stroke="#3b82f6"
              stroke-width="8"
              rx="4"
              opacity="0.7"/>
          </svg>
        </div>

      </div><!-- /canvas-container -->

      <!-- RIGHT INSPECTOR -->
      <aside class="wb-inspector" *ngIf="panelMode !== 'none'" (click)="$event.stopPropagation()" aria-label="Inspector de propiedades">

        <mat-tab-group class="wb-inspector-tabs" animationDuration="150ms">

          <!-- TAB: Nodo -->
          <mat-tab label="Nodo" *ngIf="panelMode === 'nodo' && selectedNodo">
            <div class="wb-inspector-content">
              <div class="wb-inspector-header">
                <div class="wb-inspector-type-badge" [style.background]="getNodeTypeBadgeColor(selectedNodo)">
                  {{ getTareaSubtipoLabel(selectedNodo.subtipoVisual) || selectedNodo.tipo }}
                </div>
                <span class="wb-inspector-id">ID: {{ selectedNodo.id | slice:0:8 }}…</span>
              </div>

              <!-- Formulario editable (BORRADOR) -->
              <form [formGroup]="nodoForm" class="wb-props-form" *ngIf="politica?.estado === 'BORRADOR'">
                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Nombre *</mat-label>
                  <input matInput formControlName="nombre" (blur)="autoSaveNodo()" />
                  <mat-error *ngIf="nodoForm.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Descripción</mat-label>
                  <textarea matInput formControlName="descripcion" rows="2" (blur)="autoSaveNodo()"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Rol responsable</mat-label>
                  <mat-select formControlName="responsableRolId" (selectionChange)="autoSaveNodo()">
                    <mat-option [value]="null">Sin rol asignado</mat-option>
                    <mat-option *ngFor="let r of roles" [value]="r.id">{{ r.nombre }}</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Tiempo límite</mat-label>
                  <input matInput type="number" formControlName="tiempoLimiteHoras" min="0" (blur)="autoSaveNodo()" />
                  <span matSuffix class="wb-suffix">horas</span>
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field"
                  *ngIf="selectedNodo.tipo === 'TAREA' || selectedNodo.tipo === 'INICIO'">
                  <mat-label>Formulario asociado</mat-label>
                  <mat-select formControlName="formularioId" (selectionChange)="autoSaveNodo()">
                    <mat-option [value]="null">Sin formulario</mat-option>
                    <mat-option *ngFor="let f of formularios" [value]="f.id">{{ f.nombre }}</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-raised-button color="primary"
                  class="wb-field wb-save-node-btn"
                  (click)="saveNodo()"
                  [disabled]="nodoForm.invalid || isSavingNodo"
                  aria-label="Guardar propiedades del nodo">
                  <mat-spinner *ngIf="isSavingNodo" diameter="16" class="wb-btn-spinner"></mat-spinner>
                  <mat-icon *ngIf="!isSavingNodo">check</mat-icon>
                  Guardar nodo
                </button>
              </form>

              <!-- Solo lectura -->
              <div *ngIf="politica?.estado !== 'BORRADOR'" class="wb-readonly-props">
                <div class="wb-prop-row"><span class="wb-prop-label">Nombre</span><span>{{ selectedNodo.nombre }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Tipo</span><span>{{ selectedNodo.tipo }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Descripción</span><span>{{ selectedNodo.descripcion || '—' }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Rol</span><span>{{ getRolNombre(selectedNodo.responsableRolId) }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Tiempo límite</span><span>{{ selectedNodo.tiempoLimiteHoras ? selectedNodo.tiempoLimiteHoras + ' h' : '—' }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Formulario</span><span>{{ getFormularioNombre(selectedNodo.formularioId) }}</span></div>
              </div>

              <!-- Errores de validación del nodo -->
              <div *ngIf="(selectedNodo.validationErrors?.length ?? 0) > 0" class="wb-node-errors">
                <div *ngFor="let e of selectedNodo.validationErrors" class="wb-node-error-item">
                  <mat-icon>error</mat-icon> {{ e }}
                </div>
              </div>
              <div *ngIf="(selectedNodo.validationWarnings?.length ?? 0) > 0" class="wb-node-warnings">
                <div *ngFor="let w of selectedNodo.validationWarnings" class="wb-node-warning-item">
                  <mat-icon>warning</mat-icon> {{ w }}
                </div>
              </div>

              <!-- Transiciones salientes -->
              <div class="wb-transitions-section">
                <span class="wb-transitions-title">
                  Transiciones salientes ({{ getTransicionesSalientes(selectedNodo).length }})
                </span>
                <div *ngIf="getTransicionesSalientes(selectedNodo).length === 0" class="wb-transitions-empty">
                  Sin conexiones salientes
                </div>
                <div *ngFor="let t of getTransicionesSalientes(selectedNodo)" class="wb-transition-item">
                  <mat-icon class="wb-transition-arrow">arrow_forward</mat-icon>
                  <span class="wb-transition-dest">{{ getNombreNodo(t.actividadDestinoId) }}</span>
                  <span *ngIf="t.etiqueta || t.condicion" class="wb-transition-cond">{{ t.etiqueta || t.condicion }}</span>
                </div>
              </div>

            </div>
          </mat-tab>

          <!-- TAB: Conexión -->
          <mat-tab label="Conexión" *ngIf="panelMode === 'conexion' && selectedConexion">
            <div class="wb-inspector-content">
              <div class="wb-conn-info">
                <div class="wb-conn-info-row">
                  <mat-icon>radio_button_checked</mat-icon>
                  <span>{{ selectedConexion.desde.nombre }}</span>
                </div>
                <mat-icon class="wb-conn-info-arrow">arrow_downward</mat-icon>
                <div class="wb-conn-info-row">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>{{ selectedConexion.hasta.nombre }}</span>
                </div>
              </div>

              <form [formGroup]="conexionForm" class="wb-props-form" *ngIf="politica?.estado === 'BORRADOR'">
                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Condición</mat-label>
                  <mat-select formControlName="condicion">
                    <mat-option value="SIEMPRE">Siempre</mat-option>
                    <mat-option value="APROBADO">Aprobado</mat-option>
                    <mat-option value="RECHAZADO">Rechazado</mat-option>
                    <mat-option value="custom">Personalizada…</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field"
                  *ngIf="conexionForm.get('condicion')?.value === 'custom'">
                  <mat-label>Condición personalizada</mat-label>
                  <input matInput formControlName="condicionCustom" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="wb-field">
                  <mat-label>Etiqueta</mat-label>
                  <input matInput formControlName="etiqueta" placeholder="Ej: Aprobado, Rechazado…" />
                </mat-form-field>

                <button mat-raised-button color="primary" class="wb-field" (click)="saveConexion()" [disabled]="isSavingNodo">
                  <mat-icon>check</mat-icon>
                  Guardar conexión
                </button>
                <button mat-stroked-button color="warn" class="wb-field" style="margin-top:8px" (click)="deleteConexion()">
                  <mat-icon>delete</mat-icon>
                  Eliminar conexión
                </button>
              </form>

              <div *ngIf="politica?.estado !== 'BORRADOR'" class="wb-readonly-props">
                <div class="wb-prop-row"><span class="wb-prop-label">Condición</span><span>{{ selectedConexion.transicion.condicion }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Etiqueta</span><span>{{ selectedConexion.transicion.etiqueta || '—' }}</span></div>
              </div>
            </div>
          </mat-tab>

          <!-- TAB: Info política -->
          <mat-tab label="Info">
            <div class="wb-inspector-content">
              <div *ngIf="politica" class="wb-readonly-props">
                <div class="wb-prop-row"><span class="wb-prop-label">Estado</span>
                  <span class="wb-estado-badge" [ngClass]="'wb-estado--' + politica.estado.toLowerCase()">{{ politica.estado }}</span>
                </div>
                <div class="wb-prop-row"><span class="wb-prop-label">Versión</span><span>v{{ politica.version }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Departamento</span><span>{{ politica.departamento || '—' }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Nodos</span><span>{{ nodos.length }}</span></div>
                <div class="wb-prop-row"><span class="wb-prop-label">Conexiones</span><span>{{ conexiones.length }}</span></div>
              </div>

              <!-- Errores globales -->
              <div *ngIf="validation.errors.length > 0" class="wb-validation-errors-panel">
                <span class="wb-validation-errors-title">Errores del flujo</span>
                <div *ngFor="let e of validation.errors" class="wb-node-error-item">
                  <mat-icon>error</mat-icon> {{ e.message }}
                </div>
              </div>
              <div *ngIf="validation.warnings.length > 0" class="wb-validation-warnings-panel">
                <span class="wb-validation-errors-title">Advertencias</span>
                <div *ngFor="let w of validation.warnings" class="wb-node-warning-item">
                  <mat-icon>warning</mat-icon> {{ w.message }}
                </div>
              </div>
              <div *ngIf="validation.isValid && validation.warnings.length === 0" class="wb-valid-banner">
                <mat-icon>check_circle</mat-icon>
                El flujo es válido
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      </aside>

    </ng-container><!-- /vista grafo -->

    <!-- ── VISTA SWIMLANE ────────────────────────────────── -->
    <ng-container *ngIf="vistaActual === 'swimlane'">
      <div class="wb-swimlane-wrapper">

        <div *ngIf="nodos.length === 0" class="wb-swimlane-empty">
          <mat-icon>view_column</mat-icon>
          <p>No hay actividades para mostrar en la vista swimlane.</p>
        </div>

        <div *ngIf="nodos.length > 0" class="wb-swimlane-table">
          <!-- Headers -->
          <div class="wb-swimlane-header-row">
            <div *ngFor="let lane of swimlaneLanes" class="wb-swimlane-header-cell">
              <mat-icon class="wb-lane-icon">{{ lane.rolId === null ? 'settings' : 'person' }}</mat-icon>
              <span>{{ lane.rolNombre }}</span>
            </div>
          </div>

          <!-- Rows -->
          <div class="wb-swimlane-body">
            <div *ngFor="let rowNodo of swimlaneRows" class="wb-swimlane-row">
              <div *ngFor="let lane of swimlaneLanes" class="wb-swimlane-cell">
                <ng-container *ngIf="getCellNode(rowNodo, lane) as nodo">
                  <div class="wb-swimlane-card"
                    [class.wb-swimlane-card--selected]="selectedNodo?.id === nodo.id"
                    (click)="selectNodoSwimlane(nodo)"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Nodo: ' + nodo.nombre">
                    <div class="wb-swimlane-card-header">
                      <span class="wb-swimlane-type-dot" [style.background]="getTipoColor(nodo.tipo)"></span>
                      <span class="wb-swimlane-node-name">{{ nodo.nombre }}</span>
                    </div>
                    <div class="wb-swimlane-chip" [style.background]="getTipoColor(nodo.tipo)">{{ nodo.tipo }}</div>
                    <div *ngIf="nodo.tiempoLimiteHoras" class="wb-swimlane-meta">
                      <mat-icon>timer</mat-icon> {{ nodo.tiempoLimiteHoras }}h
                    </div>
                    <div *ngFor="let t of nodo.transiciones" class="wb-swimlane-trans">
                      <mat-icon>arrow_forward</mat-icon>
                      {{ getNombreNodo(t.actividadDestinoId) }}
                      <span *ngIf="t.etiqueta || t.condicion" class="wb-swimlane-cond">({{ t.etiqueta || t.condicion }})</span>
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-container><!-- /vista swimlane -->

  </div><!-- /wb-body -->

  <!-- ╔══════════════ STATUS BAR ══════════════╗ -->
  <footer class="wb-statusbar" aria-label="Barra de estado" (click)="$event.stopPropagation()">
    <span class="wb-status-item">
      <mat-icon>schema</mat-icon>
      {{ nodos.length }} nodo{{ nodos.length !== 1 ? 's' : '' }}
    </span>
    <span class="wb-status-item">
      <mat-icon>arrow_forward</mat-icon>
      {{ conexiones.length }} conexión{{ conexiones.length !== 1 ? 'es' : '' }}
    </span>
    <span class="wb-status-divider"></span>
    <span class="wb-status-item"
      [class.wb-status-valid]="validation.isValid"
      [class.wb-status-invalid]="!validation.isValid"
      [matTooltip]="getValidationTooltip()">
      <mat-icon>{{ validation.isValid ? 'check_circle' : 'error' }}</mat-icon>
      {{ validation.isValid ? 'Flujo válido' : validation.errors.length + ' error(es)' }}
      <span *ngIf="validation.warnings.length > 0" class="wb-status-warnings">, {{ validation.warnings.length }} advertencia(s)</span>
    </span>
    <span class="wb-status-divider"></span>
    <span class="wb-status-item wb-status-save" [class.wb-status-saving]="isSaving">
      <mat-icon>{{ isSaving ? 'sync' : isDirty ? 'edit' : 'cloud_done' }}</mat-icon>
      {{ saveStatusText }}
    </span>
    <span class="wb-status-divider"></span>
    <span class="wb-status-item" *ngIf="vistaActual === 'grafo'">
      <mat-icon>zoom_in</mat-icon>
      {{ (zoom * 100).toFixed(0) }}%
    </span>
  </footer>

</div><!-- /wb-shell -->

<ng-template #loadingTpl>
  <div class="wb-loading">
    <mat-spinner diameter="48"></mat-spinner>
    <span>Cargando editor…</span>
  </div>
</ng-template>
  `,
  styles: [`
    /* ════════════════════════════════════════════════════════
       Tokens
    ════════════════════════════════════════════════════════ */
    :host {
      --wb-bg:          #f0f2f5;
      --wb-canvas-bg:   #e8ecf0;
      --wb-panel-bg:    #ffffff;
      --wb-border:      #e2e8f0;
      --wb-primary:     #1e3a8a;
      --wb-accent:      #3b82f6;
      --wb-success:     #16a34a;
      --wb-warning:     #d97706;
      --wb-error:       #dc2626;
      --wb-text:        #1e293b;
      --wb-text-muted:  #64748b;
      --wb-topbar-h:    56px;
      --wb-statusbar-h: 32px;
      --wb-palette-w:   200px;
      --wb-inspector-w: 280px;
      display: block;
      height: 100vh;
    }

    /* ── Shell ── */
    .wb-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--wb-bg);
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      color: var(--wb-text);
    }

    /* ── Top Bar ── */
    .wb-topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: var(--wb-topbar-h);
      background: var(--wb-panel-bg);
      border-bottom: 1px solid var(--wb-border);
      flex-shrink: 0;
      z-index: 20;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .wb-back-btn { color: var(--wb-text-muted); }
    .wb-logo-divider {
      width: 1px;
      height: 24px;
      background: var(--wb-border);
      margin: 0 4px;
    }
    .wb-title-area {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }
    .wb-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--wb-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
      border-radius: 6px;
      padding: 4px 8px;
      transition: background 0.15s;
    }
    .wb-title--editable {
      cursor: pointer;
    }
    .wb-title--editable:hover {
      background: rgba(0,0,0,0.04);
    }
    .wb-title-icon { font-size: 18px; width: 18px; height: 18px; color: var(--wb-accent); }
    .wb-title-edit-icon { font-size: 14px; width: 14px; height: 14px; color: var(--wb-text-muted); opacity: 0.6; }
    .wb-title-edit-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wb-title-input {
      padding: 6px 10px;
      border: 2px solid var(--wb-accent);
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      color: var(--wb-text);
      background: white;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .wb-title-input:focus {
      border-color: var(--wb-primary);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }
    .wb-topbar-spacer { flex: 1; }
    .wb-readonly-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fff7ed;
      color: #c2410c;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #fed7aa;
      white-space: nowrap;
    }
    .wb-dirty-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--wb-warning);
      flex-shrink: 0;
    }
    .wb-view-toggle { height: 36px; }
    .wb-zoom-controls {
      display: flex;
      align-items: center;
      gap: 0;
      background: var(--wb-bg);
      border-radius: 8px;
      padding: 0 4px;
      border: 1px solid var(--wb-border);
    }
    .wb-zoom-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--wb-text-muted);
      min-width: 40px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .wb-save-btn { flex-shrink: 0; }
    .wb-btn-spinner {
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }

    /* ── Body ── */
    .wb-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── Left Palette ── */
    .wb-palette {
      width: var(--wb-palette-w);
      min-width: var(--wb-palette-w);
      background: var(--wb-panel-bg);
      border-right: 1px solid var(--wb-border);
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      padding: 12px 8px;
    }
    .wb-palette-group { display: flex; flex-direction: column; gap: 2px; }
    .wb-palette-group-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--wb-text-muted);
      padding: 4px 8px;
    }
    .wb-palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s, transform 0.1s;
      user-select: none;
    }
    .wb-palette-item:hover {
      background: rgba(59,130,246,0.06);
      transform: translateX(2px);
    }
    .wb-palette-item:active { transform: translateX(1px) scale(0.98); }
    .wb-palette-item--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .wb-palette-item--disabled:hover { transform: none; background: transparent; }
    .wb-palette-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .wb-palette-label { font-size: 13px; font-weight: 500; color: var(--wb-text); }
    .wb-palette-divider { height: 1px; background: var(--wb-border); margin: 8px 0; }
    .wb-palette-actions { display: flex; flex-direction: column; gap: 6px; padding: 4px 2px; }
    .wb-palette-action-btn { width: 100%; }
    .wb-conexion-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 8px;
      font-size: 12px;
      text-align: center;
      color: var(--wb-primary);
    }
    .wb-conexion-hint-icon { color: var(--wb-accent); }
    .wb-cancel-conn-btn { width: 100%; margin-top: 4px; }

    /* ── Canvas ── */
    .wb-canvas-container {
      flex: 1;
      overflow: hidden;
      background: var(--wb-canvas-bg);
      position: relative;
      cursor: default;
    }
    .wb-canvas-container--panning { cursor: grabbing !important; }
    .wb-canvas-container--connecting { cursor: crosshair !important; }
    .wb-canvas {
      display: block;
      user-select: none;
    }
    /* Nodos */
    .wb-node-group { user-select: none; transition: filter 0.15s; }
    .wb-node-group--dragging { cursor: grabbing; }
    .wb-node-group:hover:not(.wb-node-group--dragging) {
      filter: brightness(1.06);
    }
    /* Aristas */
    .wb-edge {
      stroke: #64748b;
      stroke-width: 2;
      fill: none;
      transition: stroke 0.15s;
    }
    .wb-edge--selected {
      stroke: #3b82f6 !important;
      stroke-width: 2.5 !important;
    }
    .wb-edge-label { font-size: 11px; fill: var(--wb-text-muted); pointer-events: none; }

    /* ── Minimap ── */
    .wb-minimap {
      position: absolute;
      bottom: 16px;
      right: 16px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--wb-border);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      background: #e2e8f0;
      z-index: 10;
    }
    .wb-minimap-svg { display: block; }

    /* ── Right Inspector ── */
    .wb-inspector {
      width: var(--wb-inspector-w);
      min-width: var(--wb-inspector-w);
      background: var(--wb-panel-bg);
      border-left: 1px solid var(--wb-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .wb-inspector-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .wb-inspector-tabs ::ng-deep .mat-mdc-tab-body-wrapper {
      flex: 1;
      overflow: auto;
    }
    .wb-inspector-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .wb-inspector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .wb-inspector-type-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .wb-inspector-id { font-size: 10px; color: var(--wb-text-muted); font-family: monospace; }
    .wb-props-form { display: flex; flex-direction: column; gap: 4px; }
    .wb-field { width: 100%; }
    .wb-suffix { font-size: 12px; color: var(--wb-text-muted); }
    .wb-save-node-btn { margin-top: 4px; }
    .wb-readonly-props { display: flex; flex-direction: column; gap: 6px; }
    .wb-prop-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      padding: 4px 0;
      border-bottom: 1px solid var(--wb-border);
    }
    .wb-prop-label { font-weight: 600; color: var(--wb-text-muted); white-space: nowrap; }
    /* Errores/Warnings de nodo */
    .wb-node-errors, .wb-node-warnings { display: flex; flex-direction: column; gap: 4px; }
    .wb-node-error-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 12px;
      color: var(--wb-error);
      background: #fef2f2;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .wb-node-error-item mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
    .wb-node-warning-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 12px;
      color: #92400e;
      background: #fffbeb;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .wb-node-warning-item mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
    /* Transiciones en inspector */
    .wb-transitions-section { display: flex; flex-direction: column; gap: 4px; }
    .wb-transitions-title { font-size: 11px; font-weight: 700; color: var(--wb-text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
    .wb-transitions-empty { font-size: 12px; color: var(--wb-text-muted); font-style: italic; padding: 4px 0; }
    .wb-transition-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 6px;
      border-radius: 6px;
      background: var(--wb-bg);
    }
    .wb-transition-arrow { font-size: 14px; width: 14px; height: 14px; color: var(--wb-accent); }
    .wb-transition-dest { font-weight: 500; flex: 1; }
    .wb-transition-cond { font-size: 11px; color: var(--wb-text-muted); font-style: italic; }
    /* Conexión inspector */
    .wb-conn-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px; background: var(--wb-bg); border-radius: 8px; margin-bottom: 8px; }
    .wb-conn-info-row { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .wb-conn-info-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--wb-accent); }
    .wb-conn-info-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--wb-text-muted); margin-left: 4px; }
    /* Estado badges */
    .wb-estado-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; }
    .wb-estado--borrador { background: #dbeafe; color: #1d4ed8; }
    .wb-estado--activa { background: #dcfce7; color: #15803d; }
    .wb-estado--inactiva { background: #f1f5f9; color: #64748b; }
    .wb-estado--archivada { background: #fef3c7; color: #92400e; }
    /* Validación global en inspector */
    .wb-validation-errors-panel, .wb-validation-warnings-panel { display: flex; flex-direction: column; gap: 4px; }
    .wb-validation-errors-title { font-size: 11px; font-weight: 700; color: var(--wb-text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
    .wb-valid-banner { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--wb-success); background: #f0fdf4; border-radius: 8px; padding: 8px 12px; }
    .wb-valid-banner mat-icon { color: var(--wb-success); }

    /* ── Swimlane ── */
    .wb-swimlane-wrapper { flex: 1; overflow: auto; padding: 16px; background: var(--wb-bg); }
    .wb-swimlane-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; color: var(--wb-text-muted); gap: 12px; }
    .wb-swimlane-empty mat-icon { font-size: 52px; width: 52px; height: 52px; }
    .wb-swimlane-table { min-width: max-content; }
    .wb-swimlane-header-row { display: flex; gap: 2px; margin-bottom: 2px; }
    .wb-swimlane-header-cell {
      flex: 0 0 210px;
      width: 210px;
      background: var(--wb-primary);
      color: white;
      padding: 10px 14px;
      font-weight: 600;
      font-size: 13px;
      border-radius: 6px 6px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wb-lane-icon { font-size: 16px; width: 16px; height: 16px; }
    .wb-swimlane-body { display: flex; flex-direction: column; gap: 2px; }
    .wb-swimlane-row { display: flex; gap: 2px; }
    .wb-swimlane-cell {
      flex: 0 0 210px;
      width: 210px;
      min-height: 80px;
      background: rgba(255,255,255,0.6);
      border: 1px solid var(--wb-border);
      border-radius: 0 0 4px 4px;
      padding: 8px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .wb-swimlane-card {
      width: 100%;
      background: white;
      border: 1px solid var(--wb-border);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: box-shadow 0.15s;
    }
    .wb-swimlane-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .wb-swimlane-card--selected { box-shadow: 0 0 0 2px var(--wb-accent); border-color: var(--wb-accent); }
    .wb-swimlane-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .wb-swimlane-type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .wb-swimlane-node-name { font-weight: 600; font-size: 13px; flex: 1; word-break: break-word; }
    .wb-swimlane-chip {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .wb-swimlane-meta { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--wb-text-muted); margin-top: 4px; }
    .wb-swimlane-meta mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .wb-swimlane-trans { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--wb-text-muted); margin-top: 3px; }
    .wb-swimlane-trans mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .wb-swimlane-cond { font-style: italic; opacity: 0.7; }

    /* ── Status Bar ── */
    .wb-statusbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: var(--wb-statusbar-h);
      padding: 0 12px;
      background: var(--wb-primary);
      border-top: 1px solid rgba(0,0,0,0.2);
      flex-shrink: 0;
    }
    .wb-status-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: rgba(255,255,255,0.75);
      white-space: nowrap;
    }
    .wb-status-item mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .wb-status-divider { width: 1px; height: 16px; background: rgba(255,255,255,0.2); margin: 0 4px; }
    .wb-status-valid mat-icon { color: #4ade80; }
    .wb-status-valid { color: #4ade80; }
    .wb-status-invalid mat-icon { color: #fca5a5; }
    .wb-status-invalid { color: #fca5a5; }
    .wb-status-warnings { color: #fcd34d; }
    .wb-status-save { color: rgba(255,255,255,0.75); }
    .wb-status-saving mat-icon { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* ── Loading ── */
    .wb-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      color: var(--wb-text-muted);
      font-size: 14px;
    }

    /* ── Responsive (≤768px oculta paneles laterales) ── */
    @media (max-width: 768px) {
      .wb-palette { display: none; }
      .wb-inspector { display: none; }
      :host { --wb-palette-w: 0px; --wb-inspector-w: 0px; }
    }
  `]
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('svgCanvas')       svgCanvas!: ElementRef<SVGElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  // ── Datos ────────────────────────────────────────────────
  politicaId: string | null = null;
  politica: Politica | null = null;
  nodos: NodoSVG[] = [];
  conexiones: ConexionUI[] = [];
  formularios: FormularioResponse[] = [];
  roles: Role[] = [];

  // ── Estado UI ────────────────────────────────────────────
  isLoading   = false;
  isSaving    = false;
  isSavingNodo = false;
  isSavingName = false;
  isDirty      = false;
  lastSaved: Date | null = null;

  // ── Viewport (zoom/pan) ──────────────────────────────────
  zoom      = 1.0;
  panX      = 0;
  panY      = 0;
  canvasWidth  = 1400;
  canvasHeight = 900;
  readonly gridSize = 24;

  // ── Drag de nodo ─────────────────────────────────────────
  dragging: NodoSVG | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  // ── Pan del canvas ───────────────────────────────────────
  isPanning    = false;
  panStartX    = 0;
  panStartY    = 0;
  panStartPanX = 0;
  panStartPanY = 0;

  // ── Selección ────────────────────────────────────────────
  selectedNodo: NodoSVG | null = null;
  selectedConexion: ConexionUI | null = null;
  panelMode: PanelMode = 'none';

  // ── Modo conexión ─────────────────────────────────────────
  modoConexion = false;
  previewLine: { x1: number; y1: number; x2: number; y2: number } | null = null;

  // ── Formularios reactivos ─────────────────────────────────
  nodoForm: FormGroup;
  conexionForm: FormGroup;

  // ── Vista swimlane ────────────────────────────────────────
  vistaActual: VistaEditor = 'grafo';
  swimlaneLanes: SwimlaneLane[] = [];
  swimlaneRows: NodoSVG[] = [];

  // ── Edición nombre inline ─────────────────────────────────
  editingName       = false;
  editingNameValue  = '';

  // ── Validación ────────────────────────────────────────────
  validation: ValidationResult = { isValid: true, errors: [], warnings: [] };

  // ── Auto-save ─────────────────────────────────────────────
  private autoSaveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  // ── Expose const para template ────────────────────────────
  readonly NODE_DIMS = NODE_DIMS;
  readonly paletteBasic    = PALETTE_ITEMS.filter(i => i.group === 'basic');
  readonly paletteAdvanced = PALETTE_ITEMS.filter(i => i.group === 'advanced');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private politicaService: PoliticaService,
    private actividadService: ActividadService,
    private formularioService: FormularioService,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.nodoForm = this.fb.group({
      nombre:            ['', Validators.required],
      descripcion:       [''],
      responsableRolId:  [null],
      tiempoLimiteHoras: [null],
      formularioId:      [null]
    });

    this.conexionForm = this.fb.group({
      condicion:       ['SIEMPRE'],
      condicionCustom: [''],
      etiqueta:        ['']
    });
  }

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (!this.politicaId) {
      this.router.navigate(['/policies']);
      return;
    }

    // Auto-save con debounce de 2 segundos
    this.autoSaveSubject.pipe(
      debounceTime(2000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.performAutoSave());

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ────────────────────────────────────────

  private loadData(): void {
    if (!this.politicaId) return;
    this.isLoading = true;

    this.formularioService.getAll({ estado: 'ACTIVO', size: 100 }).subscribe({
      next: (page) => { this.formularios = page.content; },
      error: () => { console.error('Error al cargar formularios'); }
    });

    this.roleService.getAll().subscribe({
      next: (roles) => { this.roles = roles; },
      error: () => { console.error('Error al cargar roles'); }
    });

    this.politicaService.getById(this.politicaId).subscribe({
      next: (p) => {
        this.politica = p;
        this.loadNodos();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al cargar política:', err);
        this.snackBar.open(err?.error?.message || 'Error al cargar la política', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/policies']);
      }
    });
  }

  private loadNodos(): void {
    if (!this.politicaId) return;
    this.actividadService.getByPolitica(this.politicaId).subscribe({
      next: (acts) => {
        this.nodos = acts as NodoSVG[];
        this.buildConexiones();
        this.runValidation();
        this.buildSwimlane();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al cargar actividades:', err);
        this.snackBar.open('Error al cargar las actividades del flujo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ── Conexiones ────────────────────────────────────────────

  private buildConexiones(): void {
    this.conexiones = [];
    for (const nodo of this.nodos) {
      for (const t of nodo.transiciones) {
        const destino = this.nodos.find(n => n.id === t.actividadDestinoId);
        if (!destino) continue;
        this.conexiones.push(this.buildConexionUI(nodo, destino, t));
      }
    }
  }

  private buildConexionUI(desde: NodoSVG, hasta: NodoSVG, t: Transicion): ConexionUI {
    const { cx: x1, cy: y1 } = this.getNodoCenter(desde);
    const { cx: x2, cy: y2 } = this.getNodoCenter(hasta);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const path = `M ${x1} ${y1} C ${x1 + dx * 0.4} ${y1}, ${x2 - dx * 0.4} ${y2}, ${x2} ${y2}`;
    return { desde, hasta, transicion: { ...t }, path, midX, midY };
  }

  private getNodoCenter(nodo: NodoSVG): { cx: number; cy: number } {
    const o = NODE_DIMS[nodo.tipo] ?? { w: 100, h: 64 };
    return {
      cx: nodo.posicion.x + o.w / 2,
      cy: nodo.posicion.y + o.h / 2
    };
  }

  // ── Validación del flujo ──────────────────────────────────

  private runValidation(): void {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Limpiar marcas anteriores
    for (const n of this.nodos) {
      n.validationErrors   = [];
      n.validationWarnings = [];
    }

    const inicios = this.nodos.filter(n => n.tipo === 'INICIO');
    const fines   = this.nodos.filter(n => n.tipo === 'FIN');

    if (inicios.length === 0) {
      errors.push({ type: 'NO_START', message: 'El flujo necesita al menos un nodo INICIO' });
    }
    if (inicios.length > 1) {
      errors.push({ type: 'DUPLICATE_START', message: 'Solo puede haber un nodo INICIO' });
      for (const n of inicios) {
        n.validationErrors!.push('Hay más de un nodo INICIO en el flujo');
      }
    }
    if (fines.length === 0) {
      errors.push({ type: 'NO_END', message: 'El flujo necesita al menos un nodo FIN' });
    }

    // Nodos huérfanos y sin salida
    for (const nodo of this.nodos) {
      if (nodo.tipo === 'INICIO') continue;
      const tieneEntrada = this.conexiones.some(c => c.hasta.id === nodo.id);
      const tieneSalida  = nodo.transiciones.length > 0;

      if (!tieneEntrada) {
        const msg = `"${nodo.nombre}" no tiene conexiones entrantes`;
        errors.push({ type: 'ORPHAN_NODE', message: msg, nodeId: nodo.id });
        nodo.validationErrors!.push(msg);
      }
      if (!tieneSalida && nodo.tipo !== 'FIN') {
        const msg = `"${nodo.nombre}" no tiene conexiones salientes`;
        warnings.push({ message: msg, nodeId: nodo.id });
        nodo.validationWarnings!.push(msg);
      }
    }

    this.validation = { isValid: errors.length === 0, errors, warnings };
  }

  // ── Swimlane ──────────────────────────────────────────────

  private buildSwimlane(): void {
    const rolIds = new Set<string | null>();
    for (const n of this.nodos) {
      if (!n.responsableRolId || ['INICIO', 'FIN', 'DECISION'].includes(n.tipo)) {
        rolIds.add(null);
      } else {
        rolIds.add(n.responsableRolId);
      }
    }

    const lanes: SwimlaneLane[] = [];
    if (rolIds.has(null)) {
      lanes.push({
        rolId: null,
        rolNombre: 'Sistema',
        actividades: this.nodos.filter(
          n => !n.responsableRolId || ['INICIO', 'FIN', 'DECISION'].includes(n.tipo)
        )
      });
    }

    const rolIdsArr = [...rolIds].filter((id): id is string => id !== null);
    for (const rolId of rolIdsArr) {
      const actsDelRol = this.nodos.filter(
        n => n.responsableRolId === rolId && !['INICIO', 'FIN', 'DECISION'].includes(n.tipo)
      );
      const rolName = this.roles.find(r => r.id === rolId)?.nombre ?? rolId;
      lanes.push({ rolId, rolNombre: rolName, actividades: actsDelRol });
    }

    this.swimlaneLanes = lanes;
    this.swimlaneRows  = [...this.nodos].sort((a, b) => a.posicion.y - b.posicion.y);
  }

  getCellNode(rowNodo: NodoSVG, lane: SwimlaneLane): NodoSVG | null {
    return lane.actividades.includes(rowNodo) ? rowNodo : null;
  }

  selectNodoSwimlane(nodo: NodoSVG): void {
    this.selectedNodo     = nodo;
    this.selectedConexion = null;
    this.panelMode        = 'nodo';
    this.populateNodoForm(nodo);
  }

  // ── Zoom / Pan ────────────────────────────────────────────

  get svgViewBox(): string {
    return `${this.panX} ${this.panY} ${this.canvasWidth / this.zoom} ${this.canvasHeight / this.zoom}`;
  }

  get minimapViewport(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.panX,
      y: this.panY,
      w: this.canvasWidth / this.zoom,
      h: this.canvasHeight / this.zoom
    };
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta   = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.25, this.zoom * delta));

    const container  = this.canvasContainer.nativeElement;
    const rect       = container.getBoundingClientRect();
    const mouseXInSvg = (event.clientX - rect.left) / this.zoom + this.panX;
    const mouseYInSvg = (event.clientY - rect.top)  / this.zoom + this.panY;

    this.zoom = newZoom;
    this.panX = mouseXInSvg - (event.clientX - rect.left) / this.zoom;
    this.panY = mouseYInSvg - (event.clientY - rect.top)  / this.zoom;
    this.clampPan();
  }

  zoomIn():    void { this.zoom = Math.min(3,    this.zoom * 1.2); }
  zoomOut():   void { this.zoom = Math.max(0.25, this.zoom / 1.2); }
  resetZoom(): void { this.zoom = 1; this.panX = 0; this.panY = 0; }

  private clampPan(): void {
    const maxPanX = Math.max(0, this.canvasWidth  - this.canvasWidth  / this.zoom);
    const maxPanY = Math.max(0, this.canvasHeight - this.canvasHeight / this.zoom);
    this.panX = Math.max(0, Math.min(this.panX, maxPanX));
    this.panY = Math.max(0, Math.min(this.panY, maxPanY));
  }

  // ── Mouse events ──────────────────────────────────────────

  onCanvasMouseDown(event: MouseEvent): void {
    // Click medio o espacio+drag → pan (lo hacemos con botón 1 en área vacía)
    if (event.button === 1 || event.button === 0) {
      // Si es sobre el SVG background (no sobre nodos), iniciamos pan
      const target = event.target as Element;
      const isSvgBackground = target.tagName === 'svg' || target.tagName === 'rect' || target.tagName === 'circle';
      if (isSvgBackground && !this.modoConexion) {
        this.isPanning    = true;
        this.panStartX    = event.clientX;
        this.panStartY    = event.clientY;
        this.panStartPanX = this.panX;
        this.panStartPanY = this.panY;
        event.preventDefault();
      }
    }
  }

  onNodoMouseDown(event: MouseEvent, nodo: NodoSVG): void {
    if (this.politica?.estado !== 'BORRADOR') return;
    if (this.modoConexion) return;
    event.stopPropagation();

    const svgRect = this.svgCanvas.nativeElement.getBoundingClientRect();
    const svgX = (event.clientX - svgRect.left) / this.zoom + this.panX;
    const svgY = (event.clientY - svgRect.top)  / this.zoom + this.panY;

    this.dragging    = nodo;
    this.dragOffsetX = svgX - nodo.posicion.x;
    this.dragOffsetY = svgY - nodo.posicion.y;
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const dx = (event.clientX - this.panStartX) / this.zoom;
      const dy = (event.clientY - this.panStartY) / this.zoom;
      this.panX = this.panStartPanX - dx;
      this.panY = this.panStartPanY - dy;
      this.clampPan();
      return;
    }

    const svgRect = this.svgCanvas.nativeElement.getBoundingClientRect();
    const svgX = (event.clientX - svgRect.left) / this.zoom + this.panX;
    const svgY = (event.clientY - svgRect.top)  / this.zoom + this.panY;

    if (this.dragging) {
      const rawX = svgX - this.dragOffsetX;
      const rawY = svgY - this.dragOffsetY;
      this.dragging.posicion = {
        x: Math.max(0, this.snap(rawX)),
        y: Math.max(0, this.snap(rawY))
      };
      this.buildConexiones();
      this.isDirty = true;
      this.autoSaveSubject.next();
      return;
    }

    if (this.modoConexion && this.selectedNodo) {
      const { cx, cy } = this.getNodoCenter(this.selectedNodo);
      this.previewLine = { x1: cx, y1: cy, x2: svgX, y2: svgY };
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.dragging) {
      this.dragging = null;
    }
    if (this.isPanning) {
      this.isPanning = false;
    }
  }

  onMouseLeave(): void {
    this.dragging  = null;
    this.isPanning = false;
  }

  onCanvasBackgroundClick(event: MouseEvent): void {
    // Deseleccionar al hacer clic en fondo
    if ((event.target as Element).closest('.wb-palette') ||
        (event.target as Element).closest('.wb-inspector') ||
        (event.target as Element).closest('.wb-topbar') ||
        (event.target as Element).closest('.wb-statusbar')) {
      return;
    }
    this.selectedNodo     = null;
    this.selectedConexion = null;
    this.panelMode        = 'none';
  }

  // ── Snap a grid ───────────────────────────────────────────

  snap(value: number): number {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  // ── Selección ─────────────────────────────────────────────

  selectNodo(nodo: NodoSVG, event: MouseEvent): void {
    event.stopPropagation();

    if (this.modoConexion && this.selectedNodo && this.selectedNodo.id !== nodo.id) {
      this.crearConexion(nodo);
      return;
    }

    this.selectedNodo     = nodo;
    this.selectedConexion = null;
    this.panelMode        = 'nodo';
    this.populateNodoForm(nodo);
  }

  selectConexion(conn: ConexionUI, event: MouseEvent): void {
    event.stopPropagation();
    if (this.modoConexion) return;

    this.selectedConexion = conn;
    this.selectedNodo     = null;
    this.panelMode        = 'conexion';

    const condicion = conn.transicion.condicion;
    const isCustom  = !['SIEMPRE', 'APROBADO', 'RECHAZADO'].includes(condicion);
    this.conexionForm.patchValue({
      condicion:       isCustom ? 'custom' : condicion,
      condicionCustom: isCustom ? condicion : '',
      etiqueta:        conn.transicion.etiqueta
    });
  }

  private populateNodoForm(nodo: NodoSVG): void {
    this.nodoForm.patchValue({
      nombre:            nodo.nombre,
      descripcion:       nodo.descripcion,
      responsableRolId:  nodo.responsableRolId ?? null,
      tiempoLimiteHoras: nodo.tiempoLimiteHoras ?? null,
      formularioId:      nodo.formularioId ?? null
    });
  }

  // ── Modo conexión ─────────────────────────────────────────

  iniciarConexion(): void {
    this.modoConexion = true;
  }

  cancelarConexion(): void {
    this.modoConexion = false;
    this.previewLine  = null;
  }

  private crearConexion(destino: NodoSVG): void {
    const origen = this.selectedNodo!;
    this.modoConexion = false;
    this.previewLine  = null;

    const existe = origen.transiciones.some(t => t.actividadDestinoId === destino.id);
    if (existe) {
      this.snackBar.open('Ya existe una conexión entre esos nodos', 'Cerrar', { duration: 3000 });
      return;
    }

    const nuevaTransicion: Transicion = {
      actividadDestinoId: destino.id,
      condicion: 'SIEMPRE',
      etiqueta: ''
    };
    origen.transiciones = [...origen.transiciones, nuevaTransicion];
    this.buildConexiones();
    this.runValidation();
    this.persistirTransiciones(origen);
  }

  saveConexion(): void {
    if (!this.selectedConexion) return;
    const val       = this.conexionForm.value;
    const condicion = val.condicion === 'custom' ? val.condicionCustom : val.condicion;
    const origen    = this.selectedConexion.desde;
    const destinoId = this.selectedConexion.transicion.actividadDestinoId;

    origen.transiciones = origen.transiciones.map(t =>
      t.actividadDestinoId === destinoId
        ? { ...t, condicion, etiqueta: val.etiqueta }
        : t
    );
    this.buildConexiones();
    this.persistirTransiciones(origen);
  }

  deleteConexion(): void {
    if (!this.selectedConexion) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar conexión',
        message: `¿Eliminás la conexión de "${this.selectedConexion.desde.nombre}" a "${this.selectedConexion.hasta.nombre}"?`
      },
      width: '400px'
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed || !this.selectedConexion) return;
      const origen    = this.selectedConexion.desde;
      const destinoId = this.selectedConexion.transicion.actividadDestinoId;
      origen.transiciones = origen.transiciones.filter(t => t.actividadDestinoId !== destinoId);
      this.selectedConexion = null;
      this.panelMode = 'none';
      this.buildConexiones();
      this.runValidation();
      this.persistirTransiciones(origen);
    });
  }

  private persistirTransiciones(nodo: NodoSVG): void {
    const data: UpdateActividadRequest = { transiciones: nodo.transiciones };
    this.actividadService.update(nodo.id, data).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error al guardar conexión:', err);
        this.snackBar.open(err?.error?.message || 'Error al guardar la conexión', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ── Agregar nodo ──────────────────────────────────────────

  addNodo(item: PaletteItem): void {
    if (!this.politicaId) return;

    // Posición inicial con snap al grid, centrada en el viewport visible
    const baseX = this.snap(this.panX + (this.canvasWidth / this.zoom) / 2 - 60 + Math.floor(Math.random() * 120) - 60);
    const baseY = this.snap(this.panY + (this.canvasHeight / this.zoom) / 2 - 30 + Math.floor(Math.random() * 80) - 40);

    const data: CreateActividadRequest = {
      politicaId:  this.politicaId,
      nombre:      item.defaultNombre,
      descripcion: item.defaultDescripcion,
      tipo:        item.tipo,
      posicion:    { x: Math.max(0, baseX), y: Math.max(0, baseY) },
      transiciones: []
    };

    this.actividadService.create(data).subscribe({
      next: (act) => {
        const newNodo: NodoSVG = { ...(act as NodoSVG), subtipoVisual: item.subtipoVisual };
        this.nodos = [...this.nodos, newNodo];
        this.buildConexiones();
        this.runValidation();
        this.buildSwimlane();
        this.snackBar.open(`Nodo "${item.label}" agregado`, 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        console.error('Error al crear nodo:', err);
        this.snackBar.open(err?.error?.message || 'Error al crear el nodo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ── Guardar nodo ──────────────────────────────────────────

  saveNodo(): void {
    if (!this.selectedNodo || this.nodoForm.invalid) return;
    this.isSavingNodo = true;
    const val = this.nodoForm.value;

    const data: UpdateActividadRequest = {
      nombre:            val.nombre,
      descripcion:       val.descripcion,
      responsableRolId:  val.responsableRolId || null,
      tiempoLimiteHoras: val.tiempoLimiteHoras || null,
      formularioId:      val.formularioId || null
    };

    this.actividadService.update(this.selectedNodo.id, data).subscribe({
      next: (updated) => {
        const idx = this.nodos.findIndex(n => n.id === this.selectedNodo!.id);
        if (idx !== -1) {
          // Preservar subtipoVisual local (no viene del backend)
          const subtipo = this.nodos[idx].subtipoVisual;
          this.nodos[idx] = { ...(updated as NodoSVG), subtipoVisual: subtipo };
          this.selectedNodo = this.nodos[idx];
        }
        this.isSavingNodo = false;
        this.buildSwimlane();
        this.snackBar.open('Nodo guardado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        this.isSavingNodo = false;
        console.error('Error al guardar nodo:', err);
        this.snackBar.open(err?.error?.message || 'Error al guardar el nodo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  /** Auto-guarda el nodo al hacer blur en un campo (sin spinner ni snackbar). */
  autoSaveNodo(): void {
    if (!this.selectedNodo || this.nodoForm.invalid || this.politica?.estado !== 'BORRADOR') return;
    const val  = this.nodoForm.value;
    const data: UpdateActividadRequest = {
      nombre:            val.nombre,
      descripcion:       val.descripcion,
      responsableRolId:  val.responsableRolId || null,
      tiempoLimiteHoras: val.tiempoLimiteHoras || null,
      formularioId:      val.formularioId || null
    };
    this.actividadService.update(this.selectedNodo.id, data).subscribe({
      next: (updated) => {
        const idx = this.nodos.findIndex(n => n.id === this.selectedNodo!.id);
        if (idx !== -1) {
          const subtipo = this.nodos[idx].subtipoVisual;
          this.nodos[idx] = { ...(updated as NodoSVG), subtipoVisual: subtipo };
          this.selectedNodo = this.nodos[idx];
        }
        this.buildSwimlane();
      },
      error: (err) => { console.error('Auto-save nodo falló:', err); }
    });
  }

  // ── Eliminar nodo ─────────────────────────────────────────

  deleteNodo(nodo: NodoSVG): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar nodo',
        message: `¿Eliminás el nodo "${nodo.nombre}"? Se eliminarán también sus conexiones.`
      },
      width: '400px'
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.actividadService.delete(nodo.id).subscribe({
        next: () => {
          for (const n of this.nodos) {
            const before = n.transiciones.length;
            n.transiciones = n.transiciones.filter(t => t.actividadDestinoId !== nodo.id);
            if (n.transiciones.length !== before) {
              this.persistirTransiciones(n);
            }
          }
          this.nodos = this.nodos.filter(n => n.id !== nodo.id);
          this.selectedNodo = null;
          this.panelMode    = 'none';
          this.buildConexiones();
          this.runValidation();
          this.buildSwimlane();
          this.snackBar.open('Nodo eliminado', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          console.error('Error al eliminar nodo:', err);
          this.snackBar.open(err?.error?.message || 'Error al eliminar el nodo', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  // ── Guardar todo (manual) ─────────────────────────────────

  guardarCambios(): void {
    if (!this.politica || this.politica.estado !== 'BORRADOR') return;
    this.isSaving = true;

    const updates = this.nodos.map(n =>
      this.actividadService.update(n.id, { posicion: n.posicion, transiciones: n.transiciones })
    );

    if (updates.length === 0) {
      this.isSaving = false;
      this.snackBar.open('No hay cambios para guardar', 'Cerrar', { duration: 2000 });
      return;
    }

    forkJoin(updates).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving   = false;
        this.isDirty    = false;
        this.lastSaved  = new Date();
        this.snackBar.open('Flujo guardado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error al guardar flujo:', err);
        this.snackBar.open(err?.error?.message || 'Error al guardar el flujo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ── Auto-save (silencioso) ────────────────────────────────

  private performAutoSave(): void {
    if (!this.politica || this.politica.estado !== 'BORRADOR' || this.nodos.length === 0) return;
    const updates = this.nodos.map(n =>
      this.actividadService.update(n.id, { posicion: n.posicion, transiciones: n.transiciones })
    );
    forkJoin(updates).subscribe({
      next: () => {
        this.isDirty   = false;
        this.lastSaved = new Date();
        this.cdr.markForCheck();
      },
      error: () => {} // Silencioso: no molestar al usuario con errores de auto-save
    });
  }

  // ── Nombre inline ─────────────────────────────────────────

  startEditingName(): void {
    if (!this.politica || this.politica.estado !== 'BORRADOR') return;
    this.editingName      = true;
    this.editingNameValue = this.politica.nombre;
    setTimeout(() => {
      const input = document.querySelector('.wb-title-input') as HTMLInputElement;
      if (input) { input.focus(); input.select(); }
    }, 0);
  }

  cancelEditingName(): void {
    this.editingName      = false;
    this.editingNameValue = '';
  }

  saveEditingName(): void {
    if (!this.politica || !this.editingNameValue.trim()) {
      this.cancelEditingName();
      return;
    }
    if (this.editingNameValue === this.politica.nombre) {
      this.cancelEditingName();
      return;
    }
    this.isSavingName = true;
    this.politicaService.update(this.politica.id, { nombre: this.editingNameValue.trim() }).subscribe({
      next: (updated) => {
        this.politica    = updated;
        this.isSavingName = false;
        this.editingName  = false;
        this.editingNameValue = '';
        this.snackBar.open('Nombre actualizado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        this.isSavingName = false;
        console.error('Error al actualizar nombre:', err);
        this.snackBar.open(err?.error?.message || 'Error al actualizar el nombre', 'Cerrar', { duration: 4000 });
        this.editingNameValue = this.politica!.nombre;
      }
    });
  }

  // ── Atajos de teclado ─────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.isEditingInput()) return;

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedNodo) {
      if (this.politica?.estado === 'BORRADOR') {
        this.deleteNodo(this.selectedNodo);
      }
    }
    if (event.key === 'Escape') {
      this.cancelarConexion();
      this.selectedNodo     = null;
      this.selectedConexion = null;
      this.panelMode        = 'none';
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.guardarCambios();
    }
    if (event.key === 'f' || event.key === 'F') {
      this.resetZoom();
    }
    if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    }
    if (event.key === '-') {
      this.zoomOut();
    }
  }

  private isEditingInput(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);
  }

  // ── Status text ───────────────────────────────────────────

  get saveStatusText(): string {
    if (this.isSaving) return 'Guardando…';
    if (this.isDirty)  return 'Cambios sin guardar';
    if (this.lastSaved) {
      const diffMs   = Date.now() - this.lastSaved.getTime();
      const diffMin  = Math.floor(diffMs / 60000);
      if (diffMin === 0) return 'Guardado hace un momento';
      return `Guardado hace ${diffMin} min`;
    }
    return 'Sin cambios';
  }

  getValidationTooltip(): string {
    if (this.validation.isValid) return 'El flujo es estructuralmente válido';
    return this.validation.errors.map(e => e.message).join(' | ');
  }

  // ── Helpers de renderizado ────────────────────────────────

  getNodeTransform(nodo: NodoSVG): string {
    return `translate(${nodo.posicion.x}, ${nodo.posicion.y})`;
  }

  getNodeBadgeTransform(nodo: NodoSVG): string {
    const d = NODE_DIMS[nodo.tipo] ?? { w: 100, h: 64 };
    return `translate(${d.w - 2}, 2)`;
  }

  getNodeFilter(nodo: NodoSVG): string {
    if (this.selectedNodo?.id === nodo.id) return 'url(#wb-shadow-selected)';
    if ((nodo.validationErrors?.length ?? 0) > 0) return 'url(#wb-shadow-error)';
    if ((nodo.validationWarnings?.length ?? 0) > 0) return 'url(#wb-shadow-warning)';
    return '';
  }

  getTareaFill(nodo: NodoSVG, dark: boolean): string {
    const map: Record<string, { base: string; dark: string }> = {
      APROBACION:   { base: '#0891b2', dark: '#0e7490' },
      NOTIFICACION: { base: '#7c3aed', dark: '#6d28d9' },
      PARALELO:     { base: '#1d4ed8', dark: '#1e40af' },
      SUBPROCESO:   { base: '#6d28d9', dark: '#5b21b6' }
    };
    if (nodo.subtipoVisual && map[nodo.subtipoVisual]) {
      return dark ? map[nodo.subtipoVisual].dark : map[nodo.subtipoVisual].base;
    }
    const selected = this.selectedNodo?.id === nodo.id;
    return dark
      ? (selected ? '#1e3a8a' : '#1e40af')
      : (selected ? '#1d4ed8' : '#1e3a8a');
  }

  getTareaIconCode(subtipoVisual: SubtipoVisual | undefined): string {
    // Material Icons ligature codes (texto)
    const map: Record<SubtipoVisual, string> = {
      APROBACION:   'check_circle',
      NOTIFICACION: 'notifications',
      PARALELO:     'call_split',
      SUBPROCESO:   'account_tree'
    };
    return subtipoVisual ? map[subtipoVisual] : 'task';
  }

  getTareaSubtipoLabel(subtipoVisual: SubtipoVisual | undefined): string {
    if (!subtipoVisual) return 'TAREA';
    const map: Record<SubtipoVisual, string> = {
      APROBACION:   'APROBACIÓN',
      NOTIFICACION: 'NOTIFICACIÓN',
      PARALELO:     'PARALELO',
      SUBPROCESO:   'SUBPROCESO'
    };
    return map[subtipoVisual];
  }

  getAdvancedColor(subtipoVisual: SubtipoVisual | undefined): string {
    const map: Partial<Record<SubtipoVisual, string>> = {
      APROBACION:   '#0891b2',
      NOTIFICACION: '#7c3aed',
      PARALELO:     '#1d4ed8',
      SUBPROCESO:   '#6d28d9'
    };
    return subtipoVisual && map[subtipoVisual] ? map[subtipoVisual]! : '#1e3a8a';
  }

  getMinimapColor(nodo: NodoSVG): string {
    return this.getTipoColor(nodo.tipo);
  }

  getNodeTypeBadgeColor(nodo: NodoSVG): string {
    const map: Record<TipoActividad, string> = {
      INICIO:   '#16a34a',
      TAREA:    '#1e3a8a',
      DECISION: '#d97706',
      FIN:      '#dc2626'
    };
    return map[nodo.tipo] ?? '#64748b';
  }

  getTipoColor(tipo: string): string {
    const map: Record<string, string> = {
      INICIO:   '#16a34a',
      TAREA:    '#1e3a8a',
      DECISION: '#d97706',
      FIN:      '#dc2626'
    };
    return map[tipo] ?? '#64748b';
  }

  getTipoIcon(tipo: string): string {
    const map: Record<string, string> = {
      INICIO:   'play_circle',
      TAREA:    'task_alt',
      DECISION: 'device_hub',
      FIN:      'stop_circle'
    };
    return map[tipo] ?? 'circle';
  }

  // ── Helpers de datos ──────────────────────────────────────

  getTransicionesSalientes(nodo: NodoSVG): Transicion[] {
    return nodo.transiciones;
  }

  getNombreNodo(id: string): string {
    return this.nodos.find(n => n.id === id)?.nombre ?? id;
  }

  getFormularioNombre(formularioId: string | null): string {
    if (!formularioId) return '—';
    return this.formularios.find(f => f.id === formularioId)?.nombre ?? formularioId;
  }

  getRolNombre(rolId: string | null): string {
    if (!rolId) return '—';
    return this.roles.find(r => r.id === rolId)?.nombre ?? rolId;
  }
}
