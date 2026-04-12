import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl
} from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { FormularioService } from '../../shared/services/formulario.service';
import { TipoCampo } from '../../shared/models/formulario.model';

const TIPOS_CAMPO: TipoCampo[] = [
  'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'TEXTAREA', 'FILE', 'EMAIL'
];

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEditMode ? 'Editar Formulario' : 'Nuevo Formulario' }}</h1>
      <button mat-button routerLink="/forms">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
    </div>

    <div *ngIf="isLoading" class="loading-container">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <form [formGroup]="form" novalidate *ngIf="!isLoading">

      <mat-card class="header-card">
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre *</mat-label>
              <input matInput formControlName="nombre" placeholder="Ej: Solicitud de crédito" />
              <mat-error *ngIf="form.get('nombre')?.hasError('required')">Campo obligatorio</mat-error>
              <mat-error *ngIf="form.get('nombre')?.hasError('maxlength')">Máximo 120 caracteres</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripcion</mat-label>
              <textarea matInput formControlName="descripcion" rows="2" placeholder="Descripción del formulario..."></textarea>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="secciones-header">
        <h2>Secciones</h2>
        <button mat-stroked-button color="primary" type="button" (click)="agregarSeccion()">
          <mat-icon>add</mat-icon>
          Agregar sección
        </button>
      </div>

      <div *ngIf="secciones.length === 0" class="empty-secciones">
        <mat-icon>layers</mat-icon>
        <p>Agrega al menos una sección para continuar</p>
      </div>

      <mat-accordion formArrayName="secciones">
        <mat-expansion-panel
          *ngFor="let seccion of secciones.controls; let si = index"
          [formGroupName]="si"
          [expanded]="si === seccionExpandida">

          <mat-expansion-panel-header (click)="seccionExpandida = si">
            <mat-panel-title>
              {{ seccion.get('titulo')?.value || 'Sección ' + (si + 1) }}
            </mat-panel-title>
            <mat-panel-description>
              {{ getCamposArray(si).length }} campo{{ getCamposArray(si).length !== 1 ? 's' : '' }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="seccion-body">
            <div class="seccion-titulo-row">
              <mat-form-field appearance="outline" class="titulo-field">
                <mat-label>Título de la sección</mat-label>
                <input matInput formControlName="titulo" placeholder="Ej: Datos personales" />
                <mat-error *ngIf="seccion.get('titulo')?.hasError('required')">Obligatorio</mat-error>
              </mat-form-field>
              <button
                mat-icon-button
                color="warn"
                type="button"
                (click)="eliminarSeccion(si)"
                matTooltip="Eliminar sección">
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <mat-divider></mat-divider>

            <div class="campos-container" formArrayName="campos">
              <div
                *ngFor="let campo of getCamposArray(si).controls; let ci = index"
                [formGroupName]="ci"
                class="campo-card">

                <div class="campo-drag-handle" matTooltip="Orden visual">
                  <mat-icon>drag_handle</mat-icon>
                  <span class="campo-numero">#{{ ci + 1 }}</span>
                </div>

                <div class="campo-fields">
                  <div class="campo-row-top">
                    <mat-form-field appearance="outline" class="campo-etiqueta-field">
                      <mat-label>Etiqueta</mat-label>
                      <input
                        matInput
                        formControlName="etiqueta"
                        placeholder="Label visible"
                        (blur)="autoGenerarNombre(si, ci)" />
                      <mat-error *ngIf="campo.get('etiqueta')?.hasError('required')">Obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="campo-nombre-field">
                      <mat-label>Nombre técnico</mat-label>
                      <input matInput formControlName="nombre" placeholder="nombre_tecnico" />
                      <mat-error *ngIf="campo.get('nombre')?.hasError('required')">Obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="campo-tipo-field">
                      <mat-label>Tipo</mat-label>
                      <mat-select formControlName="tipo">
                        <mat-option *ngFor="let tipo of tiposCampo" [value]="tipo">{{ tipo }}</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-slide-toggle formControlName="obligatorio" color="primary" class="obligatorio-toggle">
                      Obligatorio
                    </mat-slide-toggle>

                    <button
                      mat-icon-button
                      color="warn"
                      type="button"
                      (click)="eliminarCampo(si, ci)"
                      matTooltip="Eliminar campo">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>

                  <div class="campo-row-bottom">
                    <mat-form-field appearance="outline" class="campo-placeholder-field">
                      <mat-label>Placeholder</mat-label>
                      <input matInput formControlName="placeholder" placeholder="Texto de ayuda..." />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="campo-default-field">
                      <mat-label>Valor por defecto</mat-label>
                      <input matInput formControlName="valorDefecto" />
                    </mat-form-field>
                  </div>

                  <div
                    *ngIf="tieneOpciones(si, ci)"
                    class="opciones-container">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Opciones (Enter o coma para agregar)</mat-label>
                      <mat-chip-grid #chipGrid>
                        <mat-chip-row
                          *ngFor="let op of getOpciones(si, ci)"
                          (removed)="removerOpcion(si, ci, op)">
                          {{ op }}
                          <button matChipRemove>
                            <mat-icon>cancel</mat-icon>
                          </button>
                        </mat-chip-row>
                      </mat-chip-grid>
                      <input
                        placeholder="Nueva opción..."
                        [matChipInputFor]="chipGrid"
                        [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                        (matChipInputTokenEnd)="agregarOpcion(si, ci, $event)" />
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <div *ngIf="getCamposArray(si).length === 0" class="no-campos-msg">
                Sin campos. Agrega al menos uno.
              </div>
            </div>

            <button
              mat-stroked-button
              type="button"
              (click)="agregarCampo(si)"
              class="btn-agregar-campo">
              <mat-icon>add</mat-icon>
              Agregar campo
            </button>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <div class="form-actions">
        <button mat-button routerLink="/forms" [disabled]="isSaving">Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          type="button"
          (click)="onSubmit()"
          [disabled]="isSaving || form.invalid || secciones.length === 0">
          <mat-spinner *ngIf="isSaving" diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
          {{ isEditMode ? 'Guardar cambios' : 'Crear formulario' }}
        </button>
      </div>
    </form>
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
    .header-card { margin-bottom: 24px; }
    .form-row { display: flex; flex-direction: column; gap: 0; }
    .full-width { width: 100%; }
    .secciones-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .secciones-header h2 { margin: 0; font-size: 18px; }
    .empty-secciones {
      text-align: center;
      padding: 32px;
      color: rgba(0,0,0,0.4);
      border: 2px dashed rgba(0,0,0,0.15);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .empty-secciones mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .seccion-body { padding: 8px 0; }
    .seccion-titulo-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .titulo-field { flex: 1; }
    .campos-container { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .campo-card {
      display: flex;
      gap: 8px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 6px;
      padding: 12px;
      background: #fafafa;
    }
    .campo-drag-handle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 2px;
      color: rgba(0,0,0,0.3);
      cursor: grab;
      padding-top: 16px;
      min-width: 32px;
    }
    .campo-drag-handle mat-icon { font-size: 20px; }
    .campo-numero { font-size: 10px; font-weight: 600; }
    .campo-fields { flex: 1; display: flex; flex-direction: column; gap: 0; }
    .campo-row-top {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .campo-etiqueta-field { flex: 2; min-width: 160px; }
    .campo-nombre-field { flex: 2; min-width: 160px; }
    .campo-tipo-field { flex: 1; min-width: 120px; }
    .obligatorio-toggle { white-space: nowrap; }
    .campo-row-bottom {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .campo-placeholder-field { flex: 1; min-width: 160px; }
    .campo-default-field { flex: 1; min-width: 160px; }
    .opciones-container { margin-top: 4px; }
    .no-campos-msg {
      text-align: center;
      font-size: 13px;
      color: rgba(0,0,0,0.4);
      padding: 12px;
    }
    .btn-agregar-campo { margin-top: 8px; width: 100%; }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
  `]
})
export class FormBuilderComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  formularioId: string | null = null;
  seccionExpandida = 0;

  readonly tiposCampo: TipoCampo[] = TIPOS_CAMPO;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  // Mapa local de opciones: clave "si_ci" -> string[]
  private opcionesMap: Record<string, string[]> = {};

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private formularioService: FormularioService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      descripcion: [''],
      secciones: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.formularioId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.formularioId;

    if (this.isEditMode && this.formularioId) {
      this.isLoading = true;
      this.formularioService.getById(this.formularioId).subscribe({
        next: (f) => {
          this.form.patchValue({ nombre: f.nombre, descripcion: f.descripcion });
          f.secciones.forEach((sec, si) => {
            const secGroup = this.crearSeccionGroup(sec.titulo);
            (secGroup.get('campos') as FormArray).clear();
            sec.campos.forEach((campo, ci) => {
              const key = `${si}_${ci}`;
              this.opcionesMap[key] = campo.opciones ? [...campo.opciones] : [];
              (secGroup.get('campos') as FormArray).push(this.crearCampoGroup({
                etiqueta: campo.etiqueta,
                nombre: campo.nombre,
                tipo: campo.tipo,
                obligatorio: campo.obligatorio,
                placeholder: campo.placeholder ?? '',
                valorDefecto: campo.valorDefecto ?? ''
              }));
            });
            this.secciones.push(secGroup);
          });
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open(err?.error?.message || 'Error al cargar el formulario', 'Cerrar', { duration: 4000 });
          this.router.navigate(['/forms']);
        }
      });
    }
  }

  get secciones(): FormArray {
    return this.form.get('secciones') as FormArray;
  }

  getCamposArray(si: number): FormArray {
    return this.secciones.at(si).get('campos') as FormArray;
  }

  private crearSeccionGroup(titulo = ''): FormGroup {
    return this.fb.group({
      titulo: [titulo, Validators.required],
      campos: this.fb.array([])
    });
  }

  private crearCampoGroup(defaults?: Partial<{
    etiqueta: string; nombre: string; tipo: TipoCampo;
    obligatorio: boolean; placeholder: string; valorDefecto: string;
  }>): FormGroup {
    return this.fb.group({
      etiqueta: [defaults?.etiqueta ?? '', Validators.required],
      nombre: [defaults?.nombre ?? '', Validators.required],
      tipo: [defaults?.tipo ?? 'TEXT'],
      obligatorio: [defaults?.obligatorio ?? false],
      placeholder: [defaults?.placeholder ?? ''],
      valorDefecto: [defaults?.valorDefecto ?? '']
    });
  }

  agregarSeccion(): void {
    this.secciones.push(this.crearSeccionGroup());
    this.seccionExpandida = this.secciones.length - 1;
  }

  eliminarSeccion(si: number): void {
    this.secciones.removeAt(si);
    // Limpiar opciones de esa sección del mapa
    const keysToDelete = Object.keys(this.opcionesMap).filter(k => k.startsWith(`${si}_`));
    keysToDelete.forEach(k => delete this.opcionesMap[k]);
  }

  agregarCampo(si: number): void {
    this.getCamposArray(si).push(this.crearCampoGroup());
  }

  eliminarCampo(si: number, ci: number): void {
    delete this.opcionesMap[`${si}_${ci}`];
    this.getCamposArray(si).removeAt(ci);
  }

  autoGenerarNombre(si: number, ci: number): void {
    const campoGroup = this.getCamposArray(si).at(ci) as FormGroup;
    if (campoGroup.get('nombre')?.value) return;
    const etiqueta: string = campoGroup.get('etiqueta')?.value ?? '';
    const nombreTecnico = etiqueta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    campoGroup.get('nombre')?.setValue(nombreTecnico);
  }

  tieneOpciones(si: number, ci: number): boolean {
    const tipo = this.getCamposArray(si).at(ci).get('tipo')?.value;
    return tipo === 'SELECT' || tipo === 'MULTISELECT';
  }

  getOpciones(si: number, ci: number): string[] {
    return this.opcionesMap[`${si}_${ci}`] ?? [];
  }

  agregarOpcion(si: number, ci: number, event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    const key = `${si}_${ci}`;
    if (value) {
      if (!this.opcionesMap[key]) this.opcionesMap[key] = [];
      if (!this.opcionesMap[key].includes(value)) {
        this.opcionesMap[key] = [...this.opcionesMap[key], value];
      }
    }
    event.chipInput!.clear();
  }

  removerOpcion(si: number, ci: number, op: string): void {
    const key = `${si}_${ci}`;
    this.opcionesMap[key] = (this.opcionesMap[key] ?? []).filter(o => o !== op);
  }

  onSubmit(): void {
    if (this.form.invalid || this.secciones.length === 0) return;

    // Validar que cada sección tiene al menos 1 campo
    for (let si = 0; si < this.secciones.length; si++) {
      if (this.getCamposArray(si).length === 0) {
        this.snackBar.open(`La sección "${this.secciones.at(si).get('titulo')?.value || si + 1}" no tiene campos`, 'Cerrar', { duration: 4000 });
        this.seccionExpandida = si;
        return;
      }
    }

    this.isSaving = true;
    const val = this.form.value;

    const seccionesPayload = val.secciones.map((sec: any, si: number) => ({
      titulo: sec.titulo,
      orden: si + 1,
      campos: sec.campos.map((campo: any, ci: number) => ({
        nombre: campo.nombre,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        obligatorio: campo.obligatorio,
        orden: ci + 1,
        placeholder: campo.placeholder || undefined,
        valorDefecto: campo.valorDefecto || undefined,
        opciones: this.tieneOpciones(si, ci) ? this.getOpciones(si, ci) : undefined
      }))
    }));

    const payload = {
      nombre: val.nombre,
      descripcion: val.descripcion,
      secciones: seccionesPayload
    };

    const request$ = this.isEditMode && this.formularioId
      ? this.formularioService.update(this.formularioId, payload)
      : this.formularioService.create(payload);

    request$.subscribe({
      next: (result) => {
        this.isSaving = false;
        const msg = this.isEditMode ? 'Formulario actualizado' : 'Formulario creado correctamente';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.router.navigate(['/forms', result.id]);
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err?.error?.message || 'Error al guardar el formulario', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
