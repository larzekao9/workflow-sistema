import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FormEditor } from '@bpmn-io/form-js-editor';
import { FormularioService } from '../../shared/services/formulario.service';

const EMPTY_SCHEMA = { type: 'default', components: [] };

@Component({
  selector: 'app-form-builder',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
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
    <div class="formjs-shell">
      <div class="formjs-top-bar">
        <button
          mat-icon-button
          routerLink="/forms"
          matTooltip="Volver a formularios"
          aria-label="Volver a formularios">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="formjs-title">{{ isEditMode ? 'Editar Formulario' : 'Nuevo Formulario' }}</span>
        <div class="formjs-spacer"></div>
        <span *ngIf="isDirty" class="formjs-dirty-badge" matTooltip="Cambios sin guardar">
          <mat-icon>edit</mat-icon>
        </span>
        <button
          mat-raised-button
          color="primary"
          (click)="saveNow()"
          [disabled]="isSaving"
          aria-label="Guardar formulario">
          <mat-spinner *ngIf="isSaving" diameter="18" class="btn-spinner"></mat-spinner>
          <mat-icon *ngIf="!isSaving">save</mat-icon>
          {{ isSaving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>

      <div class="formjs-body" *ngIf="!isLoading; else loadingTpl">
        <div #formjsContainer class="formjs-canvas"></div>
      </div>

      <ng-template #loadingTpl>
        <div class="formjs-loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .formjs-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .formjs-top-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #1e3a8a;
      color: white;
      min-height: 52px;
      flex-shrink: 0;
      z-index: 10;
    }

    .formjs-top-bar button[mat-icon-button] {
      color: white;
    }

    .formjs-title {
      font-size: 15px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .formjs-spacer {
      flex: 1;
    }

    .formjs-dirty-badge {
      display: flex;
      align-items: center;
      color: #fbbf24;
    }

    .formjs-dirty-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-spinner {
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }

    .formjs-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      min-height: 0;
    }

    .formjs-canvas {
      flex: 1;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .formjs-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    /* Ensure form-js editor fills the container */
    .formjs-canvas .fjs-container,
    .formjs-canvas .fjs-editor {
      height: 100% !important;
    }
  `]
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  @ViewChild('formjsContainer') containerRef!: ElementRef<HTMLDivElement>;

  isEditMode = false;
  isLoading = true;
  isSaving = false;
  isDirty = false;
  formularioId: string | null = null;

  private editor: FormEditor | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly autoSave$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formularioService: FormularioService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.formularioId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.formularioId;

    // Auto-save pipeline: espera 2s desde el último cambio
    this.autoSave$
      .pipe(debounceTime(2000), takeUntil(this.destroy$))
      .subscribe(() => this.autoSave());

    // Ocultar spinner para que el *ngIf renderice el div antes de inicializar
    this.isLoading = false;
    this.cdr.detectChanges();
    setTimeout(() => this.initEditor(), 50);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  private initEditor(): void {
    if (!this.containerRef?.nativeElement) return;

    this.editor = new FormEditor({
      container: this.containerRef.nativeElement
    });

    const onChanged = () => {
      this.isDirty = true;
      this.autoSave$.next();
      this.cdr.detectChanges();
    };

    this.editor.on('changed', onChanged);

    if (this.isEditMode && this.formularioId) {
      this.formularioService.getById(this.formularioId).subscribe({
        next: (f) => {
          const schema = f.formJsSchema ?? EMPTY_SCHEMA;
          this.editor!.importSchema(schema).catch((err: unknown) => {
            console.error('[FormBuilder] Error importando schema:', err);
          });
        },
        error: (err: { error?: { message?: string } }) => {
          console.error('[FormBuilder] Error cargando formulario:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al cargar el formulario',
            'Cerrar',
            { duration: 4000 }
          );
          this.router.navigate(['/forms']);
        }
      });
    } else {
      this.editor.importSchema(EMPTY_SCHEMA).catch((err: unknown) => {
        console.error('[FormBuilder] Error inicializando schema vacío:', err);
      });
    }
  }

  saveNow(): void {
    if (!this.editor || this.isSaving) return;

    const schema = this.editor.exportSchema();
    this.isSaving = true;
    this.cdr.detectChanges();

    if (this.isEditMode && this.formularioId) {
      this.formularioService
        .update(this.formularioId, { formJsSchema: schema })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.isDirty = false;
            this.snackBar.open('Guardado', '', { duration: 2000 });
            this.cdr.detectChanges();
          },
          error: (err: { error?: { message?: string } }) => {
            this.isSaving = false;
            console.error('[FormBuilder] Error guardando:', err);
            this.snackBar.open(
              err?.error?.message || 'Error al guardar el formulario',
              'Cerrar',
              { duration: 4000 }
            );
            this.cdr.detectChanges();
          }
        });
    } else {
      // Modo crear: primero crea el formulario, luego guarda el schema
      this.formularioService
        .create({ nombre: 'Nuevo formulario', descripcion: '', secciones: [] })
        .subscribe({
          next: (f) => {
            this.formularioId = f.id;
            this.isEditMode = true;

            this.formularioService
              .update(f.id, { formJsSchema: schema })
              .subscribe({
                next: () => {
                  this.isSaving = false;
                  this.isDirty = false;
                  this.snackBar.open('Formulario creado', '', { duration: 2000 });
                  this.router.navigate(['/forms', f.id, 'edit']);
                  this.cdr.detectChanges();
                },
                error: (err: { error?: { message?: string } }) => {
                  this.isSaving = false;
                  console.error('[FormBuilder] Error guardando schema nuevo:', err);
                  this.snackBar.open(
                    err?.error?.message || 'Error al guardar el schema',
                    'Cerrar',
                    { duration: 4000 }
                  );
                  this.cdr.detectChanges();
                }
              });
          },
          error: (err: { error?: { message?: string } }) => {
            this.isSaving = false;
            console.error('[FormBuilder] Error creando formulario:', err);
            this.snackBar.open(
              err?.error?.message || 'Error al crear el formulario',
              'Cerrar',
              { duration: 4000 }
            );
            this.cdr.detectChanges();
          }
        });
    }
  }

  private autoSave(): void {
    if (!this.editor || !this.isEditMode || !this.formularioId) return;

    const schema = this.editor.exportSchema();
    this.formularioService
      .update(this.formularioId, { formJsSchema: schema })
      .subscribe({
        next: () => {
          this.isDirty = false;
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          console.error('[FormBuilder] Auto-save falló:', err);
        }
      });
  }
}

interface FormularioResponse {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  secciones: unknown[];
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  formJsSchema?: object;
}
