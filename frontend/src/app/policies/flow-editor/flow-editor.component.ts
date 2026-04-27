import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ViewEncapsulation, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, takeUntil, interval, firstValueFrom } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { PoliticaService } from '../../shared/services/politica.service';
import { RoleService } from '../../shared/services/role.service';
import { ActividadService } from '../../shared/services/actividad.service';
import { DepartmentService } from '../../shared/services/department.service';
import { UserService } from '../../shared/services/user.service';
import { AiService } from '../../shared/services/ai.service';
import { AuthService } from '../../shared/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Politica } from '../../shared/models/politica.model';
import { Actividad, AccionPermitida, CampoActividad, Transicion } from '../../shared/models/actividad.model';
import { CollaborationService } from '../../shared/services/collaboration.service';
import { Collaborator } from '../../shared/models/collaborator.model';
import { BpmnUpdate } from '../../shared/services/collaboration.service';
import { ChatMessage } from '../../shared/models/bpmn-command.model';
import { WorkflowGenerateResponse } from '../../shared/models/workflow-generate.model';

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
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    HttpClientModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatDividerModule, MatChipsModule, MatDialogModule,
    MatSlideToggleModule
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
            [matTooltip]="!isEditable ? '' : 'Clic para editar nombre'">
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

    <!-- Collaboration presence -->
    <div class="collab-presence" *ngIf="collaborators.length > 0">
      <div class="collab-avatar-stack">
        <div class="collab-avatar"
             *ngFor="let c of collaborators.slice(0, 5); let i = index"
             [style.background]="c.color"
             [style.z-index]="10 - i"
             [class.collab-avatar--self]="c.email === currentUserEmail"
             [matTooltip]="c.email === currentUserEmail ? c.nombreCompleto + ' (tú)' : c.nombreCompleto"
             matTooltipPosition="below">
          {{ getCollabInitials(c.nombreCompleto) }}
          <span class="collab-avatar-dot"></span>
        </div>
        <div class="collab-avatar collab-avatar--overflow"
             *ngIf="collaborators.length > 5"
             [matTooltip]="'+' + (collaborators.length - 5) + ' más conectados'"
             matTooltipPosition="below">
          +{{ collaborators.length - 5 }}
        </div>
      </div>
      <span class="collab-label">
        <span class="collab-dot-live"></span>
        {{ collaborators.length === 1 ? '1 conectado' : collaborators.length + ' conectados' }}
      </span>
    </div>

    <!-- Dirty indicator -->
    <span *ngIf="isDirty && isEditable" class="bpmn-dirty-indicator" matTooltip="Cambios sin guardar">
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
            *ngIf="isEditable"
            [style.color]="simulationActive ? '#fbbf24' : ''"
            (click)="toggleSimulation()"
            matTooltip="Simulación de tokens (play/pause)">
      <mat-icon>{{ simulationActive ? 'stop_circle' : 'play_circle' }}</mat-icon>
    </button>

    <!-- Botón AI Chat (solo editable) -->
    <button mat-icon-button
            *ngIf="isEditable"
            [style.color]="showAiPanel ? '#a78bfa' : ''"
            (click)="toggleAiPanel()"
            matTooltip="Asistente IA (modifica el diagrama con comandos)">
      <mat-icon>smart_toy</mat-icon>
    </button>

    <button mat-icon-button (click)="importBpmn()" matTooltip="Importar .bpmn"
            *ngIf="isEditable">
      <mat-icon>upload_file</mat-icon>
    </button>
    <button mat-icon-button (click)="exportBpmn()" matTooltip="Exportar .bpmn">
      <mat-icon>download</mat-icon>
    </button>
    <button mat-icon-button (click)="exportSvg()" matTooltip="Exportar imagen SVG">
      <mat-icon>image</mat-icon>
    </button>
    <button mat-raised-button color="primary"
            *ngIf="isEditable"
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

    <!-- AI CHAT PANEL -->
    <div class="bpmn-ai-panel" *ngIf="showAiPanel">
      <div class="ai-panel-header">
        <mat-icon style="color:#a78bfa;font-size:18px;width:18px;height:18px">smart_toy</mat-icon>
        <span>Asistente IA</span>
        <button mat-icon-button class="ai-panel-close" (click)="toggleAiPanel()" matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── GENERAR WORKFLOW ── -->
      <ng-container>
        <div class="ai-gen-body">

          <!-- Proveedor -->
          <div class="ai-gen-field-group">
            <label class="ai-gen-label" for="ai-proveedor">Proveedor</label>
            <select id="ai-proveedor"
                    class="ai-gen-select"
                    [(ngModel)]="aiProveedor"
                    [disabled]="isGenerating || isApplying"
                    aria-label="Seleccionar proveedor de IA">
              <option value="claude">Claude (recomendado)</option>
              <option value="groq">Groq (gratis)</option>
            </select>
          </div>

          <!-- Prompt -->
          <div class="ai-gen-field-group">
            <label class="ai-gen-label" for="ai-gen-prompt">Describe el proceso de negocio</label>
            <div class="ai-gen-prompt-wrap">
              <textarea id="ai-gen-prompt"
                        class="ai-gen-textarea"
                        [(ngModel)]="aiGeneratePrompt"
                        placeholder="Ej: Proceso de solicitud de vacaciones con aprobacion del supervisor y validacion de RRHH..."
                        [disabled]="isGenerating || isApplying"
                        rows="5"
                        aria-label="Descripcion del proceso de negocio"></textarea>
              <button mat-icon-button class="ai-gen-mic-btn"
                      [class.ai-mic-active]="isListeningGen"
                      [style.color]="isListeningGen ? '#ef4444' : '#a78bfa'"
                      (click)="toggleVoiceInputGen()"
                      [matTooltip]="isListeningGen ? 'Detener grabación' : 'Describir por voz'"
                      [disabled]="isGenerating || isApplying"
                      type="button">
                <mat-icon>{{ isListeningGen ? 'mic_off' : 'mic' }}</mat-icon>
              </button>
            </div>
          </div>

          <!-- Boton generar -->
          <button class="ai-gen-btn"
                  (click)="generateWorkflow()"
                  [disabled]="isGenerating || isApplying || !aiGeneratePrompt.trim()"
                  aria-label="Generar workflow con IA">
            <mat-spinner *ngIf="isGenerating" diameter="14" style="display:inline-flex"></mat-spinner>
            <mat-icon *ngIf="!isGenerating">auto_fix_high</mat-icon>
            {{ isGenerating ? 'Generando...' : 'Generar workflow' }}
          </button>

          <!-- Preview del workflow generado -->
          <div *ngIf="generatedWorkflow" class="ai-gen-preview">
            <div class="ai-gen-preview-header">
              <mat-icon style="color:#86efac;font-size:16px;width:16px;height:16px">check_circle</mat-icon>
              <span>Workflow generado</span>
            </div>

            <div class="ai-gen-preview-row">
              <span class="ai-gen-preview-key">Nombre</span>
              <span class="ai-gen-preview-val">{{ generatedWorkflow.politicaNombre }}</span>
            </div>

            <div class="ai-gen-preview-row" *ngIf="generatedWorkflow.departamentos.length > 0">
              <span class="ai-gen-preview-key">Departamentos</span>
              <div class="ai-gen-chips">
                <span *ngFor="let d of generatedWorkflow.departamentos" class="ai-gen-chip">{{ d.nombre }}</span>
              </div>
            </div>

            <div class="ai-gen-preview-row" *ngIf="generatedWorkflow.actividades.length > 0">
              <span class="ai-gen-preview-key">Actividades</span>
              <div class="ai-gen-acts">
                <div *ngFor="let a of generatedWorkflow.actividades" class="ai-gen-act-item">
                  <mat-icon style="font-size:12px;width:12px;height:12px;color:#818cf8;flex-shrink:0">task_alt</mat-icon>
                  <span>{{ a.nombre }}</span>
                  <span class="ai-gen-act-campos" *ngIf="a.campos.length > 0">{{ a.campos.length }} campo{{ a.campos.length !== 1 ? 's' : '' }}</span>
                </div>
              </div>
            </div>

            <!-- Status de apply -->
            <div *ngIf="applyStatus" class="ai-gen-status" aria-live="polite">
              <mat-spinner *ngIf="isApplying" diameter="12" style="display:inline-flex;flex-shrink:0"></mat-spinner>
              <mat-icon *ngIf="!isApplying" style="font-size:13px;width:13px;height:13px;color:#86efac;flex-shrink:0">check</mat-icon>
              <span>{{ applyStatus }}</span>
            </div>

            <!-- Acciones -->
            <div class="ai-gen-actions">
              <button class="ai-gen-apply-btn"
                      (click)="applyGeneratedWorkflow()"
                      [disabled]="isApplying || isGenerating"
                      aria-label="Aplicar workflow generado al editor">
                <mat-spinner *ngIf="isApplying" diameter="14" style="display:inline-flex"></mat-spinner>
                <mat-icon *ngIf="!isApplying">rocket_launch</mat-icon>
                {{ isApplying ? 'Aplicando...' : 'Aplicar workflow' }}
              </button>
              <button class="ai-gen-discard-btn"
                      (click)="generatedWorkflow = null; applyStatus = ''"
                      [disabled]="isApplying"
                      aria-label="Descartar workflow generado">
                <mat-icon>delete_outline</mat-icon>
                Descartar
              </button>
            </div>

            <!-- Refinar workflow -->
            <div class="ai-gen-refine" *ngIf="generatedWorkflow && !isApplying">
              <div class="ai-gen-refine-label">Refinar resultado</div>
              <textarea class="ai-textarea ai-gen-refine-input"
                        [(ngModel)]="aiRefinePrompt"
                        placeholder='Ej: "simplifica a 3 pasos" o "agrega validación de documentos"'
                        [disabled]="isRefining"
                        rows="2"></textarea>
              <button class="ai-gen-apply-btn ai-gen-refine-btn"
                      (click)="refineWorkflow()"
                      [disabled]="isRefining || !aiRefinePrompt.trim()">
                <mat-spinner *ngIf="isRefining" diameter="14" style="display:inline-flex"></mat-spinner>
                <mat-icon *ngIf="!isRefining">tune</mat-icon>
                {{ isRefining ? 'Refinando...' : 'Refinar' }}
              </button>
            </div>
          </div>

        </div>
      </ng-container>

    </div>

    <!-- Canvas bpmn-js -->
    <div class="bpmn-canvas-wrap">
      <div #bpmnCanvas class="bpmn-canvas"></div>

      <!-- Panel propiedades UserTask — Sprint 3.5 -->
      <div class="task-props-panel"
           *ngIf="selectedElement && isEditable"
           role="complementary"
           aria-label="Propiedades del paso seleccionado">

        <!-- Header -->
        <div class="task-props-header">
          <mat-icon aria-hidden="true">tune</mat-icon>
          <div class="task-props-header-text">
            <span class="task-props-title">Propiedades del Paso</span>
            <span class="task-props-subtitle" *ngIf="selectedElementName">{{ selectedElementName }}</span>
          </div>
          <button mat-icon-button
                  (click)="closePropertiesPanel()"
                  class="task-props-close"
                  aria-label="Cerrar panel de propiedades">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Loading overlay while saving -->
        <div class="task-props-saving" *ngIf="isSavingProps" aria-live="polite" aria-label="Guardando propiedades">
          <mat-spinner diameter="20"></mat-spinner>
          <span>Guardando...</span>
        </div>

        <!-- Form body — scrollable -->
        <div class="task-props-body" [formGroup]="propsForm"
             id="tab-props" role="tabpanel">

          <!-- Nombre -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Nombre del paso</mat-label>
            <input matInput
                   formControlName="nombre"
                   placeholder="Ej: Validar solicitud"
                   autocomplete="off" />
          </mat-form-field>

          <!-- Descripción -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Descripción</mat-label>
            <textarea matInput
                      formControlName="descripcion"
                      rows="3"
                      placeholder="Instrucciones para el responsable..."
                      style="resize:none"></textarea>
          </mat-form-field>

          <div class="task-props-section-divider">Asignación</div>

          <!-- Área (departamento) -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Área responsable</mat-label>
            <mat-select formControlName="area"
                        (selectionChange)="onAreaChange($event.value)"
                        aria-label="Área responsable">
              <mat-option value="">Sin área específica</mat-option>
              <mat-option *ngFor="let d of departmentsList" [value]="d.id">{{ d.nombre }}</mat-option>
            </mat-select>
            <mat-progress-spinner *ngIf="isLoadingDepts"
                                  matSuffix
                                  diameter="16"
                                  mode="indeterminate"
                                  style="display:inline-flex;margin-right:8px">
            </mat-progress-spinner>
          </mat-form-field>

          <!-- Cargo requerido -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Cargo requerido</mat-label>
            <mat-select *ngIf="cargosList.length > 0; else cargoInput"
                        formControlName="cargoRequerido"
                        aria-label="Cargo requerido">
              <mat-option value="">Sin cargo específico</mat-option>
              <mat-option *ngFor="let c of cargosList" [value]="c">{{ c }}</mat-option>
            </mat-select>
            <ng-template #cargoInput>
              <input matInput
                     formControlName="cargoRequerido"
                     placeholder="Ej: Supervisor, Técnico..."
                     autocomplete="off" />
            </ng-template>
            <mat-hint *ngIf="cargosList.length === 0 && propsForm.get('area')?.value">
              Selecciona un área para filtrar cargos
            </mat-hint>
          </mat-form-field>

          <div class="task-props-section-divider">SLA</div>

          <!-- SLA horas -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>SLA (horas)</mat-label>
            <input matInput
                   type="number"
                   formControlName="slaHoras"
                   placeholder="Ej: 24"
                   min="1"
                   max="8760" />
            <mat-hint>Tiempo máximo para completar este paso</mat-hint>
          </mat-form-field>

          <div class="task-props-section-divider">Acciones permitidas</div>

          <!-- Acciones permitidas -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Acciones disponibles</mat-label>
            <mat-select formControlName="accionesPermitidas"
                        multiple
                        aria-label="Acciones disponibles para el responsable">
              <mat-option value="APROBAR">Aprobar</mat-option>
              <mat-option value="RECHAZAR">Rechazar</mat-option>
              <mat-option value="DEVOLVER">Devolver</mat-option>
              <mat-option value="ESCALAR">Escalar</mat-option>
              <mat-option value="OBSERVAR">Observar</mat-option>
              <mat-option value="DENEGAR">Denegar</mat-option>
            </mat-select>
            <mat-hint>Selecciona las acciones que puede tomar el responsable</mat-hint>
          </mat-form-field>

          <!-- ── Campos del formulario ── -->
          <div class="campos-section-header">
            <span class="task-props-section-divider" style="padding:0">Campos del formulario</span>
            <span *ngIf="formCampos.length > 0" class="campos-count-badge">{{ formCampos.length }}</span>
          </div>

          <div class="campos-list">

            <!-- Empty state -->
            <div *ngIf="formCampos.length === 0" class="campos-empty">
              <mat-icon class="campos-empty-icon">dynamic_form</mat-icon>
              <span>Sin campos definidos</span>
              <span style="font-size:10px;color:#bbb">Agrega campos para el formulario</span>
            </div>

            <!-- Campo card -->
            <div *ngFor="let c of formCampos; let i = index" class="campo-card">

              <!-- Card header -->
              <div class="campo-card-header">
                <div class="campo-card-num">{{ i + 1 }}</div>
                <span class="campo-card-tipo-badge campo-tipo-{{ c.tipo.toLowerCase() }}">
                  {{ tipoLabel(c.tipo) }}
                </span>
                <button mat-icon-button
                        class="campo-card-delete"
                        (click)="removeCampo(i)"
                        [attr.aria-label]="'Eliminar campo ' + (c.label || c.nombre)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <!-- Inputs -->
              <div class="campo-card-body">
                <mat-form-field appearance="outline" class="campo-field">
                  <mat-label>Etiqueta visible</mat-label>
                  <input matInput
                         [(ngModel)]="c.label"
                         [ngModelOptions]="{standalone:true}"
                         placeholder="Ej: Nombre completo"
                         [attr.aria-label]="'Etiqueta del campo ' + (i+1)" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="campo-field">
                  <mat-label>Nombre interno (key)</mat-label>
                  <input matInput
                         [(ngModel)]="c.nombre"
                         [ngModelOptions]="{standalone:true}"
                         placeholder="Ej: nombre_completo"
                         [attr.aria-label]="'Nombre key del campo ' + (i+1)" />
                  <mat-hint>Sin espacios ni caracteres especiales</mat-hint>
                </mat-form-field>

                <div class="campo-row-tipo-req">
                  <mat-form-field appearance="outline" class="campo-field-tipo">
                    <mat-label>Tipo</mat-label>
                    <mat-select [(ngModel)]="c.tipo" [ngModelOptions]="{standalone:true}"
                                [attr.aria-label]="'Tipo del campo ' + (i+1)">
                      <mat-option value="TEXT">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">short_text</mat-icon>
                        Texto
                      </mat-option>
                      <mat-option value="TEXTAREA">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">notes</mat-icon>
                        Área texto
                      </mat-option>
                      <mat-option value="NUMBER">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">tag</mat-icon>
                        Número
                      </mat-option>
                      <mat-option value="DATE">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">calendar_today</mat-icon>
                        Fecha
                      </mat-option>
                      <mat-option value="FILE">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">attach_file</mat-icon>
                        Archivo
                      </mat-option>
                      <mat-option value="SELECT">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">list</mat-icon>
                        Selección
                      </mat-option>
                      <mat-option value="BOOLEAN">
                        <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">toggle_on</mat-icon>
                        Sí / No
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <div class="campo-req-toggle">
                    <mat-slide-toggle
                      color="primary"
                      [(ngModel)]="c.required"
                      [ngModelOptions]="{standalone:true}"
                      [attr.aria-label]="'Campo obligatorio: ' + (c.label || c.nombre)">
                    </mat-slide-toggle>
                    <span class="campo-req-label">Obligatorio</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Agregar -->
            <button mat-stroked-button
                    class="campo-add-btn"
                    (click)="addCampo()"
                    aria-label="Agregar campo al formulario">
              <mat-icon>add_circle_outline</mat-icon>
              Agregar campo
            </button>

          </div>

        </div><!-- /task-props-body -->

        <!-- Footer actions -->
        <div class="task-props-footer">
          <button mat-stroked-button
                  (click)="closePropertiesPanel()"
                  class="task-props-cancel-btn"
                  [disabled]="isSavingProps">
            Cancelar
          </button>
          <button mat-raised-button
                  color="primary"
                  (click)="saveTaskProperties()"
                  class="task-props-save-btn"
                  [disabled]="isSavingProps || propsForm.invalid"
                  aria-label="Guardar propiedades del paso">
            <mat-spinner *ngIf="isSavingProps" diameter="16" style="display:inline-flex;margin-right:4px"></mat-spinner>
            <mat-icon *ngIf="!isSavingProps">save</mat-icon>
            Guardar
          </button>
        </div>

      </div>
    </div>

    <!-- Properties panel (solo BORRADOR) -->
    <div #bpmnProperties class="bpmn-properties"
         [class.bpmn-properties--hidden]="!isEditable">
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="bpmn-status-bar">
    <span class="status-item">
      <mat-icon>info</mat-icon>
      {{ isEditable ? 'Modo edicion' : 'Solo lectura — ' + politica?.estado }}
    </span>
    <span class="status-sep"></span>
    <span class="status-item" *ngIf="lastSaved">
      Guardado: {{ getLastSavedText() }}
    </span>
    <span class="status-item" *ngIf="isDirty && isEditable">
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
      width: 100%;
      height: 100%;
      background: #f0f4f8;
    }
    .bpmn-properties {
      display: none !important;
    }
    .bpmn-properties--hidden {
      display: none !important;
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
    /* ── Collaboration presence ─────────────────────────────── */
    .collab-presence {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 10px 3px 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.15);
      cursor: default;
      flex-shrink: 0;
    }
    .collab-avatar-stack {
      display: flex;
      align-items: center;
    }
    .collab-avatar {
      position: relative;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      margin-left: -8px;
      cursor: default;
      flex-shrink: 0;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .collab-avatar:first-child { margin-left: 0; }
    .collab-avatar:hover {
      transform: translateY(-2px) scale(1.1);
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    }
    /* Borde dorado para "yo" */
    .collab-avatar--self {
      border-color: #fbbf24;
      box-shadow: 0 0 0 1px #fbbf24, 0 1px 4px rgba(0,0,0,0.3);
    }
    /* Desbordamiento "+N" */
    .collab-avatar--overflow {
      background: rgba(255,255,255,0.2) !important;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: -0.5px;
      color: white;
    }
    /* Punto verde "online" en cada avatar */
    .collab-avatar-dot {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      border: 1.5px solid #1e3a8a;
      flex-shrink: 0;
    }
    .collab-avatar--self .collab-avatar-dot {
      border-color: #fbbf24;
    }
    /* Label "N conectados" con punto pulsante */
    .collab-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      white-space: nowrap;
    }
    .collab-dot-live {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      animation: collab-pulse 2s infinite;
      flex-shrink: 0;
    }
    @keyframes collab-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    /* ── AI Chat Panel ───────────────────────────────────────── */
    .bpmn-ai-panel {
      width: 320px;
      min-width: 320px;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #0f172a;
      border-right: 1px solid #1e293b;
      color: #e2e8f0;
      font-size: 13px;
    }
    .ai-panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #1e293b;
      font-weight: 600;
      font-size: 13px;
      border-bottom: 1px solid #334155;
    }
    .ai-panel-header span { flex: 1; }
    .ai-panel-close { color: rgba(255,255,255,0.5) !important; }
    .ai-panel-close:hover { color: white !important; }
    .ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ai-empty-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
      color: #64748b;
      gap: 8px;
    }
    .ai-empty-hint mat-icon { font-size: 32px; width: 32px; height: 32px; color: #4f46e5; }
    .ai-empty-hint p { margin: 0; font-size: 12px; color: #94a3b8; }
    .ai-hint-examples { font-size: 11px !important; line-height: 1.8; }
    .ai-message { display: flex; }
    .ai-message--user { justify-content: flex-end; }
    .ai-message--assistant { justify-content: flex-start; }
    .ai-message-bubble {
      max-width: 90%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.5;
    }
    .ai-message--user .ai-message-bubble {
      background: #3730a3;
      color: #e0e7ff;
      border-bottom-right-radius: 4px;
    }
    .ai-message--assistant .ai-message-bubble {
      background: #1e293b;
      color: #cbd5e1;
      border-bottom-left-radius: 4px;
    }
    .ai-loading-bubble {
      display: flex;
      align-items: center;
      color: #64748b !important;
    }
    .ai-operations {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ai-op-item {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 11px;
      color: #86efac;
    }
    .ai-op-icon {
      font-size: 13px !important;
      width: 13px !important;
      height: 13px !important;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .ai-preview-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .ai-apply-btn {
      flex: 1;
      font-size: 11px !important;
      height: 30px !important;
    }
    .ai-discard-btn {
      flex: 1;
      font-size: 11px !important;
      height: 30px !important;
      color: #94a3b8 !important;
      border-color: #334155 !important;
    }
    .ai-input-area {
      padding: 10px;
      border-top: 1px solid #1e293b;
      background: #0f172a;
    }
    .ai-textarea {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 12px;
      padding: 8px 10px;
      resize: none;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    .ai-textarea:focus { border-color: #6366f1; }
    .ai-textarea::placeholder { color: #475569; }
    .ai-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-input-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
    }
    .ai-input-actions button[mat-icon-button] { color: rgba(255,255,255,0.5); }
    .ai-input-actions button[mat-icon-button]:hover { color: white; }
    .ai-mic-active { animation: pulse 1s infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .ai-send-btn {
      background: #4f46e5 !important;
      color: white !important;
      font-size: 12px !important;
      height: 32px !important;
      min-width: 60px !important;
    }
    .ai-send-btn:disabled { opacity: 0.4 !important; }

    /* ── UserTask Properties Panel — Sprint 3.5 ─────────────── */
    .bpmn-canvas-wrap {
      flex: 1;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    .bpmn-canvas-wrap .bpmn-canvas {
      width: 100%;
      height: 100%;
      background: #f0f4f8;
    }
    .task-props-panel {
      position: absolute;
      right: 0;
      top: 0;
      width: 360px;
      height: 100%;
      background: #f8faff;
      border-left: 1px solid #e0e7ff;
      box-shadow: -6px 0 32px rgba(99,102,241,.13);
      z-index: 100;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    /* Header */
    .task-props-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 12px 14px 16px;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%);
      flex-shrink: 0;
    }
    .task-props-header > mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: rgba(255,255,255,0.9);
      flex-shrink: 0;
    }
    .task-props-header-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .task-props-title {
      font-size: 13px;
      font-weight: 700;
      color: white;
      line-height: 1.2;
      letter-spacing: .01em;
    }
    .task-props-subtitle {
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 3px;
      font-family: monospace;
    }
    .task-props-close {
      width: 30px !important;
      height: 30px !important;
      line-height: 30px !important;
      color: rgba(255,255,255,0.75) !important;
      flex-shrink: 0;
      border-radius: 6px !important;
      background: rgba(255,255,255,0.1) !important;
      transition: background .15s !important;
    }
    .task-props-close:hover {
      color: white !important;
      background: rgba(255,255,255,0.22) !important;
    }
    .task-props-close mat-icon { font-size: 16px; width: 16px; height: 16px; }
    /* Saving indicator */
    .task-props-saving {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: #eef2ff;
      border-bottom: 1px solid #c7d2fe;
      font-size: 12px;
      color: #4338ca;
      flex-shrink: 0;
    }
    /* Scrollable body */
    .task-props-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0 8px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .task-props-body::-webkit-scrollbar { width: 4px; }
    .task-props-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
    /* Section divider label */
    .task-props-section-divider {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6366f1;
      padding: 10px 16px 4px;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .task-props-section-divider::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      background: #6366f1;
      border-radius: 2px;
    }
    /* Form fields */
    .task-props-field {
      width: 100%;
      padding: 0 16px;
      box-sizing: border-box;
    }
    .task-props-field .mat-mdc-form-field-subscript-wrapper {
      padding-bottom: 2px;
    }
    /* Footer */
    .task-props-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #e0e7ff;
      background: #fff;
      flex-shrink: 0;
    }
    .task-props-cancel-btn {
      flex: 1;
      font-size: 13px !important;
      height: 38px !important;
      color: #6b7280 !important;
      border-color: #d1d5db !important;
      border-radius: 8px !important;
    }
    .task-props-save-btn {
      flex: 2;
      font-size: 13px !important;
      height: 38px !important;
      border-radius: 8px !important;
      background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
    }
    /* ── Tab Formulario — Sprint 4.3 ─────────────────────────── */
    .task-props-tabs {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }
    .task-props-tab {
      flex: 1;
      padding: 8px 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #666;
      border-bottom: 2px solid transparent;
      transition: color 0.2s, border-bottom-color 0.2s;
    }
    .task-props-tab:focus-visible {
      outline: 2px solid #1565c0;
      outline-offset: -2px;
    }
    .task-props-tab.active {
      color: #1565c0;
      border-bottom-color: #1565c0;
      font-weight: 500;
    }
    .task-props-form-tab {
      padding: 12px;
      overflow-y: auto;
    }
    .task-props-form-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 16px;
      color: #999;
      text-align: center;
    }
    /* ── Campos del formulario ── */
    .campos-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px 4px;
      margin-top: 4px;
    }
    .campos-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #6366f1;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }
    .campos-list {
      padding: 4px 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .campos-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 20px 8px;
      color: #9ca3af;
      font-size: 11px;
      text-align: center;
    }
    .campos-empty-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #d1d5db;
    }
    /* Card por campo */
    .campo-card {
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
      transition: border-color .15s, box-shadow .15s;
    }
    .campo-card:hover {
      border-color: #a5b4fc;
      box-shadow: 0 2px 8px rgba(99,102,241,.10);
    }
    .campo-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px 6px;
      background: #f8f9ff;
      border-bottom: 1px solid #f0f0f8;
    }
    .campo-card-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #6366f1;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .campo-card-tipo-badge {
      flex: 1;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .05em;
      padding: 2px 8px;
      border-radius: 10px;
      background: #ede9fe;
      color: #6d28d9;
    }
    .campo-tipo-file    { background: #ecfdf5; color: #065f46; }
    .campo-tipo-number  { background: #eff6ff; color: #1e40af; }
    .campo-tipo-date    { background: #fff7ed; color: #92400e; }
    .campo-tipo-select  { background: #fdf4ff; color: #7e22ce; }
    .campo-tipo-boolean { background: #f0fdf4; color: #166534; }
    .campo-tipo-textarea{ background: #f0f9ff; color: #075985; }
    .campo-card-delete {
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
      flex-shrink: 0;
      color: #9ca3af !important;
    }
    .campo-card-delete mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }
    .campo-card-delete:hover { color: #ef4444 !important; }
    .campo-card-body {
      padding: 10px 10px 4px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .campo-field {
      width: 100%;
      font-size: 12px;
    }
    .campo-field .mat-mdc-form-field-infix { padding: 6px 0 !important; min-height: 32px !important; }
    .campo-field .mdc-floating-label { font-size: 12px; }
    .campo-field input.mat-mdc-input-element { font-size: 12px; }
    .campo-row-tipo-req {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .campo-field-tipo {
      flex: 1;
      font-size: 12px;
    }
    .campo-field-tipo .mat-mdc-form-field-infix { padding: 6px 0 !important; min-height: 32px !important; }
    .campo-field-tipo .mdc-floating-label { font-size: 12px; }
    .campo-req-toggle {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .campo-req-label {
      font-size: 9px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
      white-space: nowrap;
    }
    .campo-add-btn {
      width: 100%;
      font-size: 12px !important;
      height: 36px !important;
      border-style: dashed !important;
      border-color: #a5b4fc !important;
      color: #6366f1 !important;
      border-radius: 8px !important;
      margin-top: 2px;
    }
    .campo-add-btn:hover {
      background: #f5f3ff !important;
    }

    /* ── AI Panel mode toggle ─────────────────────────────── */
    .ai-mode-toggle {
      display: flex;
      background: #0a1020;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
    }
    .ai-mode-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 8px 4px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-bottom-color 0.15s, background 0.15s;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .ai-mode-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .ai-mode-btn:hover {
      color: #94a3b8;
      background: rgba(255,255,255,0.04);
    }
    .ai-mode-btn:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: -2px;
    }
    .ai-mode-btn--active {
      color: #a78bfa !important;
      border-bottom-color: #a78bfa !important;
      background: rgba(167,139,250,0.07) !important;
    }
    /* ── AI Generar Workflow mode ─────────────────────────── */
    .ai-gen-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 12px;
      padding-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-gen-body::-webkit-scrollbar { width: 4px; }
    .ai-gen-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
    .ai-gen-field-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .ai-gen-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .ai-gen-select {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 12px;
      padding: 7px 10px;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 28px;
      box-sizing: border-box;
    }
    .ai-gen-select:focus { border-color: #6366f1; }
    .ai-gen-select:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-gen-textarea {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 12px;
      padding: 8px 10px;
      resize: vertical;
      min-height: 90px;
      outline: none;
      font-family: inherit;
      line-height: 1.5;
      box-sizing: border-box;
    }
    .ai-gen-textarea:focus { border-color: #6366f1; }
    .ai-gen-textarea::placeholder { color: #475569; }
    .ai-gen-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-gen-prompt-wrap {
      position: relative;
      display: flex;
    }
    .ai-gen-prompt-wrap .ai-gen-textarea {
      flex: 1;
      padding-right: 36px;
    }
    .ai-gen-mic-btn {
      position: absolute;
      right: 2px;
      bottom: 4px;
      width: 30px !important;
      height: 30px !important;
      line-height: 30px !important;
      padding: 0 !important;
      min-width: 30px !important;
    }
    .ai-gen-mic-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ai-gen-mic-btn.ai-mic-active { animation: ai-mic-pulse 1s infinite; }
    @keyframes ai-mic-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .ai-gen-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 9px 12px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      letter-spacing: 0.02em;
    }
    .ai-gen-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .ai-gen-btn:active:not(:disabled) { transform: translateY(0); }
    .ai-gen-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .ai-gen-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    /* Preview card */
    .ai-gen-preview {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      overflow: hidden;
    }
    .ai-gen-preview-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(134,239,172,0.08);
      border-bottom: 1px solid #334155;
      font-size: 11px;
      font-weight: 700;
      color: #86efac;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ai-gen-preview-row {
      padding: 7px 10px;
      border-bottom: 1px solid #0f172a;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ai-gen-preview-row:last-child { border-bottom: none; }
    .ai-gen-preview-key {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
    }
    .ai-gen-preview-val {
      font-size: 12px;
      color: #e2e8f0;
      font-weight: 500;
    }
    .ai-gen-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }
    .ai-gen-chip {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(99,102,241,0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.3);
      white-space: nowrap;
    }
    .ai-gen-acts {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 2px;
    }
    .ai-gen-act-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #cbd5e1;
    }
    .ai-gen-act-campos {
      margin-left: auto;
      font-size: 9px;
      color: #475569;
      background: #0f172a;
      padding: 1px 6px;
      border-radius: 8px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .ai-gen-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      font-size: 11px;
      color: #94a3b8;
      background: rgba(99,102,241,0.06);
      border-top: 1px solid #0f172a;
    }
    .ai-gen-actions {
      display: flex;
      gap: 6px;
      padding: 8px 10px;
      border-top: 1px solid #0f172a;
    }
    .ai-gen-apply-btn {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 8px;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .ai-gen-apply-btn:hover:not(:disabled) { opacity: 0.85; }
    .ai-gen-apply-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ai-gen-apply-btn mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .ai-gen-discard-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 8px;
      background: transparent;
      color: #64748b;
      border: 1px solid #334155;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .ai-gen-discard-btn:hover:not(:disabled) { color: #94a3b8; border-color: #475569; }
    .ai-gen-discard-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ai-gen-discard-btn mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .ai-gen-refine { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; }
    .ai-gen-refine-label { font-size: 11px; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
    .ai-gen-refine-input { font-size: 12px; padding: 6px 8px; border-radius: 6px; }
    .ai-gen-refine-btn { margin-top: 6px; width: 100%; justify-content: center; }

    /* Responsive */
    @media (max-width: 768px) {
      .task-props-panel {
        width: min(360px, 100vw);
      }
    }
  `]
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('bpmnCanvas') canvasRef!: ElementRef;
  @ViewChild('bpmnProperties') propertiesRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('titleInput') titleInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  politicaId: string | null = null;
  politica: Politica | null = null;

  /** BORRADOR e INACTIVA son los dos estados donde se puede editar el diagrama */
  get isEditable(): boolean {
    return this.politica?.estado === 'BORRADOR' || this.politica?.estado === 'INACTIVA';
  }
  isLoading = false;
  isSaving = false;
  isDirty = false;
  lastSaved: Date | null = null;

  editingName = false;
  editingNameValue = '';
  isSavingName = false;
  simulationActive = false;
  lintErrors: any[] = [];
  collaborators: Collaborator[] = [];
  localBpmnVersion = 0;
  private isApplyingRemoteUpdate = false;

  // --- Panel propiedades UserTask — Sprint 3.5 ---
  selectedElement: object | null = null;
  selectedElementName = '';
  /** Actividad del backend que corresponde al elemento seleccionado (match por nombre o por id). */
  selectedActividad: Actividad | null = null;
  isSavingProps = false;
  isLoadingDepts = false;

  propsForm!: FormGroup;
  departmentsList: { id: string; nombre: string }[] = [];
  cargosList: string[] = [];
  /** Actividades cargadas desde el backend para esta política. */
  activitiesList: Actividad[] = [];

  /** Campos del formulario para el builder — Sprint 4.3 */
  formCampos: Array<{ nombre: string; label: string; tipo: string; required: boolean; opciones: string }> = [];

  // AI Chat panel
  showAiPanel = false;
  chatMessages: ChatMessage[] = [];
  aiPrompt = '';
  isAiLoading = false;
  isListening = false;
  private recognition: any = null;

  // AI Generar Workflow
  aiProveedor = 'claude';
  aiGeneratePrompt = '';
  isGenerating = false;
  generatedWorkflow: WorkflowGenerateResponse | null = null;
  aiRefinePrompt = '';
  isRefining = false;
  isApplying = false;
  applyStatus = '';
  isListeningGen = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  currentUserEmail: string | null = null;

  private modeler: any = null;
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private roleService: RoleService,
    private actividadService: ActividadService,
    private departmentService: DepartmentService,
    private userService: UserService,
    private aiService: AiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private collaborationService: CollaborationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.propsForm = this.fb.group({
      nombre:            [''],
      descripcion:       [''],
      area:              [''],
      cargoRequerido:    [''],
      slaHoras:          [null],
      accionesPermitidas: [[]]
    });
  }

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (!this.politicaId) {
      this.router.navigate(['/policies']);
      return;
    }
    this.currentUserEmail = this.authService.getCurrentUser()?.email ?? null;
    this.loadData();
    this.loadDepartments();

    // Auto-save 2 segundos despues del ultimo cambio
    this.autoSave$.pipe(
      debounceTime(2000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.autoSave());

    // Suscribirse a presencia de colaboradores
    this.collaborationService.collaborators
      .pipe(takeUntil(this.destroy$))
      .subscribe(collaborators => {
        this.collaborators = collaborators;
        this.cdr.detectChanges();
      });

    // Suscribirse a cambios BPMN en tiempo real vía WebSocket
    this.collaborationService.bpmnUpdates
      .pipe(takeUntil(this.destroy$))
      .subscribe((update: BpmnUpdate) => this.onRemoteBpmnUpdate(update));

    // Polling de respaldo: cada 5s verifica si la versión del servidor es más nueva.
    // Garantiza sync aunque el WS pierda algún mensaje (red, Docker, reconexión).
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.pollBpmnVersion());
  }

  ngOnDestroy(): void {
    if (this.politicaId) {
      this.collaborationService.leave(this.politicaId);
    }
    this.destroy$.next();
    this.destroy$.complete();
    if (this.modeler) {
      this.modeler.destroy();
    }
    if (this.recognition) {
      this.recognition.stop();
    }
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
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

        // Load activities for the properties panel
        this.loadActividades();

        // BORRADOR e INACTIVA → el editor colaborativo aplica
        // join() actualiza collaborators$ internamente; el componente recibe vía suscripción
        if (p.estado === 'BORRADOR' || p.estado === 'INACTIVA') {
          this.collaborationService.join(this.politicaId!);
        }
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

    const isReadOnly = !this.isEditable;

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
        // Ignorar cambios que provienen de importar XML remoto (evita loop de auto-saves)
        this.modeler.on('commandStack.changed', () => {
          if (this.isApplyingRemoteUpdate) return;
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

        // Seleccion de elemento: mostrar panel propiedades solo para UserTask
        this.modeler.on('selection.changed', (e: any) => {
          const elements: any[] = e.newSelection ?? [];
          if (elements.length === 1) {
            const el = elements[0];
            const elType: string = el.type ?? '';
            if (elType === 'bpmn:UserTask' || elType.toLowerCase().includes('task')) {
              this.selectedElement = el;
              this.selectedElementName = (el.businessObject?.name as string) ?? el.id ?? '';
              this.populatePropsForm(el);
              this.cdr.detectChanges();
              return;
            }
          }
          // Deseleccion o elemento no es task
          this.selectedElement = null;
          this.selectedActividad = null;
          this.selectedElementName = '';
          this.cdr.detectChanges();
        });

        // Sprint 4.2: auto-map UserTask al departamento del Lane padre
        this.modeler.on('shape.changed', (e: any) => {
          const el = e.element;
          if ((el.type ?? '') !== 'bpmn:UserTask') return;
          const parentEl = el.parent;
          if (!parentEl || parentEl.type !== 'bpmn:Lane') return;
          const laneName: string = (parentEl.businessObject?.name as string) ?? '';
          if (!laneName) return;
          const dept = (this.departmentsList ?? []).find(
            (d: any) => d.nombre?.trim().toLowerCase() === laneName.trim().toLowerCase()
          );
          if (!dept) return;
          if ((this.selectedElement as any)?.id === el.id) {
            this.propsForm.patchValue({ area: dept.id }, { emitEvent: false });
            this.onAreaChange(dept.id);
            this.cdr.detectChanges();
          }
        });
      }

      // Cargar el XML del backend
      this.politicaService.getBpmn(this.politicaId!).subscribe({
        next: ({ bpmnXml, bpmnVersion }) => {
          this.localBpmnVersion = bpmnVersion ?? 0;
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
    if (!this.politicaId || !this.modeler || !this.isEditable) return;
    if (this.isApplyingRemoteUpdate) return;
    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      this.politicaService.saveBpmn(this.politicaId!, xml, this.localBpmnVersion).subscribe({
        next: ({ bpmnVersion }) => {
          this.isDirty = false;
          this.lastSaved = new Date();
          this.localBpmnVersion = bpmnVersion;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.status === 409) {
            this.snackBar.open('Conflicto: otro colaborador guardó cambios. Recarga el editor.', 'Recargar', { duration: 8000 })
              .onAction().subscribe(() => window.location.reload());
          }
        }
      });
    }).catch(() => {});
  }

  saveNow(): void {
    if (!this.politicaId || !this.modeler) return;
    this.isSaving = true;
    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      this.politicaService.saveBpmn(this.politicaId!, xml, this.localBpmnVersion).subscribe({
        next: ({ bpmnVersion }) => {
          this.isSaving = false;
          this.isDirty = false;
          this.lastSaved = new Date();
          this.localBpmnVersion = bpmnVersion;
          this.snackBar.open('Diagrama guardado', 'Cerrar', { duration: 2000 });
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409) {
            this.snackBar.open('Conflicto: otro colaborador guardó cambios. Recarga para continuar.', 'Recargar', { duration: 8000 })
              .onAction().subscribe(() => window.location.reload());
          } else {
            this.snackBar.open(err?.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
          }
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

  // ── AI Chat Panel ──────────────────────────────────────────

  toggleAiPanel(): void {
    this.showAiPanel = !this.showAiPanel;
    this.cdr.detectChanges();
  }

  onAiEnterKey(event: Event): void {
    // Shift+Enter inserta salto de línea; Enter simple envía
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.sendAiCommand();
    }
  }

  sendAiCommand(): void {
    const prompt = this.aiPrompt.trim();
    if (!prompt || this.isAiLoading || !this.modeler) return;

    this.chatMessages.push({ role: 'user', text: prompt });
    this.aiPrompt = '';
    this.isAiLoading = true;
    this.cdr.detectChanges();
    this.scrollMessages();

    this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
      this.aiService.sendBpmnCommand({
        prompt,
        bpmnXml: xml,
        politicaId: this.politicaId ?? undefined
      }).subscribe({
        next: (response) => {
          this.isAiLoading = false;
          if (response.hasChanges) {
            // Agregar mensaje con XML pendiente de aplicar
            this.chatMessages.push({
              role: 'assistant',
              text: response.explanation,
              operations: response.operations,
              pendingXml: response.newBpmnXml
            });
          } else {
            this.chatMessages.push({
              role: 'assistant',
              text: response.explanation || 'No se requieren cambios en el diagrama.'
            });
          }
          this.cdr.detectChanges();
          this.scrollMessages();
        },
        error: (err) => {
          this.isAiLoading = false;
          const msg = err?.error?.detail || 'Error al conectar con el servicio IA. Verifica que el ai-service esté activo.';
          this.chatMessages.push({ role: 'assistant', text: `Error: ${msg}` });
          this.cdr.detectChanges();
          this.scrollMessages();
        }
      });
    }).catch(() => {
      this.isAiLoading = false;
      this.chatMessages.push({ role: 'assistant', text: 'Error al leer el XML del diagrama.' });
      this.cdr.detectChanges();
    });
  }

  applyAiChanges(messageIndex: number): void {
    const msg = this.chatMessages[messageIndex];
    if (!msg?.pendingXml || !this.modeler) return;

    const newXml = msg.pendingXml;
    // Limpiar el pendingXml para quitar los botones
    this.chatMessages[messageIndex] = { ...msg, pendingXml: undefined };
    this.cdr.detectChanges();

    this.selectedElement = null; // XML cambia completo, referencias previas son inválidas
    this.modeler.importXML(newXml).then(() => {
      this.modeler.get('canvas').zoom('fit-viewport');
      this.isDirty = true;
      this.autoSave$.next();
      this.snackBar.open('Cambios aplicados al diagrama', 'Cerrar', { duration: 2500 });
      this.cdr.detectChanges();
    }).catch((err: any) => {
      console.error('Error aplicando XML de IA:', err);
      this.snackBar.open('Error al aplicar los cambios. El XML generado no es válido.', 'Cerrar', { duration: 4000 });
      // Restaurar botones para que el usuario pueda reintentar
      this.chatMessages[messageIndex] = { ...msg };
      this.cdr.detectChanges();
    });
  }

  /**
   * Fallback: compara la versión local con la del servidor.
   * Si hay colaboradores y el servidor tiene una versión más nueva,
   * aplica el XML actualizado aunque el WS no haya entregado el broadcast.
   */
  private pollBpmnVersion(): void {
    if (!this.politicaId || !this.modeler || !this.isEditable) return;
    if (this.isDirty || this.isApplyingRemoteUpdate) return;

    this.politicaService.getBpmn(this.politicaId).subscribe({
      next: ({ bpmnXml, bpmnVersion }) => {
        if (bpmnVersion > this.localBpmnVersion) {
          console.log('[Sync] Poll detectó versión nueva:', bpmnVersion, '>', this.localBpmnVersion);
          this.onRemoteBpmnUpdate({ bpmnXml, bpmnVersion, savedByEmail: '' });
        }
      },
      error: () => {}
    });
  }

  /** Otro colaborador guardó el diagrama en tiempo real */
  private onRemoteBpmnUpdate(update: BpmnUpdate): void {
    if (!this.modeler) return;

    if (!this.isDirty) {
      // Sin cambios locales: aplicar el XML remoto silenciosamente
      // Activar flag para que commandStack.changed no dispare auto-save
      this.isApplyingRemoteUpdate = true;
      this.selectedElement = null; // El XML cambia, la referencia al elemento ya no es válida
      this.modeler.importXML(update.bpmnXml).then(() => {
        this.localBpmnVersion = update.bpmnVersion;
        this.isDirty = false;
        this.lastSaved = new Date();
        this.isApplyingRemoteUpdate = false;
        this.cdr.detectChanges();
      }).catch(() => {
        this.isApplyingRemoteUpdate = false;
      });
    } else {
      // Hay cambios locales: NO actualizar localBpmnVersion → el 409 obliga a recargar
      // (evita que los cambios del usuario sobreescriban silenciosamente los del colaborador)
      this.snackBar.open(
        `${update.savedByEmail} guardó cambios. Al guardar puede haber conflicto.`,
        'Recargar',
        { duration: 8000 }
      ).onAction().subscribe(() => window.location.reload());
    }
  }

  discardAiChanges(messageIndex: number): void {
    const msg = this.chatMessages[messageIndex];
    this.chatMessages[messageIndex] = { ...msg, pendingXml: undefined };
    this.snackBar.open('Cambios descartados', 'Cerrar', { duration: 1500 });
    this.cdr.detectChanges();
  }

  toggleVoiceInput(): void {
    if (this.isListening) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  private startVoiceInput(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.snackBar.open('El reconocimiento de voz no está disponible en este navegador.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.aiPrompt = (this.aiPrompt ? this.aiPrompt + ' ' : '') + transcript;
      this.isListening = false;
      this.cdr.detectChanges();
    };

    this.recognition.onerror = () => {
      this.isListening = false;
      this.snackBar.open('Error en el reconocimiento de voz.', 'Cerrar', { duration: 2000 });
      this.cdr.detectChanges();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.cdr.detectChanges();
    };

    this.recognition.start();
    this.isListening = true;
    this.cdr.detectChanges();
  }

  private stopVoiceInput(): void {
    this.recognition?.stop();
    this.isListening = false;
    this.cdr.detectChanges();
  }

  async toggleVoiceInputGen(): Promise<void> {
    if (this.isListeningGen) {
      this.mediaRecorder?.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('[VoiceInput] No se pudo acceder al micrófono:', err);
      this.snackBar.open('No se pudo acceder al micrófono', 'OK', { duration: 3000 });
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      this.isListeningGen = false;
      this.cdr.detectChanges();

      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');

      try {
        const result = await firstValueFrom(
          this.http.post<{ text: string }>(`${environment.aiServiceUrl}/ai/transcribe`, formData)
        );
        if (result?.text) {
          this.aiGeneratePrompt = (this.aiGeneratePrompt ? this.aiGeneratePrompt + ' ' : '') + result.text.trim();
          this.cdr.detectChanges();
        }
      } catch (err) {
        console.error('[VoiceInput] Error al transcribir audio con Groq Whisper:', err);
        this.snackBar.open('Error al transcribir el audio', 'OK', { duration: 3000 });
      }
    };

    this.mediaRecorder.start();
    this.isListeningGen = true;
    this.cdr.detectChanges();
  }

  private scrollMessages(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  // ── AI Generar Workflow — Sprint AI-2 ─────────────────────

  async generateWorkflow(): Promise<void> {
    if (!this.aiGeneratePrompt.trim()) return;
    this.isGenerating = true;
    this.generatedWorkflow = null;
    this.applyStatus = '';
    this.cdr.detectChanges();

    let deptsExistentes: string[] = [];
    try {
      const depts = await firstValueFrom(this.departmentService.getAll());
      deptsExistentes = depts.map(d => d.nombre);
    } catch {
      // non-blocking: continue without existing departments context
    }

    try {
      this.generatedWorkflow = await firstValueFrom(
        this.aiService.generateWorkflow({
          prompt: this.aiGeneratePrompt,
          politicaNombre: this.politica?.nombre,
          departamentosExistentes: deptsExistentes,
          proveedor: this.aiProveedor
        })
      );
    } catch (e: unknown) {
      const err = e as { error?: { detail?: string }; message?: string };
      this.snackBar.open(
        'Error generando workflow: ' + (err?.error?.detail ?? err?.message ?? 'Error desconocido'),
        'OK',
        { duration: 5000 }
      );
      console.error('[AI Generate] Error:', e);
    } finally {
      this.isGenerating = false;
      this.cdr.detectChanges();
    }
  }

  async refineWorkflow(): Promise<void> {
    if (!this.generatedWorkflow || !this.aiRefinePrompt.trim()) return;
    this.isRefining = true;
    try {
      const refined = await firstValueFrom(this.aiService.refineWorkflow({
        bpmnXml: this.generatedWorkflow.bpmnXml,
        actividades: this.generatedWorkflow.actividades,
        instruccion: this.aiRefinePrompt,
        politicaNombre: this.generatedWorkflow.politicaNombre,
        proveedor: this.aiProveedor,
      }));
      this.generatedWorkflow = refined;
      this.aiRefinePrompt = '';
    } catch (e: any) {
      this.snackBar.open('Error refinando: ' + (e?.error?.detail || e.message), 'OK', { duration: 5000 });
    } finally {
      this.isRefining = false;
      this.cdr.detectChanges();
    }
  }

  async applyGeneratedWorkflow(): Promise<void> {
    if (!this.generatedWorkflow || !this.politicaId) return;
    this.isApplying = true;
    this.applyStatus = 'Iniciando...';
    this.cdr.detectChanges();

    const wf = this.generatedWorkflow;

    try {
      // ── Roles ──────────────────────────────────────────────────────────────
      this.applyStatus = 'Obteniendo roles...';
      this.cdr.detectChanges();
      const roles = await firstValueFrom(this.roleService.getAll()).catch(() => [] as any[]);
      const rolFuncId  = roles.find((r: any) => r.nombre?.toUpperCase() === 'FUNCIONARIO')?.id ?? '';
      const rolCliId   = roles.find((r: any) => r.nombre?.toUpperCase() === 'CLIENTE')?.id ?? '';
      if (!rolFuncId || !rolCliId) {
        this.snackBar.open('No se pudieron obtener los roles FUNCIONARIO/CLIENTE', 'OK', { duration: 5000 });
        this.isApplying = false; return;
      }

      // ── Departamentos ──────────────────────────────────────────────────────
      this.applyStatus = 'Creando departamentos...';
      this.cdr.detectChanges();
      const existingDepts = await firstValueFrom(this.departmentService.getAll());
      const deptMap: Record<string, string> = {};
      for (const d of existingDepts) deptMap[d.nombre.trim().toLowerCase()] = d.id;

      for (const dept of wf.departamentos) {
        const key = dept.nombre.trim().toLowerCase();
        if (!deptMap[key]) {
          const created = await firstValueFrom(
            this.departmentService.create({ nombre: dept.nombre, descripcion: dept.descripcion, activa: true })
          ).catch((e) => { console.warn('[AI] dept create failed:', e?.error || e); return null as any; });
          if (created?.id) { deptMap[key] = created.id; }
          else {
            // fallback: re-fetch en caso de que ya exista
            const refetch = await firstValueFrom(this.departmentService.getAll()).catch(() => existingDepts);
            for (const d of refetch) deptMap[d.nombre.trim().toLowerCase()] = d.id;
          }
        }
      }

      // Re-fetch final para asegurar mapa completo y actualizado
      const allDepts = await firstValueFrom(this.departmentService.getAll()).catch(() => existingDepts);
      for (const d of allDepts) deptMap[d.nombre.trim().toLowerCase()] = d.id;

      // Fuzzy lookup: si no hay match exacto, busca substring (maneja variaciones de la IA)
      const findDeptId = (name: string | null): string | undefined => {
        if (!name?.trim()) return undefined;
        const key = name.trim().toLowerCase();
        if (deptMap[key]) return deptMap[key];
        // substring match bidireccional
        const entry = Object.entries(deptMap).find(([k]) => k.includes(key) || key.includes(k));
        if (entry) { console.log(`[AI] dept fuzzy match: "${name}" → "${entry[0]}"`); return entry[1]; }
        console.warn(`[AI] dept NOT found: "${name}". deptMap keys:`, Object.keys(deptMap));
        return undefined;
      };

      // ── Funcionarios ───────────────────────────────────────────────────────
      this.applyStatus = 'Creando funcionarios...';
      this.cdr.detectChanges();
      for (const func of wf.funcionarios) {
        const deptId = findDeptId(func.departamento);
        await firstValueFrom(this.userService.create({
          email: func.email,
          username: func.email.split('@')[0],
          nombreCompleto: func.nombre,
          password: 'Func2024!',
          rolId: rolFuncId,
          departmentId: deptId,
        })).catch((e: any) => {
          if (e?.status !== 400) console.error('[AI] user create failed:', e?.error || e);
          // 400 = usuario ya existe, ignorar
        });
      }

      // ── BPMN ───────────────────────────────────────────────────────────────
      this.applyStatus = 'Aplicando diagrama BPMN...';
      this.cdr.detectChanges();
      const { bpmnVersion: newV } = await firstValueFrom(
        this.politicaService.saveBpmn(this.politicaId!, wf.bpmnXml)
      );
      this.localBpmnVersion = newV;
      if (this.modeler) {
        this.selectedElement = null;
        await this.modeler.importXML(wf.bpmnXml);
        this.modeler.get('canvas').zoom('fit-viewport');
        this.isDirty = false;
        this.lastSaved = new Date();
      }

      // ── Actividades — exactamente como el seed ─────────────────────────────
      this.applyStatus = 'Creando actividades...';
      this.cdr.detectChanges();

      // Borrar previas
      const prevActs = await firstValueFrom(this.actividadService.getByPolicy(this.politicaId!)).catch(() => [] as Actividad[]);
      for (const p of prevActs) await firstValueFrom(this.actividadService.delete(p.id)).catch(() => {});

      // ── 1. INICIO ───────────────────────────────────────────────────────────
      const inicioAct = await firstValueFrom(
        this.actividadService.create({ politicaId: this.politicaId!, nombre: 'Inicio', tipo: 'INICIO' })
      ).catch((e: any) => { console.error('[AI] create INICIO failed:', e?.error || e); return null as any; });

      // ── 2. TARéAs — POST con departmentId + PATCH propiedades ───────────────
      const createdActs: Actividad[] = [];
      for (const actGen of wf.actividades) {
        const esCliente = actGen.rol === 'CLIENTE' || actGen.departamento === null;
        const rolId     = esCliente ? rolCliId : rolFuncId;
        const deptId    = findDeptId(actGen.departamento);
        console.log(`[AI] actividad "${actGen.nombre}" → rol=${actGen.rol} dept="${actGen.departamento}" → deptId=${deptId}`);

        const created = await firstValueFrom(
          this.actividadService.create({
            politicaId:      this.politicaId!,
            nombre:           actGen.nombre,
            tipo:             'TAREA',
            responsableRolId: rolId,
            departmentId:     deptId ?? null,
          })
        ).catch((e: any) => {
          console.error('[AI] create actividad failed:', actGen.nombre, e?.error || e);
          return null as any;
        });

        if (!created?.id) continue;
        createdActs.push(created);

        const campos: CampoActividad[] = (actGen.campos ?? [])
          .filter(c => c.nombre?.trim())
          .map(c => ({
            nombre:   c.nombre.trim(),
            label:    c.label?.trim() || c.nombre.trim(),
            tipo:     c.tipo as CampoActividad['tipo'],
            required: c.required ?? false,
            opciones: c.opciones?.length > 0 ? c.opciones : undefined,
          }));

        await firstValueFrom(
          this.actividadService.updatePropiedades(created.id, {
            area:               deptId,
            slaHoras:           actGen.slaHoras > 0 ? actGen.slaHoras : 24,
            accionesPermitidas: actGen.accionesPermitidas as AccionPermitida[],
            campos:             campos.length > 0 ? campos : undefined,
          })
        ).catch((e: any) => console.error('[AI] patch propiedades failed:', actGen.nombre, e?.error || e));
      }

      // ── 3. FIN ──────────────────────────────────────────────────────────────
      const finAct = await firstValueFrom(
        this.actividadService.create({ politicaId: this.politicaId!, nombre: 'Fin', tipo: 'FIN' })
      ).catch((e: any) => { console.error('[AI] create FIN failed:', e?.error || e); return null as any; });

      // ── 4. Transiciones: cadena lineal INICIO → T0 → T1 → … → FIN ──────────
      // (solo usadas para validación del publish — el motor usa el BPMN XML)
      if (inicioAct?.id && finAct?.id && createdActs.length > 0) {
        const mkTrans = (destId: string): Transicion[] =>
          [{ actividadDestinoId: destId, condicion: 'default', etiqueta: 'Siguiente' }];

        await firstValueFrom(
          this.actividadService.update(inicioAct.id, { transiciones: mkTrans(createdActs[0].id) })
        ).catch(() => {});

        for (let i = 0; i < createdActs.length; i++) {
          const destId = i + 1 < createdActs.length ? createdActs[i + 1].id : finAct.id;
          await firstValueFrom(
            this.actividadService.update(createdActs[i].id, { transiciones: mkTrans(destId) })
          ).catch(() => {});
        }
      }

      this.activitiesList = [inicioAct, ...createdActs, finAct].filter(Boolean);
      this.loadActividades();
      this.loadDepartments();

      this.applyStatus = '';
      this.generatedWorkflow = null;
      this.isApplying = false;
      this.snackBar.open(`✓ Workflow aplicado: ${createdActs.length} actividades creadas`, 'OK', { duration: 5000 });
      this.cdr.detectChanges();

    } catch (e: unknown) {
      const err = e as { error?: { message?: string }; message?: string };
      this.applyStatus = '';
      this.isApplying = false;
      this.snackBar.open(
        'Error aplicando workflow: ' + (err?.error?.message ?? err?.message ?? 'Error desconocido'),
        'Cerrar',
        { duration: 6000 }
      );
      console.error('[AI Apply] Error inesperado:', e);
      this.cdr.detectChanges();
    }
  }

  // ── UserTask Properties Panel — Sprint 3.5 ────────────────

  private loadDepartments(): void {
    this.isLoadingDepts = true;
    this.departmentService.getAll().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (depts) => {
        this.departmentsList = depts.map(d => ({ id: d.id, nombre: d.nombre }));
        this.isLoadingDepts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando departamentos para el panel:', err);
        this.isLoadingDepts = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadActividades(): void {
    if (!this.politicaId) return;
    this.actividadService.getByPolitica(this.politicaId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (acts) => {
        this.activitiesList = acts;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando actividades:', err);
      }
    });
  }

  /**
   * Populates the reactive form with data from the selected BPMN element.
   * Tries to match the bpmn element to a backend Actividad by name.
   * If no match is found, pre-fills with what's available in the BPMN element.
   */
  private populatePropsForm(el: object & { businessObject?: Record<string, unknown>; id?: string }): void {
    const boName: string = (el.businessObject?.['name'] as string) ?? '';

    // Try to find the matching backend Actividad by name (case-insensitive trim)
    const matchedActividad = this.activitiesList.find(
      a => a.nombre?.trim().toLowerCase() === boName.trim().toLowerCase()
    ) ?? null;
    this.selectedActividad = matchedActividad;

    if (matchedActividad) {
      // Use backend data as source of truth
      const areaId = matchedActividad.departmentId ?? '';

      // Si la actividad no tiene departmentId pero el elemento está en un Lane, usar el lane
      let resolvedAreaId = areaId;
      if (!resolvedAreaId) {
        const parentEl = (el as any).parent;
        if (parentEl?.type === 'bpmn:Lane') {
          const laneName: string = (parentEl.businessObject?.name as string) ?? '';
          const deptFromLane = (this.departmentsList ?? []).find(
            (d: any) => d.nombre?.trim().toLowerCase() === laneName.trim().toLowerCase()
          );
          if (deptFromLane) resolvedAreaId = deptFromLane.id;
        }
      }

      this.propsForm.patchValue({
        nombre:            matchedActividad.nombre ?? boName,
        descripcion:       matchedActividad.descripcion ?? '',
        area:              resolvedAreaId,
        cargoRequerido:    matchedActividad.cargoRequerido ?? '',
        slaHoras:          matchedActividad.tiempoLimiteHoras ?? null,
        accionesPermitidas: matchedActividad.accionesPermitidas ?? []
      }, { emitEvent: false });

      // Load cargos for the area if one is set
      if (resolvedAreaId) {
        this.loadCargosForArea(resolvedAreaId);
      } else {
        this.cargosList = [];
      }

      // Cargar campos del formulario desde la actividad
      const campos = matchedActividad.campos ?? [];
      this.formCampos = campos.map(c => ({
        nombre: c.nombre,
        label: c.label,
        tipo: c.tipo,
        required: c.required,
        opciones: (c.opciones ?? []).join(',')
      }));
    } else {
      // No backend match: prefill from BPMN XML only
      this.propsForm.patchValue({
        nombre:            boName,
        descripcion:       '',
        area:              '',
        cargoRequerido:    '',
        slaHoras:          null,
        accionesPermitidas: []
      }, { emitEvent: false });

      this.formCampos = [];

      // Aunque no hay actividad en backend, auto-detectar lane
      const parentElFallback = (el as any).parent;
      if (parentElFallback?.type === 'bpmn:Lane') {
        const laneNameFb: string = (parentElFallback.businessObject?.name as string) ?? '';
        const deptFb = (this.departmentsList ?? []).find(
          (d: any) => d.nombre?.trim().toLowerCase() === laneNameFb.trim().toLowerCase()
        );
        if (deptFb) {
          this.propsForm.patchValue({ area: deptFb.id }, { emitEvent: false });
          this.loadCargosForArea(deptFb.id);
        }
      } else {
        this.cargosList = [];
      }
    }

    this.cdr.detectChanges();
  }

  onAreaChange(departmentId: string): void {
    this.propsForm.patchValue({ cargoRequerido: '' }, { emitEvent: false });
    this.cargosList = [];
    if (departmentId) {
      this.loadCargosForArea(departmentId);
    }
  }

  private loadCargosForArea(departmentId: string): void {
    this.departmentService.getCargosByDepartamento(departmentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (cargos) => {
        this.cargosList = cargos;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargosList = [];
        this.cdr.detectChanges();
      }
    });
  }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      TEXT: 'Texto', TEXTAREA: 'Área texto', NUMBER: 'Número',
      DATE: 'Fecha', FILE: 'Archivo', SELECT: 'Selección', BOOLEAN: 'Sí/No'
    };
    return map[tipo] ?? tipo;
  }

  addCampo(): void {
    this.formCampos = [...this.formCampos, { nombre: '', label: '', tipo: 'TEXT', required: false, opciones: '' }];
    this.cdr.detectChanges();
  }

  removeCampo(idx: number): void {
    this.formCampos = this.formCampos.filter((_, i) => i !== idx);
    this.cdr.detectChanges();
  }

  closePropertiesPanel(): void {
    this.selectedElement = null;
    this.selectedActividad = null;
    this.selectedElementName = '';
    this.cargosList = [];
    this.formCampos = [];
    this.cdr.detectChanges();
  }

  saveTaskProperties(): void {
    if (!this.selectedElement || !this.modeler || !this.isEditable) return;
    if (this.propsForm.invalid) return;

    const formValue = this.propsForm.value as {
      nombre: string;
      descripcion: string;
      area: string;
      cargoRequerido: string;
      slaHoras: number | null;
      accionesPermitidas: AccionPermitida[];
    };

    this.isSavingProps = true;
    this.cdr.detectChanges();

    // 1. Update the BPMN element name + documentation in the modeler
    const modeling = this.modeler.get('modeling');
    const moddle = this.modeler.get('moddle');

    modeling.updateProperties(this.selectedElement, {
      name: formValue.nombre,
      documentation: []
    });
    this.isDirty = true;
    this.autoSave$.next();

    // Preparar campos del formulario para persistir
    const camposToSave: CampoActividad[] = this.formCampos
      .filter(c => c.nombre.trim())
      .map(c => ({
        nombre: c.nombre.trim(),
        label: c.label.trim() || c.nombre.trim(),
        tipo: c.tipo as CampoActividad['tipo'],
        required: c.required,
        opciones: c.opciones ? c.opciones.split(',').map(o => o.trim()).filter(Boolean) : undefined
      }));

    // 2. Persist to backend if we have a matching actividad
    if (this.selectedActividad?.id) {
      this.actividadService.updatePropiedades(this.selectedActividad.id, {
        nombre:            formValue.nombre || undefined,
        descripcion:       formValue.descripcion || undefined,
        area:              formValue.area || undefined,
        cargoRequerido:    formValue.cargoRequerido || undefined,
        slaHoras:          formValue.slaHoras ?? undefined,
        accionesPermitidas: formValue.accionesPermitidas.length > 0 ? formValue.accionesPermitidas : undefined,
        campos:            camposToSave.length > 0 ? camposToSave : undefined
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (updated) => {
          // Update local activities list with new data
          const idx = this.activitiesList.findIndex(a => a.id === updated.id);
          if (idx !== -1) {
            this.activitiesList[idx] = updated;
            this.selectedActividad = updated;
          }
          this.isSavingProps = false;
          this.selectedElementName = formValue.nombre || this.selectedElementName;
          this.snackBar.open('Propiedades guardadas', 'Cerrar', { duration: 2500 });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSavingProps = false;
          console.error('Error guardando propiedades de actividad:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al guardar las propiedades',
            'Cerrar',
            { duration: 4000 }
          );
          this.cdr.detectChanges();
        }
      });
    } else {
      // No backend actividad yet — only the BPMN XML change was applied
      this.isSavingProps = false;
      this.selectedElementName = formValue.nombre || this.selectedElementName;
      this.snackBar.open(
        'Nombre actualizado en el diagrama. Guarda el diagrama para persistir.',
        'Cerrar',
        { duration: 3500 }
      );
      this.cdr.detectChanges();
    }
  }

  // ── Nombre editable inline ─────────────────────────────────
  startEditingName(): void {
    if (!this.politica || !this.isEditable) return;
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
  getCollabInitials(nombreCompleto: string): string {
    return this.collaborationService.getInitials(nombreCompleto);
  }

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
      if (this.isEditable) this.saveNow();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      this.fitViewport();
    }
    if (event.key === 'Escape' && this.selectedElement) {
      this.closePropertiesPanel();
    }
  }
}
