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
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';

import { Form } from '@bpmn-io/form-js-viewer';
import { FormularioService } from '../../shared/services/formulario.service';
import { FormularioResponse } from '../../shared/models/formulario.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-form-detail',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatChipsModule,
    MatExpansionModule
  ],
  template: `
    <div class="formjs-shell">
      <!-- Top bar -->
      <div class="formjs-top-bar">
        <button
          mat-icon-button
          routerLink="/forms"
          matTooltip="Volver a formularios"
          aria-label="Volver a formularios">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="formjs-title">{{ formulario?.nombre || 'Formulario' }}</span>
        <div class="formjs-spacer"></div>

        <ng-container *ngIf="formulario">
          <button
            mat-stroked-button
            class="btn-edit"
            (click)="goToEdit()"
            aria-label="Editar formulario">
            <mat-icon>edit</mat-icon>
            Editar
          </button>
          <button
            mat-stroked-button
            class="btn-delete"
            (click)="eliminar()"
            matTooltip="Eliminar formulario"
            aria-label="Eliminar formulario">
            <mat-icon>delete</mat-icon>
          </button>
        </ng-container>
      </div>

      <!-- Cuerpo -->
      <div class="formjs-body" *ngIf="!isLoading; else loadingTpl">

        <!-- Vista form-js viewer -->
        <ng-container *ngIf="hasFormJsSchema; else legacyTpl">
          <div #formjsContainer class="formjs-canvas"></div>
        </ng-container>

        <!-- Vista legacy: lista de campos del schema antiguo -->
        <ng-template #legacyTpl>
          <div class="legacy-container">
            <div class="legacy-info-banner">
              <mat-icon>info</mat-icon>
              <span>
                Este formulario usa el esquema legacy.
                Ábrelo en el editor para migrarlo a form-js.
              </span>
              <button mat-stroked-button (click)="goToEdit()">
                <mat-icon>edit</mat-icon>
                Migrar en editor
              </button>
            </div>

            <ng-container *ngIf="formulario">
              <mat-accordion *ngIf="formulario.secciones.length > 0; else emptySecciones">
                <mat-expansion-panel
                  *ngFor="let sec of formulario.secciones; let i = index"
                  [expanded]="i === 0">
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{ sec.titulo }}</mat-panel-title>
                    <mat-panel-description>
                      {{ sec.campos.length }} campo{{ sec.campos.length !== 1 ? 's' : '' }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="legacy-campos-list">
                    <div *ngFor="let campo of sec.campos" class="legacy-campo-item">
                      <div class="legacy-campo-header">
                        <span class="legacy-campo-etiqueta">{{ campo.etiqueta }}</span>
                        <mat-chip class="chip-tipo">{{ campo.tipo }}</mat-chip>
                        <mat-chip *ngIf="campo.obligatorio" class="chip-required">Obligatorio</mat-chip>
                      </div>
                      <div class="legacy-campo-meta">
                        <span><strong>Nombre técnico:</strong> {{ campo.nombre }}</span>
                        <span *ngIf="campo.placeholder"><strong>Placeholder:</strong> {{ campo.placeholder }}</span>
                        <span *ngIf="campo.opciones?.length">
                          <strong>Opciones:</strong> {{ campo.opciones!.join(', ') }}
                        </span>
                      </div>
                    </div>
                    <div *ngIf="sec.campos.length === 0" class="legacy-empty-campos">
                      Sin campos configurados
                    </div>
                  </div>
                </mat-expansion-panel>
              </mat-accordion>

              <ng-template #emptySecciones>
                <div class="legacy-empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>Este formulario no tiene secciones configuradas</p>
                </div>
              </ng-template>
            </ng-container>
          </div>
        </ng-template>
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

    .btn-edit {
      color: white !important;
      border-color: rgba(255, 255, 255, 0.5) !important;
    }

    .btn-delete {
      color: #fca5a5 !important;
      border-color: rgba(252, 165, 165, 0.5) !important;
      min-width: 40px;
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
      overflow: auto;
    }

    .formjs-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    /* form-js viewer fill */
    .formjs-canvas .fjs-container,
    .formjs-canvas .fjs-form {
      height: 100% !important;
    }

    /* Legacy view */
    .legacy-container {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .legacy-info-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      color: #1e40af;
      flex-wrap: wrap;
    }

    .legacy-info-banner mat-icon {
      color: #3b82f6;
      flex-shrink: 0;
    }

    .legacy-info-banner span {
      flex: 1;
      font-size: 14px;
    }

    .legacy-campos-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }

    .legacy-campo-item {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      padding: 12px;
    }

    .legacy-campo-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .legacy-campo-etiqueta {
      font-weight: 500;
      font-size: 14px;
      flex: 1;
    }

    .chip-tipo {
      background-color: #e3f2fd !important;
      color: #1565c0 !important;
      font-size: 11px !important;
    }

    .chip-required {
      background-color: #fce4ec !important;
      color: #c62828 !important;
      font-size: 11px !important;
    }

    .legacy-campo-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .legacy-campo-meta span {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .legacy-empty-campos {
      text-align: center;
      color: #888;
      padding: 16px;
      font-size: 13px;
    }

    .legacy-empty-state {
      text-align: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.4);
    }

    .legacy-empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
  `]
})
export class FormDetailComponent implements OnInit, OnDestroy {
  @ViewChild('formjsContainer') containerRef!: ElementRef<HTMLDivElement>;

  formulario: FormularioResponse | null = null;
  isLoading = true;
  hasFormJsSchema = false;

  private viewer: Form | null = null;
  private formJsSchemaData: object | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formularioService: FormularioService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/forms']);
      return;
    }

    this.formularioService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (f) => {
        this.formulario = f;
        const schema = f.formJsSchema;
        this.hasFormJsSchema = !!schema;
        this.formJsSchemaData = schema ?? null;

        // Ocultar spinner para que el *ngIf renderice el div antes de inicializar
        this.isLoading = false;
        this.cdr.detectChanges();

        if (this.hasFormJsSchema) {
          setTimeout(() => this.initViewer(), 50);
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading = false;
        console.error('[FormDetail] Error cargando formulario:', err);
        this.snackBar.open(
          err?.error?.message || 'Error al cargar el formulario',
          'Cerrar',
          { duration: 4000 }
        );
        this.router.navigate(['/forms']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }

  private initViewer(): void {
    if (!this.containerRef?.nativeElement || !this.formJsSchemaData) return;

    this.viewer = new Form({
      container: this.containerRef.nativeElement
    });

    this.viewer.importSchema(this.formJsSchemaData).catch((err: unknown) => {
      console.error('[FormDetail] Error importando schema en viewer:', err);
    });
  }

  goToEdit(): void {
    if (!this.formulario) return;
    this.router.navigate(['/forms', this.formulario.id, 'edit']);
  }

  eliminar(): void {
    if (!this.formulario) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar formulario',
        message: `¿Confirmas que quieres eliminar el formulario "${this.formulario.nombre}"?`
      },
      width: '420px'
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed || !this.formulario) return;
      this.formularioService.delete(this.formulario.id).subscribe({
        next: () => {
          this.snackBar.open('Formulario eliminado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/forms']);
        },
        error: (err: { error?: { message?: string } }) => {
          console.error('[FormDetail] Error eliminando:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al eliminar',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
    });
  }
}
