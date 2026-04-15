import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ViewEncapsulation, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DecisionService } from '../../shared/services/decision.service';
import { Decision } from '../../shared/models/decision.model';

// dmn-js
import DmnModeler from 'dmn-js/lib/Modeler';

@Component({
  selector: 'app-dmn-editor',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
<div class="dmn-shell">

  <!-- TOP BAR -->
  <div class="dmn-top-bar" role="toolbar" aria-label="Barra de herramientas del editor DMN">
    <button
      mat-icon-button
      [routerLink]="decision?.politicaId ? ['/policies', decision?.politicaId] : ['/policies']"
      matTooltip="Volver al detalle de la política"
      aria-label="Volver al detalle de la política">
      <mat-icon>arrow_back</mat-icon>
    </button>

    <span class="dmn-title" aria-live="polite">
      {{ decision?.nombre || 'Tabla de Decisión' }}
    </span>

    <div class="dmn-spacer" role="none"></div>

    <!-- Indicador dirty: icono + texto para no depender solo del color -->
    <span *ngIf="isDirty" class="dmn-dirty" role="status" aria-label="Cambios sin guardar">
      <mat-icon aria-hidden="true">edit</mat-icon>
      <span class="dmn-dirty-label">Sin guardar</span>
    </span>

    <button
      mat-raised-button
      color="primary"
      (click)="saveNow()"
      [disabled]="isSaving"
      aria-label="Guardar tabla de decisión">
      <mat-icon aria-hidden="true">{{ isSaving ? 'hourglass_empty' : 'save' }}</mat-icon>
      {{ isSaving ? 'Guardando…' : 'Guardar' }}
    </button>
  </div>

  <!-- CUERPO -->
  <div class="dmn-body">
    <ng-container *ngIf="!isLoading; else loadingTpl">
      <div #dmnCanvas class="dmn-canvas" aria-label="Editor de tabla de decisión DMN"></div>
    </ng-container>
    <ng-template #loadingTpl>
      <div class="dmn-loading" role="status" aria-label="Cargando tabla de decisión">
        <mat-spinner diameter="48"></mat-spinner>
        <span class="dmn-loading-text">Cargando…</span>
      </div>
    </ng-template>
  </div>

</div>
  `,
  styles: [`
    .dmn-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .dmn-top-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #1e3a8a;
      color: white;
      min-height: 52px;
      flex-shrink: 0;
    }

    /* Asegura que todos los botones del top-bar cumplan el mínimo táctil de 44px */
    .dmn-top-bar button {
      min-width: 44px;
      min-height: 44px;
    }

    .dmn-top-bar mat-icon {
      color: white;
    }

    .dmn-title {
      font-size: 15px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 400px;
    }

    .dmn-spacer {
      flex: 1;
    }

    /* Dirty indicator: amber (#fbbf24) sobre #1e3a8a — contraste ~5.1:1 */
    .dmn-dirty {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fbbf24;
    }

    .dmn-dirty mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #fbbf24;
    }

    .dmn-dirty-label {
      font-size: 12px;
      font-weight: 500;
      color: #fbbf24;
    }

    .dmn-body {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .dmn-canvas {
      width: 100%;
      height: 100%;
    }

    .dmn-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
    }

    .dmn-loading-text {
      color: #64748b;
      font-size: 14px;
    }
  `]
})
export class DmnEditorComponent implements OnInit, OnDestroy {

  @ViewChild('dmnCanvas') canvasRef!: ElementRef<HTMLElement>;

  decision: Decision | null = null;
  decisionId: string | null = null;

  isLoading = true;
  isDirty = false;
  isSaving = false;

  private modeler: InstanceType<typeof DmnModeler> | null = null;
  private autoSave$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private decisionService: DecisionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.decisionId = this.route.snapshot.paramMap.get('id');

    if (!this.decisionId) {
      this.snackBar.open('ID de decisión no válido', 'Cerrar', { duration: 4000 });
      this.isLoading = false;
      return;
    }

    // Auto-save con debounce 2s
    this.autoSave$
      .pipe(debounceTime(2000), takeUntil(this.destroy$))
      .subscribe(() => this.saveNow());

    // Cargar metadata de la decisión
    this.decisionService.getById(this.decisionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (decision) => {
          this.decision = decision;
          this.cdr.detectChanges();
          // Espera al siguiente tick para que Angular renderice el canvas
          setTimeout(() => this.initDmnModeler(), 0);
        },
        error: (err) => {
          console.error('Error cargando decisión:', err);
          this.snackBar.open('No se pudo cargar la tabla de decisión', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.modeler) {
      this.modeler.destroy();
      this.modeler = null;
    }
  }

  private initDmnModeler(): void {
    if (!this.canvasRef?.nativeElement) {
      console.error('DmnEditor: canvasRef no disponible al inicializar el modeler');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.modeler = new DmnModeler({
      container: this.canvasRef.nativeElement
    });

    // Escuchar cambios para marcar dirty y disparar auto-save
    this.modeler.on('commandStack.changed', () => {
      this.isDirty = true;
      this.autoSave$.next();
      this.cdr.detectChanges();
    });

    // Cargar el XML del diagrama
    this.decisionService.getDmn(this.decisionId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ dmnXml }) => {
          this.modeler!.importXML(dmnXml)
            .then(() => {
              this.isLoading = false;
              this.isDirty = false;
              this.cdr.detectChanges();
            })
            .catch((err: unknown) => {
              console.error('Error importando DMN XML:', err);
              this.snackBar.open('Error al renderizar el diagrama DMN', 'Cerrar', { duration: 5000 });
              this.isLoading = false;
              this.cdr.detectChanges();
            });
        },
        error: (err) => {
          console.error('Error obteniendo DMN XML:', err);
          this.snackBar.open('No se pudo cargar el diagrama DMN', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  saveNow(): void {
    if (!this.modeler || !this.decisionId || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    this.modeler.saveXML({ format: true })
      .then(({ xml }: { xml: string }) => {
        this.decisionService.saveDmn(this.decisionId!, xml)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isDirty = false;
              this.isSaving = false;
              this.snackBar.open('Tabla guardada correctamente', 'OK', { duration: 3000 });
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error guardando DMN XML:', err);
              this.isSaving = false;
              this.snackBar.open('Error al guardar. Reintenta.', 'Cerrar', { duration: 5000 });
              this.cdr.detectChanges();
            }
          });
      })
      .catch((err: unknown) => {
        console.error('Error serializando DMN XML:', err);
        this.isSaving = false;
        this.snackBar.open('Error al serializar el diagrama', 'Cerrar', { duration: 5000 });
        this.cdr.detectChanges();
      });
  }
}
