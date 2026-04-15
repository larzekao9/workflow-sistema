import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ViewEncapsulation, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PoliticaService } from '../../shared/services/politica.service';
import { RoleService } from '../../shared/services/role.service';
import { FormularioService } from '../../shared/services/formulario.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Politica } from '../../shared/models/politica.model';

// bpmn-js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import MinimapModule from 'diagram-js-minimap';
import TokenSimulationModule from 'bpmn-js-token-simulation';
import BpmnlintModule from 'bpmn-js-bpmnlint';

// Moddle descriptor de extensiones de negocio
import workflowDescriptor from '../../shared/bpmn/workflow-moddle-descriptor.json';

@Component({
  selector: 'app-flow-editor',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatDividerModule, MatChipsModule, MatDialogModule
  ],
  template: `
<div class="bpmn-shell">

  <!-- TOP BAR -->
  <div class="bpmn-top-bar">
    <button mat-icon-button [routerLink]="['/policies', politicaId]" matTooltip="Volver al detalle">
      <mat-icon>arrow_back</mat-icon>
    </button>

    <div class="bpmn-title-wrap">
      <span *ngIf="!editingName" class="bpmn-title"
            (click)="startEditingName()"
            [matTooltip]="politica?.estado !== 'BORRADOR' ? '' : 'Clic para editar nombre'">
        {{ politica?.nombre || 'Editor de Flujo' }}
      </span>
      <input *ngIf="editingName"
             class="bpmn-title-input"
             [(ngModel)]="editingNameValue"
             (keydown.enter)="saveEditingName()"
             (keydown.escape)="cancelEditingName()"
             (blur)="saveEditingName()"
             #titleInput />
      <span *ngIf="politica?.estado" class="bpmn-state-badge" [ngClass]="'state-' + politica!.estado.toLowerCase()">
        {{ politica?.estado }}
      </span>
    </div>

    <div class="bpmn-top-spacer"></div>

    <!-- Dirty indicator -->
    <span *ngIf="isDirty && politica?.estado === 'BORRADOR'" class="bpmn-dirty-indicator" matTooltip="Cambios sin guardar">
      <mat-icon>edit</mat-icon>
    </span>
    <span *ngIf="!isDirty && lastSaved" class="bpmn-saved-indicator" matTooltip="Guardado">
      <mat-icon>cloud_done</mat-icon>
    </span>

    <!-- Toolbar actions -->
    <button mat-icon-button (click)="fitViewport()" matTooltip="Ajustar vista (Ctrl+Shift+H)">
      <mat-icon>fit_screen</mat-icon>
    </button>
    <button mat-icon-button
            *ngIf="politica?.estado === 'BORRADOR'"
            [style.color]="simulationActive ? '#fbbf24' : ''"
            (click)="toggleSimulation()"
            matTooltip="Simulación de tokens (play/pause)">
      <mat-icon>{{ simulationActive ? 'stop_circle' : 'play_circle' }}</mat-icon>
    </button>
    <button mat-icon-button (click)="importBpmn()" matTooltip="Importar .bpmn"
            *ngIf="politica?.estado === 'BORRADOR'">
      <mat-icon>upload_file</mat-icon>
    </button>
    <button mat-icon-button (click)="exportBpmn()" matTooltip="Exportar .bpmn">
      <mat-icon>download</mat-icon>
    </button>
    <button mat-icon-button (click)="exportSvg()" matTooltip="Exportar imagen SVG">
      <mat-icon>image</mat-icon>
    </button>
    <button mat-raised-button color="primary"
            *ngIf="politica?.estado === 'BORRADOR'"
            (click)="saveNow()" [disabled]="isSaving" class="bpmn-save-btn">
      <mat-spinner *ngIf="isSaving" diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
      <mat-icon *ngIf="!isSaving">save</mat-icon>
      Guardar
    </button>

    <input #fileInput type="file" accept=".bpmn,.xml" style="display:none"
           (change)="onFileSelected($event)" />
  </div>

  <!-- MAIN BODY -->
  <div class="bpmn-body" *ngIf="!isLoading; else loadingTpl">
    <!-- Canvas bpmn-js -->
    <div #bpmnCanvas class="bpmn-canvas"></div>

    <!-- Properties panel (solo BORRADOR) -->
    <div #bpmnProperties class="bpmn-properties"
         [class.bpmn-properties--hidden]="politica?.estado !== 'BORRADOR'">
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="bpmn-status-bar">
    <span class="status-item">
      <mat-icon>info</mat-icon>
      {{ politica?.estado === 'BORRADOR' ? 'Modo edicion' : 'Solo lectura — ' + politica?.estado }}
    </span>
    <span class="status-sep"></span>
    <span class="status-item" *ngIf="lastSaved">
      Guardado: {{ getLastSavedText() }}
    </span>
    <span class="status-item" *ngIf="isDirty && politica?.estado === 'BORRADOR'">
      <mat-icon style="font-size:14px;color:#f59e0b">circle</mat-icon>
      Cambios sin guardar
    </span>
    <span class="status-sep"></span>
    <span class="status-item">v{{ politica?.version }}</span>
  </div>

</div>

<ng-template #loadingTpl>
  <div class="bpmn-loading">
    <mat-spinner diameter="48"></mat-spinner>
    <p>Cargando editor...</p>
  </div>
</ng-template>
  `,
  styles: [`
    .bpmn-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #f8fafc;
      overflow: hidden;
    }
    .bpmn-top-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #1e3a8a;
      color: white;
      min-height: 52px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10;
    }
    .bpmn-top-bar button[mat-icon-button] { color: rgba(255,255,255,0.85); }
    .bpmn-top-bar button[mat-icon-button]:hover { color: white; }
    .bpmn-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bpmn-title {
      font-size: 15px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      padding: 3px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .bpmn-title:hover { background: rgba(255,255,255,0.12); }
    .bpmn-title-input {
      font-size: 15px;
      font-weight: 600;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 4px;
      color: white;
      padding: 3px 8px;
      outline: none;
      width: 240px;
    }
    .bpmn-state-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(255,255,255,0.2);
      color: white;
    }
    .state-activa   { background: #16a34a !important; }
    .state-inactiva { background: #d97706 !important; }
    .state-archivada{ background: #64748b !important; }
    .bpmn-top-spacer { flex: 1; }
    .bpmn-dirty-indicator, .bpmn-saved-indicator {
      display: flex; align-items: center;
      color: rgba(255,255,255,0.7);
      font-size: 13px;
    }
    .bpmn-dirty-indicator mat-icon { font-size: 16px; width: 16px; height: 16px; color: #fbbf24; }
    .bpmn-saved-indicator mat-icon { font-size: 16px; width: 16px; height: 16px; color: #86efac; }
    .bpmn-save-btn {
      background: #2563eb !important;
      color: white !important;
      font-size: 13px !important;
      height: 34px !important;
    }
    .bpmn-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .bpmn-canvas {
      flex: 1;
      height: 100%;
      background: #f0f4f8;
    }
    .bpmn-properties {
      width: 300px;
      min-width: 300px;
      height: 100%;
      overflow-y: auto;
      background: white;
      border-left: 1px solid #e2e8f0;
    }
    .bpmn-properties--hidden {
      display: none;
    }
    .bpmn-status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 16px;
      background: #1e293b;
      color: rgba(255,255,255,0.6);
      font-size: 11px;
      min-height: 28px;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .status-item mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-sep {
      width: 1px; height: 14px;
      background: rgba(255,255,255,0.2);
      margin: 0 4px;
    }
    .bpmn-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      color: #64748b;
    }
    /* Override bpmn-js styles para encajar con nuestro shell */
    .bpmn-canvas .djs-container { background: transparent !important; }
    .bjs-powered-by { display: none !important; }
    /* Properties panel override */
    .bpmn-properties .bio-properties-panel {
      height: 100%;
    }
  `]
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('bpmnCanvas') canvasRef!: ElementRef;
  @ViewChild('bpmnProperties') propertiesRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('titleInput') titleInputRef!: ElementRef<HTMLInputElement>;

  politicaId: string | null = null;
  politica: Politica | null = null;
  isLoading = false;
  isSaving = false;
  isDirty = false;
  lastSaved: Date | null = null;

  editingName = false;
  editingNameValue = '';
  isSavingName = false;
  simulationActive = false;
  lintErrors: any[] = [];

  private modeler: any = null;
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private roleService: RoleService,
    private formularioService: FormularioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (!this.politicaId) {
      this.router.navigate(['/policies']);
      return;
    }
    this.loadData();

    // Auto-save 2 segundos despues del ultimo cambio
    this.autoSave$.pipe(
      debounceTime(2000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.autoSave());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.modeler) {
      this.modeler.destroy();
    }
  }

  private loadData(): void {
    if (!this.politicaId) return;
    this.isLoading = true;

    this.politicaService.getById(this.politicaId).subscribe({
      next: (p) => {
        this.politica = p;
        this.isLoading = false;      // canvas entra al DOM antes de que bpmn-js lo necesite
        this.cdr.detectChanges();    // fuerza renderizado del *ngIf
        setTimeout(() => this.initBpmnModeler(), 50);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err?.error?.message || 'Error al cargar la politica', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/policies']);
      }
    });
  }

  private initBpmnModeler(): void {
    if (!this.politicaId) return;

    const isReadOnly = this.politica?.estado !== 'BORRADOR';

    try {
      if (isReadOnly) {
        this.modeler = new BpmnViewer({
          container: this.canvasRef.nativeElement,
          additionalModules: [MinimapModule]
        });
      } else {
        this.modeler = new BpmnModeler({
          container: this.canvasRef.nativeElement,
          propertiesPanel: {
            parent: this.propertiesRef.nativeElement
          },
          additionalModules: [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            MinimapModule,
            TokenSimulationModule,
            BpmnlintModule
          ],
          linting: {
            active: true
          },
          moddleExtensions: {
            workflow: workflowDescriptor
          }
        });

        // Escuchar cambios para auto-save e indicador dirty
        this.modeler.on('commandStack.changed', () => {
          this.isDirty = true;
          this.autoSave$.next();
          this.cdr.detectChanges();
        });

        // Token simulation: sincronizar estado del botón
        this.modeler.on('tokenSimulation.toggleMode', () => {
          this.simulationActive = !this.simulationActive;
          this.cdr.detectChanges();
        });

        // Lint: recoger errores de validación
        this.modeler.on('linting.completed', (e: any) => {
          this.lintErrors = e.issues ? (Object.values(e.issues) as any[]).flat() : [];
          this.cdr.detectChanges();
        });
      }

      // Cargar el XML del backend
      this.politicaService.getBpmn(this.politicaId!).subscribe({
        next: ({ bpmnXml }) => {
          this.modeler.importXML(bpmnXml).then(() => {
            this.modeler.get('canvas').zoom('fit-viewport');
            this.cdr.detectChanges();
          }).catch((err: any) => {
            console.error('Error importando BPMN XML:', err);
            this.isLoading = false;
            this.snackBar.open('Error al cargar el diagrama', 'Cerrar', { duration: 4000 });
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open(err?.error?.message || 'Error al cargar el diagrama', 'Cerrar', { duration: 4000 });
          this.cdr.detectChanges();
        }
      });

    } catch (err) {
      console.error('Error inicializando bpmn-js:', err);
      this.isLoading = false;
      this.snackBar.open('Error al inicializar el editor', 'Cerrar', { duration: 4000 });
      this.cdr.detectChanges();
    }
  }

  private autoSave(): void {
    if (!this.politicaId || !this.modeler || this.politica?.estado !== 'BORRADOR') return;
    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      this.politicaService.saveBpmn(this.politicaId!, xml).subscribe({
        next: () => {
          this.isDirty = false;
          this.lastSaved = new Date();
          this.cdr.detectChanges();
        },
        error: () => {} // silencioso en auto-save
      });
    }).catch(() => {});
  }

  saveNow(): void {
    if (!this.politicaId || !this.modeler) return;
    this.isSaving = true;
    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      this.politicaService.saveBpmn(this.politicaId!, xml).subscribe({
        next: () => {
          this.isSaving = false;
          this.isDirty = false;
          this.lastSaved = new Date();
          this.snackBar.open('Diagrama guardado', 'Cerrar', { duration: 2000 });
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.snackBar.open(err?.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
          this.cdr.detectChanges();
        }
      });
    });
  }

  fitViewport(): void {
    this.modeler?.get('canvas').zoom('fit-viewport');
  }

  toggleSimulation(): void {
    if (!this.modeler) return;
    try {
      this.modeler.get('toggleMode').toggleMode();
    } catch {
      this.snackBar.open('Simulación no disponible en este modo', 'Cerrar', { duration: 2000 });
    }
  }

  importBpmn(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const xml = e.target?.result as string;
      this.modeler.importXML(xml).then(() => {
        this.isDirty = true;
        this.autoSave$.next();
        this.snackBar.open('Diagrama importado correctamente', 'Cerrar', { duration: 3000 });
        this.cdr.detectChanges();
      }).catch((_err: any) => {
        this.snackBar.open('Error al importar el archivo BPMN', 'Cerrar', { duration: 4000 });
      });
    };
    reader.readAsText(file);
    // Reset input para permitir importar el mismo archivo dos veces
    (event.target as HTMLInputElement).value = '';
  }

  exportBpmn(): void {
    if (!this.modeler) return;
    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.politica?.nombre || 'workflow'}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSvg(): void {
    if (!this.modeler) return;
    this.modeler.saveSVG().then(({ svg }: { svg: string }) => {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.politica?.nombre || 'workflow'}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Nombre editable inline ─────────────────────────────────
  startEditingName(): void {
    if (!this.politica || this.politica.estado !== 'BORRADOR') return;
    this.editingName = true;
    this.editingNameValue = this.politica.nombre;
    setTimeout(() => {
      this.titleInputRef?.nativeElement?.focus();
      this.titleInputRef?.nativeElement?.select();
    }, 0);
  }

  cancelEditingName(): void {
    this.editingName = false;
    this.editingNameValue = '';
  }

  saveEditingName(): void {
    if (!this.politica || !this.editingNameValue?.trim()) {
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
        this.politica = updated;
        this.isSavingName = false;
        this.editingName = false;
        this.snackBar.open('Nombre actualizado', 'Cerrar', { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSavingName = false;
        this.snackBar.open(err?.error?.message || 'Error al actualizar nombre', 'Cerrar', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────
  getLastSavedText(): string {
    if (!this.lastSaved) return '';
    const diffMs = Date.now() - this.lastSaved.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'hace unos segundos';
    if (diffMin === 1) return 'hace 1 min';
    return `hace ${diffMin} min`;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.politica?.estado === 'BORRADOR') this.saveNow();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      this.fitViewport();
    }
  }
}
