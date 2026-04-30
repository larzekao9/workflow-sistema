import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { ChatMessage, ApiChatMessage, ChatResponse } from '../../models/chat.model';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <!-- FAB flotante -->
    <button
      mat-fab
      class="chatbot-fab"
      color="primary"
      (click)="togglePanel()"
      [attr.aria-label]="isOpen ? 'Cerrar asistente virtual' : 'Abrir asistente virtual'"
      [attr.aria-expanded]="isOpen"
      matTooltip="{{ isOpen ? 'Cerrar chat' : 'Asistente virtual' }}"
      matTooltipPosition="left">
      <mat-icon aria-hidden="true">{{ isOpen ? 'close' : 'smart_toy' }}</mat-icon>
    </button>

    <!-- Panel de chat -->
    <div
      class="chat-panel"
      [class.chat-panel--open]="isOpen"
      role="dialog"
      aria-label="Asistente virtual"
      aria-modal="false"
      [attr.aria-hidden]="!isOpen">

      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-info">
          <mat-icon class="chat-header-icon" aria-hidden="true">smart_toy</mat-icon>
          <div>
            <p class="chat-header-title">Asistente Virtual</p>
            <p class="chat-header-subtitle">Powered by IA</p>
          </div>
        </div>
        <button
          mat-icon-button
          (click)="clearHistory()"
          aria-label="Limpiar conversación"
          matTooltip="Limpiar conversación"
          class="chat-clear-btn">
          <mat-icon aria-hidden="true">delete_outline</mat-icon>
        </button>
      </div>

      <!-- Mensajes -->
      <div
        #messagesContainer
        class="chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Historial de conversación">

        <ng-container *ngFor="let msg of messages; trackBy: trackById">
          <div
            class="message-row"
            [class.message-row--user]="msg.role === 'user'"
            [class.message-row--assistant]="msg.role === 'assistant'">
            <div
              class="message-bubble"
              [class.message-bubble--user]="msg.role === 'user'"
              [class.message-bubble--assistant]="msg.role === 'assistant'"
              [attr.aria-label]="(msg.role === 'user' ? 'Tú: ' : 'Asistente: ') + msg.content">
              {{ msg.content }}
            </div>
          </div>
        </ng-container>

        <!-- Indicador de typing -->
        <div *ngIf="isLoading" class="message-row message-row--assistant" aria-label="El asistente está escribiendo">
          <div class="message-bubble message-bubble--assistant typing-indicator">
            <span class="dot dot--1" aria-hidden="true"></span>
            <span class="dot dot--2" aria-hidden="true"></span>
            <span class="dot dot--3" aria-hidden="true"></span>
          </div>
        </div>

        <!-- Estado vacío (solo saludo) -->
        <ng-container *ngIf="messages.length === 0 && !isLoading">
          <div class="chat-empty" role="status">
            <mat-icon aria-hidden="true">chat_bubble_outline</mat-icon>
            <p>Hola! ¿En qué puedo ayudarte hoy?</p>
          </div>
        </ng-container>
      </div>

      <!-- Formulario dinámico (FILL_FORM) -->
      <div *ngIf="pendingForm" class="chat-dynamic-form" [formGroup]="dynamicForm">
        <p class="form-title">Completá el formulario:</p>
        <div class="form-fields-scroll">
          <ng-container *ngFor="let field of pendingForm.fields">
            <mat-form-field appearance="outline" class="form-field-full" subscriptSizing="dynamic">
              <mat-label>{{ asString(field['label']) || asString(field['nombre']) }}</mat-label>
              <input matInput [formControlName]="asString(field['nombre'])" [required]="!!field['required']">
            </mat-form-field>
          </ng-container>
        </div>
        <button mat-flat-button color="primary" (click)="submitPendingForm()"
          [disabled]="dynamicForm.invalid || isLoading" style="width:100%;margin-top:8px">
          Enviar formulario
        </button>
      </div>

      <!-- Input -->
      <div class="chat-input-area">
        <mat-form-field appearance="outline" class="chat-input-field" subscriptSizing="dynamic">
          <mat-label>Escribí tu consulta</mat-label>
          <textarea
            matInput
            [formControl]="messageControl"
            (keydown.enter)="onEnterKey($event)"
            placeholder="Consultá sobre trámites, políticas..."
            rows="1"
            style="resize:none;overflow:hidden;max-height:80px;"
            aria-label="Campo de mensaje al asistente">
          </textarea>
        </mat-form-field>

        <button
          mat-icon-button
          color="primary"
          class="chat-send-btn"
          (click)="sendMessage()"
          [disabled]="isLoading || messageControl.invalid"
          aria-label="Enviar mensaje">
          <ng-container *ngIf="isLoading; else sendIcon">
            <mat-spinner diameter="20" aria-hidden="true"></mat-spinner>
          </ng-container>
          <ng-template #sendIcon>
            <mat-icon aria-hidden="true">send</mat-icon>
          </ng-template>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── FAB flotante ─────────────────────────────────────── */
    :host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }

    .chatbot-fab {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .chatbot-fab:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    }

    /* ── Panel de chat ────────────────────────────────────── */
    .chat-panel {
      width: 360px;
      max-height: 520px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;

      /* Animación de apertura/cierre */
      transform: scale(0.85) translateY(24px);
      opacity: 0;
      pointer-events: none;
      transition:
        transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.22s ease;
      transform-origin: bottom right;
    }

    .chat-panel--open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* ── Header ───────────────────────────────────────────── */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 8px 12px 16px;
      background: #1565c0;
      color: #fff;
      flex-shrink: 0;
    }

    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chat-header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      opacity: 0.9;
    }

    .chat-header-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .chat-header-subtitle {
      margin: 0;
      font-size: 0.7rem;
      opacity: 0.75;
      line-height: 1.2;
    }

    .chat-clear-btn {
      color: rgba(255, 255, 255, 0.85) !important;
    }

    .chat-clear-btn:hover {
      color: #fff !important;
    }

    /* ── Área de mensajes ─────────────────────────────────── */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f8f9fa;
      scroll-behavior: smooth;
    }

    .message-row {
      display: flex;
    }

    .message-row--user {
      justify-content: flex-end;
    }

    .message-row--assistant {
      justify-content: flex-start;
    }

    .message-bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 0.84rem;
      line-height: 1.45;
      word-break: break-word;
    }

    .message-bubble--user {
      background: #1565c0;
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .message-bubble--assistant {
      background: #fff;
      color: #212121;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }

    /* ── Typing indicator ─────────────────────────────────── */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 16px;
      min-width: 60px;
    }

    .dot {
      display: block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #9e9e9e;
      animation: typing-bounce 1.2s infinite ease-in-out;
    }

    .dot--1 { animation-delay: 0s; }
    .dot--2 { animation-delay: 0.2s; }
    .dot--3 { animation-delay: 0.4s; }

    @keyframes typing-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Estado vacío ─────────────────────────────────────── */
    .chat-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 40px 16px;
      color: #9e9e9e;
      flex: 1;
    }

    .chat-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .chat-empty p {
      margin: 0;
      font-size: 0.85rem;
      text-align: center;
    }

    /* ── Input area ───────────────────────────────────────── */
    .chat-input-area {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 8px 8px 8px 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      background: #fff;
      flex-shrink: 0;
    }

    .chat-input-field {
      flex: 1;
      font-size: 0.85rem;
    }

    /* Reducir tamaño del mat-form-field en panel pequeño */
    .chat-input-field ::ng-deep .mat-mdc-form-field-infix {
      min-height: 40px;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }

    .chat-send-btn {
      flex-shrink: 0;
      margin-bottom: 4px;
    }

    .chat-dynamic-form {
      padding: 8px 12px 10px;
      border-top: 1px solid #e0e0e0;
      background: #f5f7ff;
      flex-shrink: 0;
    }
    .form-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; color: #3f51b5; }
    .form-fields-scroll {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 4px;
    }
    .form-field-full { width: 100%; }

    /* ── Responsive: móvil ────────────────────────────────── */
    @media (max-width: 480px) {
      :host {
        bottom: 16px;
        right: 16px;
      }

      .chat-panel {
        width: calc(100vw - 32px);
        max-height: 70vh;
        border-radius: 12px;
      }
    }

    /* ── Scrollbar suave ──────────────────────────────────── */
    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 2px;
    }
  `],
})
export class ChatbotComponent {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  isOpen = false;
  isLoading = false;
  messages: ChatMessage[] = [];
  pendingForm: { tramiteId: string; fields: Record<string, unknown>[] } | null = null;
  dynamicForm: FormGroup = new FormGroup({});

  readonly messageControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private chatService: ChatService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {}

  togglePanel(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen && this.messages.length === 0) {
      this.addAssistantMessage(
        '¡Hola! Soy tu asistente virtual. Puedo ayudarte a consultar trámites, políticas y más. ¿En qué te puedo ayudar?'
      );
    }

    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  sendMessage(): void {
    const text = this.messageControl.value.trim();
    if (!text || this.isLoading) return;

    this.messageControl.reset();

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    this.messages = [...this.messages, userMsg];
    this.isLoading = true;
    this.messageControl.disable();
    this.cdr.markForCheck();
    this.scrollToBottom();

    const apiMessages: ApiChatMessage[] = this.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    this.chatService
      .sendMessage(apiMessages)
      .pipe(
        catchError(err => {
          console.error('[Chatbot] Error al enviar mensaje:', err);
          const errorMsg =
            (err?.error?.message as string | undefined) ??
            'No se pudo conectar con el asistente. Intentá de nuevo.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.messageControl.enable();
          this.cdr.markForCheck();
          this.scrollToBottom();
        }),
      )
      .subscribe(response => {
        if (response) {
          this.addAssistantMessage(response.reply);
          this.handleAction(response);
        }
      });
  }

  private handleAction(response: ChatResponse): void {
    if (response.action === 'FILL_FORM' && response.tramiteId && response.fields?.length) {
      this.pendingForm = { tramiteId: response.tramiteId, fields: response.fields };
      const controls: Record<string, FormControl> = {};
      for (const f of response.fields) {
        const isRequired = f['required'] ?? f['requerido'];
        controls[f['nombre'] as string] = new FormControl('', isRequired ? [Validators.required] : []);
      }
      this.dynamicForm = this.fb.group(controls);
      this.cdr.markForCheck();
    }
  }

  submitPendingForm(): void {
    if (!this.pendingForm || this.dynamicForm.invalid) return;
    const campos = this.dynamicForm.value as Record<string, string>;
    const tramiteId = this.pendingForm.tramiteId;
    this.pendingForm = null;
    this.isLoading = true;
    this.messageControl.disable();
    this.cdr.markForCheck();

    this.chatService.submitForm(tramiteId, campos)
      .pipe(
        catchError(() => {
          this.snackBar.open('Error al enviar el formulario.', 'Cerrar', { duration: 4000 });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.messageControl.enable();
          this.cdr.markForCheck();
          this.scrollToBottom();
        }),
      )
      .subscribe(response => {
        if (response) this.addAssistantMessage(response.reply);
      });
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.sendMessage();
    }
  }

  clearHistory(): void {
    this.messages = [];
    // addAssistantMessage ya llama cdr.markForCheck()
    this.addAssistantMessage('¡Hola! Conversación reiniciada. ¿En qué puedo ayudarte?');
  }

  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }

  private addAssistantMessage(content: string): void {
    const msg: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    this.messages = [...this.messages, msg];
    this.cdr.markForCheck();
    this.scrollToBottom();
  }

  asString(val: unknown): string {
    return val as string ?? '';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
