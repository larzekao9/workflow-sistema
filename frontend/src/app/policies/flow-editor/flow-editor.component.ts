import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PoliticaService } from '../../shared/services/politica.service';
import { ActividadService } from '../../shared/services/actividad.service';
import { Politica } from '../../shared/models/politica.model';
import {
  Actividad,
  TipoActividad,
  Transicion,
  CreateActividadRequest,
  UpdateActividadRequest
} from '../../shared/models/actividad.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface NodoSVG extends Actividad {
  // posicion.x / posicion.y ya vienen del modelo
}

interface ConexionUI {
  desde: NodoSVG;
  hasta: NodoSVG;
  transicion: Transicion;
  path: string;
  midX: number;
  midY: number;
}

type PanelMode = 'none' | 'nodo' | 'conexion';

@Component({
  selector: 'app-flow-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
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
    MatDialogModule
  ],
  template: `
    <div class="editor-shell">

      <!-- Barra superior -->
      <div class="top-bar">
        <button mat-icon-button [routerLink]="['/policies', politicaId]" matTooltip="Volver al detalle">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="top-title">Editor de Flujo{{ politica ? ': ' + politica.nombre : '' }}</h2>
        <div class="top-spacer"></div>
        <span *ngIf="politica?.estado !== 'BORRADOR'" class="readonly-badge">
          <mat-icon>lock</mat-icon> Solo lectura ({{ politica?.estado }})
        </span>
        <button
          mat-raised-button
          color="primary"
          *ngIf="politica?.estado === 'BORRADOR'"
          (click)="guardarCambios()"
          [disabled]="isSaving">
          <mat-spinner *ngIf="isSaving" diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
          <mat-icon *ngIf="!isSaving">save</mat-icon>
          Guardar
        </button>
      </div>

      <div class="editor-body" *ngIf="!isLoading; else loadingTpl">

        <!-- Panel izquierdo: palette de nodos -->
        <div class="left-panel" *ngIf="politica?.estado === 'BORRADOR'">
          <h3 class="panel-title">Agregar nodo</h3>
          <mat-divider></mat-divider>
          <div class="node-btn" (click)="addNodo('INICIO')">
            <svg width="36" height="36"><circle cx="18" cy="18" r="15" fill="#4caf50"/></svg>
            <span>Inicio</span>
          </div>
          <div class="node-btn" (click)="addNodo('TAREA')">
            <svg width="36" height="36"><rect x="3" y="8" width="30" height="20" rx="4" fill="#1976d2"/></svg>
            <span>Tarea</span>
          </div>
          <div class="node-btn" (click)="addNodo('DECISION')">
            <svg width="36" height="36"><polygon points="18,3 33,18 18,33 3,18" fill="#f9a825"/></svg>
            <span>Decisión</span>
          </div>
          <div class="node-btn" (click)="addNodo('FIN')">
            <svg width="36" height="36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f44336" stroke-width="3"/>
              <circle cx="18" cy="18" r="9" fill="#f44336"/>
            </svg>
            <span>Fin</span>
          </div>

          <mat-divider style="margin-top:16px"></mat-divider>

          <div *ngIf="modoConexion" class="conexion-active">
            <mat-icon color="accent">link</mat-icon>
            <span>Clic en nodo destino para conectar</span>
            <button mat-stroked-button color="warn" (click)="cancelarConexion()">Cancelar</button>
          </div>

          <button
            mat-stroked-button
            color="accent"
            *ngIf="selectedNodo && !modoConexion && politica?.estado === 'BORRADOR'"
            (click)="iniciarConexion()"
            style="margin-top:16px;width:100%">
            <mat-icon>link</mat-icon>
            Conectar desde este nodo
          </button>

          <button
            mat-stroked-button
            color="warn"
            *ngIf="selectedNodo && politica?.estado === 'BORRADOR'"
            (click)="deleteNodo(selectedNodo)"
            style="margin-top:8px;width:100%">
            <mat-icon>delete</mat-icon>
            Eliminar nodo
          </button>
        </div>

        <!-- Canvas SVG central -->
        <div class="canvas-wrapper" #canvasWrapper>
          <svg
            #svgCanvas
            class="flow-canvas"
            [attr.width]="canvasWidth"
            [attr.height]="canvasHeight"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp($event)"
            (mouseleave)="onMouseLeave()">

            <!-- Definición de marcador de flecha -->
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#546e7a" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#1976d2" />
              </marker>
            </defs>

            <!-- Línea de previsualización al conectar -->
            <line
              *ngIf="modoConexion && previewLine"
              [attr.x1]="previewLine.x1"
              [attr.y1]="previewLine.y1"
              [attr.x2]="previewLine.x2"
              [attr.y2]="previewLine.y2"
              stroke="#546e7a"
              stroke-width="2"
              stroke-dasharray="6,4"
              opacity="0.7">
            </line>

            <!-- Aristas (transiciones) -->
            <g *ngFor="let conn of conexiones">
              <path
                [attr.d]="conn.path"
                [class.selected-edge]="selectedConexion === conn"
                class="edge-path"
                (click)="selectConexion(conn, $event)"
                stroke="#546e7a"
                stroke-width="2"
                fill="none"
                [attr.marker-end]="selectedConexion === conn ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'"
                cursor="pointer">
              </path>
              <text
                [attr.x]="conn.midX"
                [attr.y]="conn.midY - 6"
                class="edge-label"
                text-anchor="middle">
                {{ conn.transicion.etiqueta || conn.transicion.condicion }}
              </text>
            </g>

            <!-- Nodos -->
            <g
              *ngFor="let nodo of nodos"
              [attr.transform]="'translate(' + nodo.posicion.x + ',' + nodo.posicion.y + ')'"
              (mousedown)="onNodoMouseDown($event, nodo)"
              (click)="selectNodo(nodo, $event)"
              class="nodo-group"
              [class.selected-node]="selectedNodo?.id === nodo.id"
              [class.modoConexion-target]="modoConexion && selectedNodo?.id !== nodo.id"
              cursor="pointer">

              <!-- Forma según tipo -->
              <ng-container [ngSwitch]="nodo.tipo">

                <!-- INICIO: círculo verde -->
                <ng-container *ngSwitchCase="'INICIO'">
                  <circle cx="50" cy="35" r="30"
                    [attr.fill]="selectedNodo?.id === nodo.id ? '#2e7d32' : '#4caf50'"
                    stroke="white" stroke-width="2"/>
                  <text x="50" y="40" text-anchor="middle" fill="white" font-size="11" font-weight="bold">INICIO</text>
                </ng-container>

                <!-- TAREA: rectángulo azul -->
                <ng-container *ngSwitchCase="'TAREA'">
                  <rect x="0" y="0" width="120" height="60" rx="6"
                    [attr.fill]="selectedNodo?.id === nodo.id ? '#0d47a1' : '#1976d2'"
                    stroke="white" stroke-width="2"/>
                  <text x="60" y="22" text-anchor="middle" fill="white" font-size="10" opacity="0.8">TAREA</text>
                  <text x="60" y="40" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                    {{ nodo.nombre | slice:0:14 }}{{ nodo.nombre.length > 14 ? '…' : '' }}
                  </text>
                </ng-container>

                <!-- DECISION: rombo amarillo -->
                <ng-container *ngSwitchCase="'DECISION'">
                  <polygon points="60,5 115,35 60,65 5,35"
                    [attr.fill]="selectedNodo?.id === nodo.id ? '#f57f17' : '#f9a825'"
                    stroke="white" stroke-width="2"/>
                  <text x="60" y="32" text-anchor="middle" fill="#333" font-size="10" opacity="0.8">DECISIÓN</text>
                  <text x="60" y="46" text-anchor="middle" fill="#333" font-size="11" font-weight="bold">
                    {{ nodo.nombre | slice:0:10 }}{{ nodo.nombre.length > 10 ? '…' : '' }}
                  </text>
                </ng-container>

                <!-- FIN: círculo rojo doble -->
                <ng-container *ngSwitchCase="'FIN'">
                  <circle cx="50" cy="35" r="30" fill="none" stroke="#f44336" stroke-width="4"/>
                  <circle cx="50" cy="35" r="20"
                    [attr.fill]="selectedNodo?.id === nodo.id ? '#c62828' : '#f44336'"/>
                  <text x="50" y="40" text-anchor="middle" fill="white" font-size="11" font-weight="bold">FIN</text>
                </ng-container>

              </ng-container>
            </g>
          </svg>
        </div>

        <!-- Panel derecho: propiedades -->
        <div class="right-panel" *ngIf="panelMode !== 'none'">

          <!-- Propiedades de nodo -->
          <ng-container *ngIf="panelMode === 'nodo' && selectedNodo">
            <h3 class="panel-title">Propiedades del nodo</h3>
            <mat-divider></mat-divider>

            <form [formGroup]="nodoForm" class="props-form" *ngIf="politica?.estado === 'BORRADOR'">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="nombre" />
                <mat-error *ngIf="nodoForm.get('nombre')?.hasError('required')">Obligatorio</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="descripcion" rows="2"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Rol responsable (ID)</mat-label>
                <input matInput formControlName="responsableRolId" placeholder="ID del rol..." />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tiempo límite (horas)</mat-label>
                <input matInput type="number" formControlName="tiempoLimiteHoras" min="0" />
              </mat-form-field>

              <button mat-raised-button color="primary" class="full-width" (click)="saveNodo()" [disabled]="nodoForm.invalid || isSavingNodo">
                <mat-spinner *ngIf="isSavingNodo" diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                Guardar nodo
              </button>
            </form>

            <!-- Modo solo lectura -->
            <div *ngIf="politica?.estado !== 'BORRADOR'" class="readonly-props">
              <p><strong>Nombre:</strong> {{ selectedNodo.nombre }}</p>
              <p><strong>Tipo:</strong> {{ selectedNodo.tipo }}</p>
              <p><strong>Descripción:</strong> {{ selectedNodo.descripcion || '—' }}</p>
              <p><strong>Rol:</strong> {{ selectedNodo.responsableRolId || '—' }}</p>
              <p><strong>Tiempo límite:</strong> {{ selectedNodo.tiempoLimiteHoras ? selectedNodo.tiempoLimiteHoras + 'h' : '—' }}</p>
            </div>

            <!-- Transiciones salientes -->
            <mat-divider style="margin-top:12px"></mat-divider>
            <h4 class="sub-title">Transiciones salientes ({{ getTransicionesSalientes(selectedNodo).length }})</h4>
            <div *ngFor="let t of getTransicionesSalientes(selectedNodo)" class="trans-item">
              <mat-icon>arrow_forward</mat-icon>
              <span>{{ getNombreNodo(t.actividadDestinoId) }} — {{ t.etiqueta || t.condicion }}</span>
            </div>
          </ng-container>

          <!-- Propiedades de conexión -->
          <ng-container *ngIf="panelMode === 'conexion' && selectedConexion">
            <h3 class="panel-title">Propiedades de la conexión</h3>
            <mat-divider></mat-divider>
            <p class="conn-desc">
              <strong>De:</strong> {{ selectedConexion.desde.nombre }}<br>
              <strong>A:</strong> {{ selectedConexion.hasta.nombre }}
            </p>

            <form [formGroup]="conexionForm" class="props-form" *ngIf="politica?.estado === 'BORRADOR'">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Condición</mat-label>
                <mat-select formControlName="condicion">
                  <mat-option value="SIEMPRE">SIEMPRE</mat-option>
                  <mat-option value="APROBADO">APROBADO</mat-option>
                  <mat-option value="RECHAZADO">RECHAZADO</mat-option>
                  <mat-option value="custom">Personalizada...</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width" *ngIf="conexionForm.get('condicion')?.value === 'custom'">
                <mat-label>Condición personalizada</mat-label>
                <input matInput formControlName="condicionCustom" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Etiqueta</mat-label>
                <input matInput formControlName="etiqueta" placeholder="Ej: Aprobado, Rechazado..." />
              </mat-form-field>

              <button mat-raised-button color="primary" class="full-width" (click)="saveConexion()" [disabled]="isSavingNodo">
                Guardar conexión
              </button>
              <button mat-stroked-button color="warn" class="full-width" style="margin-top:8px" (click)="deleteConexion()">
                <mat-icon>delete</mat-icon>
                Eliminar conexión
              </button>
            </form>

            <div *ngIf="politica?.estado !== 'BORRADOR'" class="readonly-props">
              <p><strong>Condición:</strong> {{ selectedConexion.transicion.condicion }}</p>
              <p><strong>Etiqueta:</strong> {{ selectedConexion.transicion.etiqueta || '—' }}</p>
            </div>
          </ng-container>

        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    .editor-shell {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      background: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;
    }
    .top-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      border-bottom: 1px solid rgba(0,0,0,0.12);
      min-height: 56px;
    }
    .top-title { margin: 0; font-size: 18px; font-weight: 500; }
    .top-spacer { flex: 1; }
    .readonly-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fff3e0;
      color: #e65100;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }
    .editor-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .left-panel {
      width: 180px;
      min-width: 180px;
      background: white;
      border-right: 1px solid rgba(0,0,0,0.12);
      padding: 12px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .right-panel {
      width: 240px;
      min-width: 240px;
      background: white;
      border-left: 1px solid rgba(0,0,0,0.12);
      padding: 12px;
      overflow-y: auto;
    }
    .panel-title { margin: 8px 0; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.7); }
    .sub-title { margin: 8px 0 4px; font-size: 13px; color: rgba(0,0,0,0.6); }
    .node-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    .node-btn:hover { background: rgba(0,0,0,0.06); }
    .canvas-wrapper {
      flex: 1;
      overflow: auto;
      background: #eceff1;
      background-image: radial-gradient(circle, #cfd8dc 1px, transparent 1px);
      background-size: 24px 24px;
      position: relative;
    }
    .flow-canvas { display: block; }
    .loading-container { display: flex; justify-content: center; align-items: center; flex: 1; padding: 48px; }
    .nodo-group { user-select: none; }
    .selected-node { filter: drop-shadow(0 0 6px rgba(25, 118, 210, 0.8)); }
    .modoConexion-target:hover { filter: drop-shadow(0 0 6px rgba(76, 175, 80, 0.9)); }
    .edge-path { transition: stroke 0.15s; }
    .selected-edge { stroke: #1976d2 !important; stroke-width: 3 !important; }
    .edge-label { font-size: 11px; fill: #546e7a; pointer-events: none; }
    .props-form { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    .full-width { width: 100%; }
    .trans-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: rgba(0,0,0,0.6);
      padding: 4px 0;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .trans-item mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .readonly-props p { font-size: 13px; margin: 6px 0; }
    .conn-desc { font-size: 13px; color: rgba(0,0,0,0.7); margin-top: 8px; }
    .conexion-active {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #e3f2fd;
      border-radius: 6px;
      padding: 8px;
      margin-top: 12px;
      font-size: 12px;
      text-align: center;
    }
  `]
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('svgCanvas') svgCanvas!: ElementRef<SVGElement>;
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

  politicaId: string | null = null;
  politica: Politica | null = null;
  nodos: NodoSVG[] = [];
  conexiones: ConexionUI[] = [];

  isLoading = false;
  isSaving = false;
  isSavingNodo = false;

  canvasWidth = 1400;
  canvasHeight = 900;

  // Drag state
  dragging: NodoSVG | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  // Selección
  selectedNodo: NodoSVG | null = null;
  selectedConexion: ConexionUI | null = null;
  panelMode: PanelMode = 'none';

  // Modo conexión
  modoConexion = false;
  previewLine: { x1: number; y1: number; x2: number; y2: number } | null = null;

  nodoForm: FormGroup;
  conexionForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private politicaService: PoliticaService,
    private actividadService: ActividadService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.nodoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      responsableRolId: [''],
      tiempoLimiteHoras: [null]
    });

    this.conexionForm = this.fb.group({
      condicion: ['SIEMPRE'],
      condicionCustom: [''],
      etiqueta: ['']
    });
  }

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (!this.politicaId) {
      this.router.navigate(['/policies']);
      return;
    }
    this.loadData();
  }

  ngOnDestroy(): void {}

  private loadData(): void {
    if (!this.politicaId) return;
    this.isLoading = true;
    this.politicaService.getById(this.politicaId).subscribe({
      next: (p) => {
        this.politica = p;
        this.loadNodos();
      },
      error: (err) => {
        this.isLoading = false;
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
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private buildConexiones(): void {
    this.conexiones = [];
    for (const nodo of this.nodos) {
      for (const t of nodo.transiciones) {
        const destino = this.nodos.find(n => n.id === t.actividadDestinoId);
        if (!destino) continue;
        const conn = this.buildConexionUI(nodo, destino, t);
        this.conexiones.push(conn);
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
    // curva bezier suave
    const path = `M ${x1} ${y1} C ${x1 + dx * 0.4} ${y1}, ${x2 - dx * 0.4} ${y2}, ${x2} ${y2}`;
    return { desde, hasta, transicion: { ...t }, path, midX, midY };
  }

  private getNodoCenter(nodo: NodoSVG): { cx: number; cy: number } {
    // offset del centro según tipo (los tamaños coinciden con el SVG del template)
    const offsets: Record<TipoActividad, { w: number; h: number }> = {
      INICIO: { w: 100, h: 70 },
      TAREA:  { w: 120, h: 60 },
      DECISION: { w: 120, h: 70 },
      FIN: { w: 100, h: 70 }
    };
    const o = offsets[nodo.tipo] ?? { w: 100, h: 60 };
    return {
      cx: nodo.posicion.x + o.w / 2,
      cy: nodo.posicion.y + o.h / 2
    };
  }

  // ── Drag & Drop ────────────────────────────────────────────

  onNodoMouseDown(event: MouseEvent, nodo: NodoSVG): void {
    if (this.politica?.estado !== 'BORRADOR') return;
    if (this.modoConexion) return; // en modo conexión, mousedown no arrastra
    event.stopPropagation();
    const svgRect = this.svgCanvas.nativeElement.getBoundingClientRect();
    this.dragging = nodo;
    this.dragOffsetX = event.clientX - svgRect.left - nodo.posicion.x;
    this.dragOffsetY = event.clientY - svgRect.top - nodo.posicion.y;
  }

  onMouseMove(event: MouseEvent): void {
    const svgRect = this.svgCanvas.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;

    if (this.dragging) {
      this.dragging.posicion = {
        x: Math.max(0, mouseX - this.dragOffsetX),
        y: Math.max(0, mouseY - this.dragOffsetY)
      };
      this.buildConexiones();
      return;
    }

    if (this.modoConexion && this.selectedNodo) {
      const { cx, cy } = this.getNodoCenter(this.selectedNodo);
      this.previewLine = { x1: cx, y1: cy, x2: mouseX, y2: mouseY };
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.dragging) {
      // posición ya actualizada en mousemove
      this.dragging = null;
    }
  }

  onMouseLeave(): void {
    this.dragging = null;
  }

  // ── Selección ─────────────────────────────────────────────

  selectNodo(nodo: NodoSVG, event: MouseEvent): void {
    event.stopPropagation();

    if (this.modoConexion && this.selectedNodo && this.selectedNodo.id !== nodo.id) {
      this.crearConexion(nodo);
      return;
    }

    this.selectedNodo = nodo;
    this.selectedConexion = null;
    this.panelMode = 'nodo';
    this.nodoForm.patchValue({
      nombre: nodo.nombre,
      descripcion: nodo.descripcion,
      responsableRolId: nodo.responsableRolId ?? '',
      tiempoLimiteHoras: nodo.tiempoLimiteHoras ?? null
    });
  }

  selectConexion(conn: ConexionUI, event: MouseEvent): void {
    event.stopPropagation();
    if (this.modoConexion) return;
    this.selectedConexion = conn;
    this.selectedNodo = null;
    this.panelMode = 'conexion';

    const condicion = conn.transicion.condicion;
    const isCustom = !['SIEMPRE', 'APROBADO', 'RECHAZADO'].includes(condicion);
    this.conexionForm.patchValue({
      condicion: isCustom ? 'custom' : condicion,
      condicionCustom: isCustom ? condicion : '',
      etiqueta: conn.transicion.etiqueta
    });
  }

  // ── Conexiones ────────────────────────────────────────────

  iniciarConexion(): void {
    this.modoConexion = true;
  }

  cancelarConexion(): void {
    this.modoConexion = false;
    this.previewLine = null;
  }

  private crearConexion(destino: NodoSVG): void {
    const origen = this.selectedNodo!;
    this.modoConexion = false;
    this.previewLine = null;

    // Verificar que no exista ya
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

    // Persistir inmediatamente
    this.persistirTransiciones(origen);
  }

  saveConexion(): void {
    if (!this.selectedConexion) return;
    const val = this.conexionForm.value;
    const condicion = val.condicion === 'custom' ? val.condicionCustom : val.condicion;
    const origen = this.selectedConexion.desde;
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
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.selectedConexion) return;
      const origen = this.selectedConexion.desde;
      const destinoId = this.selectedConexion.transicion.actividadDestinoId;
      origen.transiciones = origen.transiciones.filter(t => t.actividadDestinoId !== destinoId);
      this.selectedConexion = null;
      this.panelMode = 'none';
      this.buildConexiones();
      this.persistirTransiciones(origen);
    });
  }

  private persistirTransiciones(nodo: NodoSVG): void {
    const data: UpdateActividadRequest = { transiciones: nodo.transiciones };
    this.actividadService.update(nodo.id, data).subscribe({
      next: () => {},
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al guardar conexión', 'Cerrar', { duration: 4000 })
    });
  }

  // ── Agregar nodo ──────────────────────────────────────────

  addNodo(tipo: TipoActividad): void {
    if (!this.politicaId) return;
    const x = 100 + Math.floor(Math.random() * 400);
    const y = 100 + Math.floor(Math.random() * 300);

    const data: CreateActividadRequest = {
      politicaId: this.politicaId,
      nombre: tipo === 'TAREA' ? 'Nueva tarea' : tipo === 'DECISION' ? 'Decisión' : tipo,
      descripcion: '',
      tipo,
      posicion: { x, y },
      transiciones: []
    };

    this.actividadService.create(data).subscribe({
      next: (act) => {
        this.nodos = [...this.nodos, act as NodoSVG];
        this.buildConexiones();
        this.snackBar.open('Nodo agregado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear nodo', 'Cerrar', { duration: 4000 })
    });
  }

  // ── Guardar nodo (propiedades) ────────────────────────────

  saveNodo(): void {
    if (!this.selectedNodo || this.nodoForm.invalid) return;
    this.isSavingNodo = true;
    const val = this.nodoForm.value;
    const data: UpdateActividadRequest = {
      nombre: val.nombre,
      descripcion: val.descripcion,
      responsableRolId: val.responsableRolId || null,
      tiempoLimiteHoras: val.tiempoLimiteHoras || null
    };

    this.actividadService.update(this.selectedNodo.id, data).subscribe({
      next: (updated) => {
        const idx = this.nodos.findIndex(n => n.id === this.selectedNodo!.id);
        if (idx !== -1) {
          this.nodos[idx] = { ...this.nodos[idx], ...updated };
          this.selectedNodo = this.nodos[idx];
        }
        this.isSavingNodo = false;
        this.snackBar.open('Nodo guardado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        this.isSavingNodo = false;
        this.snackBar.open(err?.error?.message || 'Error al guardar nodo', 'Cerrar', { duration: 4000 });
      }
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
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.actividadService.delete(nodo.id).subscribe({
        next: () => {
          // Eliminar transiciones que apunten a este nodo en otros nodos
          for (const n of this.nodos) {
            const before = n.transiciones.length;
            n.transiciones = n.transiciones.filter(t => t.actividadDestinoId !== nodo.id);
            if (n.transiciones.length !== before) {
              this.persistirTransiciones(n);
            }
          }
          this.nodos = this.nodos.filter(n => n.id !== nodo.id);
          this.selectedNodo = null;
          this.panelMode = 'none';
          this.buildConexiones();
          this.snackBar.open('Nodo eliminado', 'Cerrar', { duration: 2000 });
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al eliminar nodo', 'Cerrar', { duration: 4000 })
      });
    });
  }

  // ── Guardar posiciones masivo ─────────────────────────────

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

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(updates).subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open('Flujo guardado correctamente', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err?.error?.message || 'Error al guardar el flujo', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  getTransicionesSalientes(nodo: NodoSVG): Transicion[] {
    return nodo.transiciones;
  }

  getNombreNodo(id: string): string {
    return this.nodos.find(n => n.id === id)?.nombre ?? id;
  }
}
