import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ViewEncapsulation, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, takeUntil, interval } from 'rxjs';

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
import { ActividadService } from '../../shared/services/actividad.service';
import { DepartmentService } from '../../shared/services/department.service';
import { AiService } from '../../shared/services/ai.service';
import { AuthService } from '../../shared/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Politica } from '../../shared/models/politica.model';
import { Actividad, AccionPermitida } from '../../shared/models/actividad.model';
import { CampoFormulario, TipoCampo, FormularioResponse, CreateFormularioRequest, UpdateFormularioRequest } from '../../shared/models/formulario.model';
import { CollaborationService } from '../../shared/services/collaboration.service';
import { Collaborator } from '../../shared/models/collaborator.model';
import { BpmnUpdate } from '../../shared/services/collaboration.service';
import { ChatMessage } from '../../shared/models/bpmn-command.model';

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

      <!-- Historial de mensajes -->
      <div class="ai-messages" #messagesContainer>
        <div *ngIf="chatMessages.length === 0" class="ai-empty-hint">
          <mat-icon>tips_and_updates</mat-icon>
          <p>Describe los cambios que quieres hacer en el diagrama.</p>
          <p class="ai-hint-examples">
            <em>"Agrega una tarea de validación de documentos"</em><br>
            <em>"Conecta la tarea de revisión con el gateway de aprobación"</em><br>
            <em>"Agrega un gateway exclusivo después de la tarea de recepción"</em>
          </p>
        </div>

        <div *ngFor="let msg of chatMessages; let i = index"
             class="ai-message"
             [ngClass]="msg.role === 'user' ? 'ai-message--user' : 'ai-message--assistant'">
          <div class="ai-message-bubble">
            <span>{{ msg.text }}</span>

            <!-- Operaciones realizadas -->
            <div *ngIf="msg.operations && msg.operations.length > 0" class="ai-operations">
              <div *ngFor="let op of msg.operations" class="ai-op-item">
                <mat-icon class="ai-op-icon">check_circle</mat-icon>
                {{ op.description }}
              </div>
            </div>

            <!-- Botones de preview pendiente -->
            <div *ngIf="msg.pendingXml" class="ai-preview-actions">
              <button mat-raised-button color="primary" class="ai-apply-btn"
                      (click)="applyAiChanges(i)">
                <mat-icon>check</mat-icon> Aplicar
              </button>
              <button mat-stroked-button class="ai-discard-btn"
                      (click)="discardAiChanges(i)">
                <mat-icon>close</mat-icon> Descartar
              </button>
            </div>
          </div>
        </div>

        <!-- Indicador de carga -->
        <div *ngIf="isAiLoading" class="ai-message ai-message--assistant">
          <div class="ai-message-bubble ai-loading-bubble">
            <mat-spinner diameter="16" style="display:inline-block"></mat-spinner>
            <span style="margin-left:8px">Analizando diagrama...</span>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="ai-input-area">
        <textarea class="ai-textarea"
                  [(ngModel)]="aiPrompt"
                  placeholder="Describe el cambio que deseas hacer..."
                  (keydown.enter)="onAiEnterKey($event)"
                  [disabled]="isAiLoading"
                  rows="3"></textarea>
        <div class="ai-input-actions">
          <button mat-icon-button
                  [class.ai-mic-active]="isListening"
                  [style.color]="isListening ? '#ef4444' : ''"
                  (click)="toggleVoiceInput()"
                  [matTooltip]="isListening ? 'Detener grabación' : 'Hablar'"
                  [disabled]="isAiLoading">
            <mat-icon>{{ isListening ? 'mic_off' : 'mic' }}</mat-icon>
          </button>
          <button mat-raised-button color="accent"
                  (click)="sendAiCommand()"
                  [disabled]="isAiLoading || !aiPrompt.trim()"
                  class="ai-send-btn">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
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

        <!-- Tabs: Propiedades | Formulario -->
        <div class="task-props-tabs" role="tablist">
          <button class="task-props-tab"
                  [class.active]="propsPanelTab === 'props'"
                  (click)="switchPropsTab('props')"
                  role="tab"
                  [attr.aria-selected]="propsPanelTab === 'props'"
                  aria-controls="tab-props">
            <mat-icon style="font-size:16px;width:16px;height:16px">tune</mat-icon>
            Propiedades
          </button>
          <button class="task-props-tab"
                  [class.active]="propsPanelTab === 'formulario'"
                  (click)="switchPropsTab('formulario')"
                  role="tab"
                  [attr.aria-selected]="propsPanelTab === 'formulario'"
                  aria-controls="tab-formulario">
            <mat-icon style="font-size:16px;width:16px;height:16px">assignment</mat-icon>
            Formulario
          </button>
        </div>

        <!-- Loading overlay while saving -->
        <div class="task-props-saving" *ngIf="isSavingProps" aria-live="polite" aria-label="Guardando propiedades">
          <mat-spinner diameter="20"></mat-spinner>
          <span>Guardando...</span>
        </div>

        <!-- Form body — scrollable -->
        <div class="task-props-body" [formGroup]="propsForm"
             *ngIf="propsPanelTab === 'props'"
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

          <div class="task-props-section-divider">Formulario y SLA</div>

          <!-- Formulario -->
          <mat-form-field appearance="outline" class="task-props-field">
            <mat-label>Formulario asociado</mat-label>
            <mat-select formControlName="formularioId" aria-label="Formulario asociado">
              <mat-option value="">Sin formulario</mat-option>
              <mat-option *ngFor="let f of formulariosList" [value]="f.id">{{ f.nombre }}</mat-option>
            </mat-select>
            <mat-progress-spinner *ngIf="isLoadingForms"
                                  matSuffix
                                  diameter="16"
                                  mode="indeterminate"
                                  style="display:inline-flex;margin-right:8px">
            </mat-progress-spinner>
          </mat-form-field>

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

        </div><!-- /task-props-body -->

        <!-- Tab Formulario — Sprint 4.3 -->
        <div class="task-props-body task-props-form-tab"
             *ngIf="propsPanelTab === 'formulario'"
             id="tab-formulario" role="tabpanel">

          <div *ngIf="isLoadingFormTab" style="display:flex;justify-content:center;padding:32px">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <ng-container *ngIf="!isLoadingFormTab">

            <div *ngIf="!propsForm.get('formularioId')?.value && formCampos.length === 0"
                 class="task-props-form-empty">
              <mat-icon style="font-size:40px;width:40px;height:40px;color:#bbb">assignment_late</mat-icon>
              <span>Sin formulario vinculado</span>
              <button mat-stroked-button (click)="addCampo()">
                <mat-icon>add</mat-icon> Crear formulario
              </button>
            </div>

            <ng-container *ngIf="propsForm.get('formularioId')?.value || formCampos.length > 0">
              <div class="task-props-section-divider">Campos del formulario</div>

              <div *ngFor="let campo of formCampos; let i = index" class="form-campo-row">
                <input class="form-campo-input"
                       [(ngModel)]="campo.nombre"
                       [ngModelOptions]="{standalone: true}"
                       placeholder="nombre_campo"
                       [attr.aria-label]="'Nombre del campo ' + (i + 1)" />
                <input class="form-campo-input"
                       [(ngModel)]="campo.etiqueta"
                       [ngModelOptions]="{standalone: true}"
                       placeholder="Etiqueta"
                       [attr.aria-label]="'Etiqueta del campo ' + (i + 1)" />
                <select class="form-campo-select"
                        [(ngModel)]="campo.tipo"
                        [ngModelOptions]="{standalone: true}"
                        [attr.aria-label]="'Tipo del campo ' + (i + 1)">
                  <option value="TEXT">Texto</option>
                  <option value="NUMBER">Número</option>
                  <option value="DATE">Fecha</option>
                  <option value="FILE">Archivo</option>
                  <option value="SELECT">Selección</option>
                  <option value="TEXTAREA">Área de texto</option>
                  <option value="EMAIL">Email</option>
                  <option value="BOOLEAN">Sí/No</option>
                </select>
                <label class="form-campo-req" [title]="'Obligatorio'">
                  <input type="checkbox"
                         [(ngModel)]="campo.obligatorio"
                         [ngModelOptions]="{standalone: true}"
                         [attr.aria-label]="'Campo ' + (i + 1) + ' obligatorio'" />
                  *
                </label>
                <button mat-icon-button
                        color="warn"
                        (click)="removeCampo(i)"
                        style="width:28px;height:28px;line-height:28px"
                        [attr.aria-label]="'Eliminar campo ' + (i + 1)">
                  <mat-icon style="font-size:16px;width:16px;height:16px">delete</mat-icon>
                </button>
              </div>

              <button mat-stroked-button
                      style="margin-top:8px;width:100%"
                      (click)="addCampo()">
                <mat-icon>add</mat-icon> Agregar campo
              </button>
            </ng-container>

          </ng-container>
        </div>

        <!-- Footer actions -->
        <div class="task-props-footer">
          <button mat-stroked-button
                  (click)="closePropertiesPanel()"
                  class="task-props-cancel-btn"
                  [disabled]="isSavingProps || isSavingFormTab">
            Cancelar
          </button>
          <button mat-raised-button
                  color="primary"
                  *ngIf="propsPanelTab === 'props'"
                  (click)="saveTaskProperties()"
                  class="task-props-save-btn"
                  [disabled]="isSavingProps || propsForm.invalid"
                  aria-label="Guardar propiedades del paso">
            <mat-spinner *ngIf="isSavingProps" diameter="16" style="display:inline-flex;margin-right:4px"></mat-spinner>
            <mat-icon *ngIf="!isSavingProps">save</mat-icon>
            Guardar
          </button>
          <button mat-raised-button
                  color="primary"
                  *ngIf="propsPanelTab === 'formulario'"
                  (click)="saveFormularioTab()"
                  class="task-props-save-btn"
                  [disabled]="isSavingFormTab || formCampos.length === 0"
                  aria-label="Guardar formulario">
            <mat-spinner *ngIf="isSavingFormTab" diameter="16" style="display:inline-flex;margin-right:4px"></mat-spinner>
            <mat-icon *ngIf="!isSavingFormTab">save</mat-icon>
            Guardar formulario
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
      width: 320px;
      height: 100%;
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
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
      padding: 12px 12px 12px 16px;
      background: #1e3a8a;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      flex-shrink: 0;
    }
    .task-props-header > mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255,255,255,0.85);
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
      font-weight: 600;
      color: white;
      line-height: 1.2;
    }
    .task-props-subtitle {
      font-size: 11px;
      color: rgba(255,255,255,0.65);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .task-props-close {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      color: rgba(255,255,255,0.7) !important;
      flex-shrink: 0;
    }
    .task-props-close:hover { color: white !important; }
    .task-props-close mat-icon { font-size: 18px; width: 18px; height: 18px; }
    /* Saving indicator */
    .task-props-saving {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: #eff6ff;
      border-bottom: 1px solid #bfdbfe;
      font-size: 12px;
      color: #1d4ed8;
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
      color: #94a3b8;
      padding: 8px 16px 4px;
      margin-top: 4px;
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
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .task-props-cancel-btn {
      flex: 1;
      font-size: 13px !important;
      height: 36px !important;
      color: #64748b !important;
      border-color: #e2e8f0 !important;
    }
    .task-props-save-btn {
      flex: 2;
      font-size: 13px !important;
      height: 36px !important;
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
    .form-campo-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
    }
    .form-campo-input {
      flex: 1;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 12px;
      min-width: 0;
      min-height: 28px;
      box-sizing: border-box;
    }
    .form-campo-input:focus {
      outline: 2px solid #1565c0;
      border-color: #1565c0;
    }
    .form-campo-select {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px;
      font-size: 12px;
      max-width: 90px;
      min-height: 28px;
      box-sizing: border-box;
    }
    .form-campo-select:focus {
      outline: 2px solid #1565c0;
      border-color: #1565c0;
    }
    .form-campo-req {
      display: flex;
      align-items: center;
      font-size: 16px;
      color: #e53935;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }
    .form-campo-req input[type=checkbox] { margin-right: 2px; }

    /* Responsive */
    @media (max-width: 768px) {
      .task-props-panel {
        width: min(320px, 100vw);
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
  isLoadingForms = false;

  // --- Tab Formulario — Sprint 4.3 ---
  propsPanelTab: 'props' | 'formulario' = 'props';
  formCampos: Array<{ nombre: string; etiqueta: string; tipo: TipoCampo; obligatorio: boolean }> = [];
  isLoadingFormTab = false;
  isSavingFormTab = false;
  private loadedFormularioId: string | null = null;

  propsForm!: FormGroup;
  departmentsList: { id: string; nombre: string }[] = [];
  cargosList: string[] = [];
  formulariosList: { id: string; nombre: string }[] = [];
  /** Actividades cargadas desde el backend para esta política. */
  activitiesList: Actividad[] = [];

  // AI Chat panel
  showAiPanel = false;
  chatMessages: ChatMessage[] = [];
  aiPrompt = '';
  isAiLoading = false;
  isListening = false;
  private recognition: any = null;

  currentUserEmail: string | null = null;

  private modeler: any = null;
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private politicaService: PoliticaService,
    private roleService: RoleService,
    private formularioService: FormularioService,
    private actividadService: ActividadService,
    private departmentService: DepartmentService,
    private aiService: AiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private collaborationService: CollaborationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.propsForm = this.fb.group({
      nombre:            [''],
      descripcion:       [''],
      area:              [''],
      cargoRequerido:    [''],
      formularioId:      [''],
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
    this.loadFormularios();
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

  private scrollMessages(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  // ── UserTask Properties Panel — Sprint 3.5 ────────────────

  private loadFormularios(): void {
    this.isLoadingForms = true;
    this.formularioService.getAll({ page: 0, size: 100 }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (page) => {
        this.formulariosList = page.content.map(f => ({ id: f.id, nombre: f.nombre }));
        this.isLoadingForms = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando formularios para el panel:', err);
        this.isLoadingForms = false;
        this.cdr.detectChanges();
      }
    });
  }

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

    // Extract form reference from BPMN documentation block
    const docs: Array<Record<string, unknown>> =
      (el.businessObject?.['documentation'] as Array<Record<string, unknown>>) ?? [];
    const docText: string = docs.length > 0
      ? ((docs[0]['text'] ?? docs[0]['$body'] ?? '') as string)
      : '';
    const formMatch = docText.match(/FORM:([a-zA-Z0-9]+)/i);
    const docFormId: string = formMatch ? formMatch[1] : '';

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
        formularioId:      matchedActividad.formularioId ?? docFormId,
        slaHoras:          matchedActividad.tiempoLimiteHoras ?? null,
        accionesPermitidas: matchedActividad.accionesPermitidas ?? []
      }, { emitEvent: false });

      // Load cargos for the area if one is set
      if (resolvedAreaId) {
        this.loadCargosForArea(resolvedAreaId);
      } else {
        this.cargosList = [];
      }
    } else {
      // No backend match: prefill from BPMN XML only
      this.propsForm.patchValue({
        nombre:            boName,
        descripcion:       '',
        area:              '',
        cargoRequerido:    '',
        formularioId:      docFormId,
        slaHoras:          null,
        accionesPermitidas: []
      }, { emitEvent: false });

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

  // ── Tab Formulario — Sprint 4.3 ────────────────────────────

  switchPropsTab(tab: 'props' | 'formulario'): void {
    this.propsPanelTab = tab;
    if (tab === 'formulario') {
      const fId = this.propsForm.get('formularioId')?.value as string;
      if (fId && fId !== this.loadedFormularioId) {
        this.loadFormularioTab(fId);
      } else if (!fId) {
        this.formCampos = [];
        this.loadedFormularioId = null;
      }
    }
    this.cdr.detectChanges();
  }

  private loadFormularioTab(formularioId: string): void {
    this.isLoadingFormTab = true;
    this.cdr.detectChanges();
    this.formularioService.getById(formularioId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (f) => {
        this.loadedFormularioId = f.id;
        const allCampos: CampoFormulario[] = f.secciones?.flatMap(s => s.campos) ?? [];
        this.formCampos = allCampos.map(c => ({
          nombre: c.nombre,
          etiqueta: c.etiqueta,
          tipo: c.tipo,
          obligatorio: c.obligatorio
        }));
        this.isLoadingFormTab = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingFormTab = false;
        this.snackBar.open('Error al cargar el formulario', 'Cerrar', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  addCampo(): void {
    this.formCampos = [...this.formCampos, { nombre: '', etiqueta: '', tipo: 'TEXT', obligatorio: false }];
    this.cdr.detectChanges();
  }

  removeCampo(idx: number): void {
    this.formCampos = this.formCampos.filter((_, i) => i !== idx);
    this.cdr.detectChanges();
  }

  saveFormularioTab(): void {
    if (this.isSavingFormTab) return;
    const campos = this.formCampos.filter(c => c.nombre.trim());
    if (campos.length === 0) {
      this.snackBar.open('Agregá al menos un campo', 'Cerrar', { duration: 3000 });
      return;
    }
    const seccion = {
      titulo: 'Principal',
      orden: 1,
      campos: campos.map((c, i) => ({
        id: '',
        nombre: c.nombre.trim(),
        etiqueta: c.etiqueta.trim() || c.nombre.trim(),
        tipo: c.tipo,
        obligatorio: c.obligatorio,
        orden: i + 1
      }))
    };
    this.isSavingFormTab = true;
    this.cdr.detectChanges();

    const existingId = this.propsForm.get('formularioId')?.value as string;
    const actividadNombre = this.selectedActividad?.nombre || this.selectedElementName || 'Formulario';

    if (existingId) {
      const req: UpdateFormularioRequest = { secciones: [seccion] };
      this.formularioService.update(existingId, req).pipe(takeUntil(this.destroy$)).subscribe({
        next: (f) => this.onFormularioSaved(f),
        error: () => this.onFormularioSaveError()
      });
    } else {
      const req: CreateFormularioRequest = {
        nombre: actividadNombre,
        descripcion: `Formulario del paso ${actividadNombre}`,
        secciones: [seccion]
      };
      this.formularioService.create(req).pipe(takeUntil(this.destroy$)).subscribe({
        next: (f) => {
          this.propsForm.patchValue({ formularioId: f.id }, { emitEvent: false });
          if (this.selectedActividad?.id) {
            this.actividadService.updatePropiedades(this.selectedActividad.id, { formularioId: f.id })
              .pipe(takeUntil(this.destroy$)).subscribe();
          }
          this.onFormularioSaved(f);
        },
        error: () => this.onFormularioSaveError()
      });
    }
  }

  private onFormularioSaved(f: FormularioResponse): void {
    this.loadedFormularioId = f.id;
    this.isSavingFormTab = false;
    this.snackBar.open('Formulario guardado', 'Cerrar', { duration: 2500 });
    this.cdr.detectChanges();
  }

  private onFormularioSaveError(): void {
    this.isSavingFormTab = false;
    this.snackBar.open('Error al guardar el formulario', 'Cerrar', { duration: 4000 });
    this.cdr.detectChanges();
  }

  closePropertiesPanel(): void {
    this.selectedElement = null;
    this.selectedActividad = null;
    this.selectedElementName = '';
    this.cargosList = [];
    this.propsPanelTab = 'props';
    this.formCampos = [];
    this.loadedFormularioId = null;
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
      formularioId: string;
      slaHoras: number | null;
      accionesPermitidas: AccionPermitida[];
    };

    this.isSavingProps = true;
    this.cdr.detectChanges();

    // 1. Update the BPMN element name + documentation in the modeler
    const modeling = this.modeler.get('modeling');
    const moddle = this.modeler.get('moddle');

    let docText = '';
    if (formValue.formularioId) {
      docText += `FORM:${formValue.formularioId}`;
    }

    const docElement = moddle.create('bpmn:Documentation', { text: docText });
    modeling.updateProperties(this.selectedElement, {
      name: formValue.nombre,
      documentation: docText ? [docElement] : []
    });
    this.isDirty = true;
    this.autoSave$.next();

    // 2. Persist to backend if we have a matching actividad
    if (this.selectedActividad?.id) {
      this.actividadService.updatePropiedades(this.selectedActividad.id, {
        nombre:            formValue.nombre || undefined,
        descripcion:       formValue.descripcion || undefined,
        area:              formValue.area || undefined,
        cargoRequerido:    formValue.cargoRequerido || undefined,
        formularioId:      formValue.formularioId || undefined,
        slaHoras:          formValue.slaHoras ?? undefined,
        accionesPermitidas: formValue.accionesPermitidas.length > 0 ? formValue.accionesPermitidas : undefined
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
