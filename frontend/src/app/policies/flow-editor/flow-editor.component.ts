import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ViewEncapsulation, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
import { AiService } from '../../shared/services/ai.service';
import { AuthService } from '../../shared/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Politica } from '../../shared/models/politica.model';
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
    <div #bpmnCanvas class="bpmn-canvas"></div>

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
    private aiService: AiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private collaborationService: CollaborationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id');
    if (!this.politicaId) {
      this.router.navigate(['/policies']);
      return;
    }
    this.currentUserEmail = this.authService.getCurrentUser()?.email ?? null;
    this.loadData();

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
  }
}
