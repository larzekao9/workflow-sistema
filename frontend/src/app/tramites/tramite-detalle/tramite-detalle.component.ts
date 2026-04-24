import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectorRef,
  Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

import { Form } from '@bpmn-io/form-js-viewer';
import { environment } from '../../../environments/environment';

import { TramiteService } from '../../shared/services/tramite.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import {
  Tramite,
  EstadoTramite,
  AccionTramite,
  AvanzarTramiteRequest,
  FormularioActualResponse,
  EstadoConfig,
  HistorialEntry,
  RespuestaFormulario,
  FileRef,
  estadoConfig as getEstadoConfig
} from '../../shared/models/tramite.model';

// ─────────────────────────────────────────────────────────────────────────────
// Dialog de confirmación / observaciones
// ─────────────────────────────────────────────────────────────────────────────
interface AccionDialogData {
  title: string;
  accion: AccionTramite;
  requireObs: boolean;
}

interface AccionDialogResult {
  confirmed: boolean;
  observaciones?: string;
}

import { Component as NgComponent } from '@angular/core';

@NgComponent({
  selector: 'app-accion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p style="margin:0 0 16px;color:#5f6368">
        {{ data.requireObs
            ? 'Ingresá las observaciones para continuar.'
            : '¿Confirmás esta acción? No se puede deshacer.' }}
      </p>
      <mat-form-field *ngIf="data.requireObs" appearance="outline" style="width:100%">
        <mat-label>Observaciones</mat-label>
        <textarea
          matInput
          [formControl]="obsControl"
          rows="4"
          [required]="data.requireObs"
          placeholder="Describí el motivo o instrucciones..."
          aria-label="Observaciones para la acción">
        </textarea>
        <mat-error *ngIf="obsControl.hasError('required')">
          Las observaciones son obligatorias para esta acción.
        </mat-error>
        <mat-error *ngIf="obsControl.hasError('minlength')">
          Ingresá al menos 5 caracteres.
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="gap:8px;padding:16px">
      <button mat-stroked-button (click)="cancel()" aria-label="Cancelar acción">Cancelar</button>
      <button
        mat-raised-button
        [color]="data.accion === 'RECHAZAR' ? 'warn' : 'primary'"
        (click)="confirm()"
        [disabled]="data.requireObs && obsControl.invalid"
        [attr.aria-label]="'Confirmar ' + data.title">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class AccionDialogComponent {
  obsControl = this.fb.control(
    '',
    this.data.requireObs ? [Validators.required, Validators.minLength(5)] : []
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<AccionDialogComponent, AccionDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AccionDialogData
  ) {}

  confirm(): void {
    if (this.data.requireObs && this.obsControl.invalid) return;
    this.ref.close({ confirmed: true, observaciones: this.obsControl.value ?? undefined });
  }

  cancel(): void {
    this.ref.close({ confirmed: false });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog de asignación manual de funcionario
// ─────────────────────────────────────────────────────────────────────────────
interface AsignarDialogData {
  tramiteId: string;
  funcionarios: User[];
}

interface AsignarDialogResult {
  confirmed: boolean;
  funcionarioId?: string;
}

@NgComponent({
  selector: 'app-asignar-funcionario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>Asignar funcionario</h2>
    <mat-dialog-content>
      <p style="margin:0 0 20px;color:#5f6368;font-size:0.9rem">
        Seleccioná el funcionario que se hará cargo de este trámite.
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Funcionario</mat-label>
        <mat-select [formControl]="funcionarioControl" aria-label="Seleccionar funcionario">
          <mat-option
            *ngFor="let f of data.funcionarios"
            [value]="f.id">
            {{ f.nombreCompleto }}
            <span
              *ngIf="f.departmentNombre"
              style="font-size:0.78rem;color:#9e9e9e">
              &nbsp;— {{ f.departmentNombre }}
            </span>
          </mat-option>
        </mat-select>
        <mat-error *ngIf="funcionarioControl.hasError('required')">
          Debés seleccionar un funcionario.
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="gap:8px;padding:16px">
      <button mat-stroked-button (click)="cancel()" aria-label="Cancelar asignación">
        Cancelar
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="confirm()"
        [disabled]="funcionarioControl.invalid"
        aria-label="Confirmar asignación de funcionario">
        Asignar
      </button>
    </mat-dialog-actions>
  `
})
export class AsignarFuncionarioDialogComponent {
  funcionarioControl = new FormControl<string>('', { validators: [Validators.required], nonNullable: true });

  constructor(
    private readonly ref: MatDialogRef<AsignarFuncionarioDialogComponent, AsignarDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarDialogData
  ) {}

  confirm(): void {
    if (this.funcionarioControl.invalid) return;
    this.ref.close({ confirmed: true, funcionarioId: this.funcionarioControl.value });
  }

  cancel(): void {
    this.ref.close({ confirmed: false });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatTooltipModule,
    MatCardModule,
    MatListModule,
    MatExpansionModule
  ],
  template: `
    <div class="detalle-shell">

      <!-- Top bar de navegación -->
      <div class="detalle-top-bar">
        <button
          mat-icon-button
          routerLink="/tramites"
          matTooltip="Volver a trámites"
          aria-label="Volver a la lista de trámites">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="top-bar-info">
          <h1 class="detalle-titulo">
            {{ tramite?.politicaNombre || 'Trámite' }}
            <span *ngIf="tramite" class="version-tag">v{{ tramite.politicaVersion }}</span>
          </h1>
          <p class="top-bar-meta" *ngIf="tramite?.clienteNombre">
            <mat-icon aria-hidden="true" style="font-size:14px;width:14px;height:14px">person</mat-icon>
            Iniciado por: <strong>{{ tramite!.clienteNombre }}</strong>
            &nbsp;·&nbsp;
            {{ tramite!.creadoEn | date:'dd/MM/yyyy' }}
          </p>
        </div>
        <span
          *ngIf="tramite"
          class="estado-chip {{ estadoConfig(tramite.estado).cssClass }}"
          [attr.aria-label]="'Estado actual: ' + estadoConfig(tramite.estado).label">
          {{ estadoConfig(tramite.estado).label }}
        </span>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="detalle-loading" role="status" aria-label="Cargando trámite">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <ng-container *ngIf="!isLoading && tramite">

        <!-- ────────── PANEL CLIENTE ────────── -->
        <ng-container *ngIf="esCliente()">

          <!-- Estado actual (solo lectura) -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar aria-hidden="true">info</mat-icon>
              <mat-card-title>Estado de tu trámite</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item" *ngIf="tramite.etapaActual">
                  <span class="info-label">Etapa actual</span>
                  <span class="info-value">{{ tramite.etapaActual.nombre }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual?.responsableRolNombre">
                  <span class="info-label">Equipo responsable</span>
                  <span class="info-value">{{ tramite.etapaActual!.responsableRolNombre }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual?.area">
                  <span class="info-label">Área responsable</span>
                  <span class="info-value">{{ tramite.etapaActual!.area }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Fecha de inicio</span>
                  <span class="info-value">{{ tramite.creadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.fechaVencimientoEtapa">
                  <span class="info-label">Vencimiento de etapa</span>
                  <span class="info-value vence">{{ tramite.fechaVencimientoEtapa | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Banner DEVUELTO -->
          <div
            *ngIf="tramite.estado === 'DEVUELTO'"
            class="status-banner banner-warn"
            role="alert">
            <div class="banner-icon">
              <mat-icon aria-hidden="true">reply</mat-icon>
            </div>
            <div class="banner-body">
              <strong>Tu trámite fue devuelto</strong>
              <p *ngIf="ultimaDevolucion?.observaciones">
                <em>Motivo:</em> {{ ultimaDevolucion!.observaciones }}
              </p>
              <p *ngIf="!ultimaDevolucion?.observaciones">
                El responsable solicitó correcciones.
              </p>
              <button
                mat-raised-button
                color="warn"
                [routerLink]="['/tramites', tramite.id, 'correccion']"
                aria-label="Responder ahora la corrección del trámite">
                <mat-icon>reply</mat-icon>
                Responder Ahora
              </button>
            </div>
          </div>

          <!-- Banner EN_APELACION -->
          <div
            *ngIf="tramite.estado === 'EN_APELACION'"
            class="status-banner banner-apelacion"
            role="alert">
            <div class="banner-icon">
              <mat-icon aria-hidden="true">gavel</mat-icon>
            </div>
            <div class="banner-body">
              <strong *ngIf="tramite.apelacion?.estado === 'PENDIENTE'">Tu trámite fue observado — tenés plazo para apelar</strong>
              <strong *ngIf="tramite.apelacion?.estado === 'EN_REVISION'">Tu apelación está siendo revisada</strong>
              <p *ngIf="tramite.apelacion?.motivoOriginal">
                <em>Motivo:</em> {{ tramite.apelacion!.motivoOriginal }}
              </p>
              <p *ngIf="tramite.apelacion?.fechaLimite && tramite.apelacion?.estado === 'PENDIENTE'">
                Plazo: {{ tramite.apelacion!.fechaLimite | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <button
                mat-raised-button
                color="primary"
                *ngIf="tramite.apelacion?.estado === 'PENDIENTE'"
                [routerLink]="['/tramites', tramite.id, 'apelacion']"
                aria-label="Ir a enviar apelación">
                <mat-icon>send</mat-icon>
                Enviar apelación
              </button>
            </div>
          </div>

          <!-- Banner COMPLETADO -->
          <div
            *ngIf="tramite.estado === 'COMPLETADO'"
            class="status-banner banner-success"
            role="status">
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            <span>Tu trámite fue completado correctamente.</span>
          </div>

          <!-- Banner RECHAZADO -->
          <div
            *ngIf="tramite.estado === 'RECHAZADO'"
            class="status-banner banner-error"
            role="alert">
            <mat-icon aria-hidden="true">cancel</mat-icon>
            <div>
              <strong>Tu trámite fue rechazado</strong>
              <p *ngIf="ultimoRechazo?.observaciones">{{ ultimoRechazo!.observaciones }}</p>
            </div>
          </div>

        </ng-container>

        <!-- ────────── PANEL FUNCIONARIO / ADMIN ────────── -->
        <ng-container *ngIf="!esCliente()">

          <!-- Info card -->
          <mat-card class="info-card">
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Política</span>
                  <span class="info-value">{{ tramite.politicaNombre }} (v{{ tramite.politicaVersion }})</span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual">
                  <span class="info-label">Etapa actual</span>
                  <span class="info-value">{{ tramite.etapaActual.nombre }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual?.responsableRolNombre">
                  <span class="info-label">Responsable</span>
                  <span class="info-value">{{ tramite.etapaActual!.responsableRolNombre }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual?.area">
                  <span class="info-label">Área responsable</span>
                  <span class="info-value">{{ tramite.etapaActual!.area }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.asignadoAId">
                  <span class="info-label">Funcionario asignado</span>
                  <span class="info-value asignado-value">
                    <mat-icon aria-hidden="true" class="asignado-icon">person</mat-icon>
                    {{ tramite.asignadoANombre || tramite.asignadoAId }}
                  </span>
                </div>
                <div class="info-item" *ngIf="tramite.etapaActual?.area">
                  <span class="info-label">Área responsable</span>
                  <span class="info-value">{{ tramite.etapaActual!.area }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Creado</span>
                  <span class="info-value">{{ tramite.creadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="info-item" *ngIf="tramite.fechaVencimientoEtapa">
                  <span class="info-label">Vence etapa</span>
                  <span class="info-value vence">{{ tramite.fechaVencimientoEtapa | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Alerta: sin funcionario asignado -->
          <div
            *ngIf="tramite.estado === 'SIN_ASIGNAR'"
            class="status-banner banner-sin-asignar"
            role="alert"
            aria-live="assertive">
            <div class="banner-icon">
              <mat-icon aria-hidden="true">person_off</mat-icon>
            </div>
            <div class="banner-body">
              <strong>Sin funcionario asignado</strong>
              <p>Este trámite no tiene un funcionario responsable. Asigná uno manualmente para que pueda ser atendido.</p>
              <button
                *ngIf="esAdmin()"
                mat-raised-button
                color="primary"
                class="btn-asignar"
                (click)="abrirDialogAsignar()"
                [disabled]="isAsignando"
                aria-label="Asignar funcionario manualmente a este trámite">
                <mat-spinner *ngIf="isAsignando" diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
                <mat-icon *ngIf="!isAsignando" aria-hidden="true">assignment_ind</mat-icon>
                Asignar manualmente
              </button>
            </div>
          </div>

          <!-- Panel revisión apelación -->
          <mat-card *ngIf="tramite.apelacion?.estado === 'EN_REVISION'" class="apelacion-revision-card">
            <mat-card-header>
              <mat-icon mat-card-avatar aria-hidden="true">gavel</mat-icon>
              <mat-card-title>Apelación pendiente de resolución</mat-card-title>
              <mat-card-subtitle>El solicitante ha enviado su apelación. Revisá y resolvé.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p *ngIf="tramite.apelacion?.motivoOriginal">
                <strong>Motivo original:</strong> {{ tramite.apelacion!.motivoOriginal }}
              </p>
              <p *ngIf="tramite.apelacion?.justificacionCliente">
                <strong>Justificación del cliente:</strong> {{ tramite.apelacion!.justificacionCliente }}
              </p>
              <div *ngIf="tramite.apelacion?.documentosApelatoria?.length" class="docs-list">
                <strong>Documentación adjunta:</strong>
                <ul>
                  <li *ngFor="let d of tramite.apelacion!.documentosApelatoria">
                    <mat-icon aria-hidden="true" style="font-size:14px;vertical-align:middle">attach_file</mat-icon>
                    {{ d.nombre }}
                  </li>
                </ul>
              </div>
              <mat-form-field appearance="outline" style="width:100%;margin-top:12px">
                <mat-label>Observaciones (opcional)</mat-label>
                <textarea matInput [formControl]="apelacionObsControl" rows="3"
                  placeholder="Dejá un comentario para el solicitante..."
                  aria-label="Observaciones sobre la resolución de la apelación">
                </textarea>
              </mat-form-field>
              <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;align-items:center">
                <button mat-raised-button color="primary"
                  (click)="resolverApelacionFn(true)"
                  [disabled]="isActuando"
                  aria-label="Aprobar apelación y reactivar trámite">
                  <mat-icon>thumb_up</mat-icon>
                  Aprobar apelación
                </button>
                <button mat-raised-button color="warn"
                  (click)="resolverApelacionFn(false)"
                  [disabled]="isActuando"
                  aria-label="Denegar apelación">
                  <mat-icon>thumb_down</mat-icon>
                  Denegar apelación
                </button>
                <mat-spinner *ngIf="isActuando" diameter="24" aria-label="Procesando"></mat-spinner>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Panel de decisión (trámites activos) -->
          <mat-card *ngIf="puedeAccionar()" class="decision-card">
            <mat-card-header>
              <mat-icon mat-card-avatar aria-hidden="true">gavel</mat-icon>
              <mat-card-title>Tomar decisión</mat-card-title>
              <mat-card-subtitle>Seleccioná una acción para avanzar el trámite</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <!-- Observaciones inline -->
              <mat-form-field appearance="outline" class="obs-field">
                <mat-label>Observaciones</mat-label>
                <textarea
                  matInput
                  [formControl]="obsInlineControl"
                  rows="3"
                  placeholder="Opcional para Aprobar/Escalar. Obligatorio para Rechazar/Devolver."
                  aria-label="Observaciones para la decisión">
                </textarea>
                <mat-hint align="end">
                  {{ obsInlineControl.value?.length || 0 }} / 500
                </mat-hint>
              </mat-form-field>

              <!-- Botones de acción -->
              <div class="decision-actions">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="ejecutarAccionInline('APROBAR')"
                  [disabled]="isActuando"
                  aria-label="Aprobar trámite">
                  <mat-icon>check_circle</mat-icon>
                  Aprobar
                </button>
                <button
                  mat-raised-button
                  color="accent"
                  (click)="ejecutarAccionInline('DEVOLVER')"
                  [disabled]="isActuando || !obsInlineControl.value?.trim()"
                  aria-label="Devolver trámite al solicitante"
                  matTooltip="Requerido: observaciones">
                  <mat-icon>reply</mat-icon>
                  Devolver
                </button>
                <button
                  mat-raised-button
                  color="warn"
                  (click)="ejecutarAccionInline('RECHAZAR')"
                  [disabled]="isActuando || !obsInlineControl.value?.trim()"
                  aria-label="Rechazar trámite"
                  matTooltip="Requerido: observaciones">
                  <mat-icon>cancel</mat-icon>
                  Rechazar
                </button>
                <button
                  mat-stroked-button
                  (click)="ejecutarAccionInline('ESCALAR')"
                  [disabled]="isActuando"
                  aria-label="Escalar trámite">
                  <mat-icon>escalator_warning</mat-icon>
                  Escalar
                </button>
                <button
                  mat-stroked-button
                  color="warn"
                  (click)="ejecutarObservarDenegar('observar')"
                  [disabled]="isActuando || !obsInlineControl.value?.trim()"
                  aria-label="Observar trámite y abrir período de apelación"
                  matTooltip="Requerido: observaciones como motivo">
                  <mat-icon>visibility_off</mat-icon>
                  Observar
                </button>
                <button
                  mat-raised-button
                  color="warn"
                  (click)="ejecutarObservarDenegar('denegar')"
                  [disabled]="isActuando || !obsInlineControl.value?.trim()"
                  aria-label="Denegar trámite con período de apelación"
                  matTooltip="Requerido: observaciones como motivo">
                  <mat-icon>block</mat-icon>
                  Denegar (con apelación)
                </button>
                <mat-spinner
                  *ngIf="isActuando"
                  diameter="24"
                  aria-label="Procesando acción">
                </mat-spinner>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Badge estado final -->
          <div
            *ngIf="!puedeAccionar()"
            class="estado-final-block"
            [class]="'estado-final-block--' + tramite.estado.toLowerCase()"
            role="status">
            <mat-icon aria-hidden="true">{{ iconoEstadoFinal() }}</mat-icon>
            <span>Este trámite está en estado <strong>{{ estadoConfig(tramite.estado).label }}</strong> y no requiere más acciones.</span>
          </div>

        </ng-container>

        <!-- ────────── Formulario form-js (todos los roles) ────────── -->
        <mat-card *ngIf="hasFormulario" class="formulario-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon aria-hidden="true">dynamic_form</mat-icon>
              Formulario de la etapa
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="isLoadingFormulario" class="formulario-loading" role="status">
              <mat-spinner diameter="32"></mat-spinner>
            </div>
            <div #formjsContainer class="formjs-canvas" [class.hidden]="isLoadingFormulario"></div>
          </mat-card-content>
        </mat-card>

        <!-- ────────── Datos de etapas anteriores (todos los roles) ────────── -->
        <mat-card *ngIf="respuestasFormulario.length > 0" class="respuestas-card">
          <mat-card-header>
            <mat-icon mat-card-avatar aria-hidden="true">assignment</mat-icon>
            <mat-card-title>Datos de etapas anteriores</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-accordion>
              <mat-expansion-panel
                *ngFor="let r of respuestasFormulario"
                [attr.aria-label]="'Datos de etapa: ' + r.actividadNombre">
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ r.actividadNombre }}</mat-panel-title>
                  <mat-panel-description>
                    {{ r.usuarioNombre }} &middot; {{ r.timestamp | date:'dd/MM/yyyy HH:mm' }}
                  </mat-panel-description>
                </mat-expansion-panel-header>
                <!-- Campos del formulario -->
                <div class="campos-grid" *ngIf="(r.campos | keyvalue).length > 0">
                  <div *ngFor="let campo of r.campos | keyvalue" class="campo-item">
                    <span class="campo-key">{{ campo.key }}</span>
                    <span class="campo-val">{{ campo.value }}</span>
                  </div>
                </div>
                <p *ngIf="(r.campos | keyvalue).length === 0" class="campos-vacios">
                  Sin datos de formulario registrados en esta etapa.
                </p>
                <!-- Archivos adjuntos -->
                <div *ngIf="r.archivos?.length" class="archivos-adjuntos">
                  <strong>Archivos adjuntos:</strong>
                  <a
                    *ngFor="let f of r.archivos"
                    [href]="getFileUrl(f.fileId)"
                    target="_blank"
                    rel="noopener"
                    class="archivo-link"
                    [attr.aria-label]="'Descargar archivo: ' + f.nombre">
                    <mat-icon aria-hidden="true">attach_file</mat-icon>{{ f.nombre }}
                  </a>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </mat-card-content>
        </mat-card>

        <!-- ────────── HISTORIAL (todos los roles) ────────── -->
        <mat-card class="historial-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon aria-hidden="true">history</mat-icon>
              Historial del trámite
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="tramite.historial.length === 0" class="historial-empty">
              Sin movimientos registrados aún.
            </div>
            <ol
              class="historial-list"
              *ngIf="tramite.historial.length > 0"
              aria-label="Historial de acciones del trámite">
              <li
                *ngFor="let entry of historialOrdenado; let last = last"
                class="historial-entry"
                [class.historial-entry--last]="last">

                <!-- Icono por acción -->
                <div
                  class="historial-icon historial-icon--{{ entry.accion.toLowerCase() }}"
                  [attr.aria-label]="'Acción: ' + entry.accion">
                  <mat-icon aria-hidden="true">{{ iconoAccion(entry.accion) }}</mat-icon>
                </div>

                <!-- Contenido -->
                <div class="historial-content">
                  <div class="historial-header">
                    <span
                      class="historial-accion accion-{{ entry.accion.toLowerCase() }}"
                      [attr.aria-label]="entry.accion">
                      {{ formatAccion(entry.accion) }}
                    </span>
                    <span class="historial-quien" *ngIf="entry.responsableNombre">
                      &mdash; {{ entry.responsableNombre }}
                    </span>
                    <time
                      class="historial-fecha"
                      [attr.datetime]="entry.timestamp">
                      {{ entry.timestamp | date:'dd/MM/yyyy HH:mm' }}
                    </time>
                  </div>
                  <div class="historial-etapa" *ngIf="entry.actividadNombre">
                    Etapa: {{ entry.actividadNombre }}
                  </div>
                  <blockquote class="historial-obs" *ngIf="entry.observaciones">
                    {{ entry.observaciones }}
                  </blockquote>
                </div>
              </li>
            </ol>
          </mat-card-content>
        </mat-card>

      </ng-container>
    </div>
  `,
  styles: [`
    .detalle-shell {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 960px;
    }

    /* Top bar */
    .detalle-top-bar {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .top-bar-info {
      flex: 1;
      min-width: 0;
    }

    .detalle-titulo {
      margin: 0 0 2px;
      font-size: 1.4rem;
      font-weight: 700;
      color: #1a237e;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .version-tag {
      font-size: 0.85rem;
      font-weight: 500;
      background: #e3f2fd;
      color: #0d47a1;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .top-bar-meta {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      color: #757575;
    }

    /* Loading */
    .detalle-loading {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    /* Estado chips */
    .estado-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .chip-iniciado   { background: #e0e0e0; color: #424242; }
    .chip-en-proceso { background: #e3f2fd; color: #0d47a1; }
    .chip-completado { background: #e8f5e9; color: #1b5e20; }
    .chip-rechazado  { background: #ffebee; color: #b71c1c; }
    .chip-devuelto   { background: #fff3e0; color: #e65100; }
    .chip-cancelado  { background: #eeeeee; color: #616161; }
    .chip-escalado     { background: #f3e5f5; color: #6a1b9a; }
    .chip-sin-asignar  { background: #fff8e1; color: #e65100; border: 1px solid #ffcc02; }
    .chip-en-apelacion { background: #e8eaf6; color: #283593; border: 1px solid #9fa8da; }

    .banner-apelacion {
      background: #e8eaf6; border: 1px solid #9fa8da; border-radius: 8px;
      padding: 14px 18px; display: flex; align-items: flex-start; gap: 14px; color: #283593;
    }
    .banner-apelacion .banner-icon { font-size: 24px; line-height: 1; }

    .apelacion-revision-card {
      border-left: 4px solid #1565c0;
    }
    .apelacion-revision-card p { margin: 4px 0; font-size: 0.9rem; }
    .docs-list ul { margin: 4px 0 0; padding-left: 18px; font-size: 0.875rem; }

    /* Info card */
    .info-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9e9e9e;
    }

    .info-value {
      font-size: 0.95rem;
      color: #212121;
    }

    .info-value.vence {
      color: #e65100;
      font-weight: 500;
    }

    /* Status banners */
    .status-banner {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 8px;
    }

    .status-banner mat-icon:first-child {
      font-size: 28px;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .banner-warn {
      background: #fff3e0;
      border: 1px solid #ffb74d;
    }

    .banner-warn mat-icon { color: #e65100; }

    .banner-warn .banner-body button {
      margin-top: 12px;
    }

    .banner-warn .banner-body p {
      margin: 6px 0 0;
      font-size: 0.9rem;
      color: #5d4037;
    }

    .banner-success {
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #1b5e20;
      align-items: center;
    }

    .banner-success mat-icon { color: #2e7d32; }

    .banner-error {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      color: #b71c1c;
    }

    .banner-error mat-icon { color: #c62828; }

    .banner-error p {
      margin: 6px 0 0;
      font-size: 0.9rem;
    }

    .banner-sin-asignar {
      background: #fff8e1;
      border: 1px solid #ffcc02;
      color: #5d4037;
    }

    .banner-sin-asignar .banner-icon mat-icon {
      color: #f9a825;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .banner-sin-asignar .banner-body p {
      margin: 6px 0 0;
      font-size: 0.9rem;
      color: #5d4037;
    }

    .btn-asignar {
      margin-top: 12px;
    }

    /* Asignado en info-grid */
    .asignado-value {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1b5e20;
      font-weight: 500;
    }

    .asignado-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .banner-icon {
      flex-shrink: 0;
    }

    .banner-body {
      flex: 1;
    }

    /* Decision card */
    .decision-card {
      border: 2px solid #1565c0;
      border-radius: 8px;
    }

    .decision-card mat-card-title {
      color: #1565c0;
    }

    .obs-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .decision-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    @media (max-width: 600px) {
      .decision-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .decision-actions button {
        width: 100%;
      }
    }

    /* Estado final block */
    .estado-final-block {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      color: #424242;
    }

    .estado-final-block mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .estado-final-block--completado   { background: #e8f5e9; border-color: #a5d6a7; color: #1b5e20; }
    .estado-final-block--rechazado    { background: #ffebee; border-color: #ef9a9a; color: #b71c1c; }
    .estado-final-block--cancelado    { background: #fafafa; border-color: #e0e0e0; color: #616161; }
    .estado-final-block--sin_asignar  { background: #fff8e1; border-color: #ffcc02; color: #e65100; }

    /* Formulario */
    .formulario-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .formulario-loading {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .formjs-canvas { min-height: 200px; }
    .formjs-canvas.hidden { display: none; }
    .formjs-canvas .fjs-container,
    .formjs-canvas .fjs-form { height: 100% !important; }

    /* Historial */
    .historial-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .historial-empty {
      color: #9e9e9e;
      font-style: italic;
      padding: 16px 0;
    }

    .historial-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .historial-entry {
      display: flex;
      gap: 16px;
      padding-bottom: 20px;
      position: relative;
    }

    .historial-entry--last {
      padding-bottom: 0;
    }

    /* Iconos por acción */
    .historial-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .historial-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .historial-icon--aprobar   { background: #e8f5e9; color: #1b5e20; }
    .historial-icon--rechazar  { background: #ffebee; color: #b71c1c; }
    .historial-icon--devolver  { background: #fff3e0; color: #e65100; }
    .historial-icon--escalar   { background: #f3e5f5; color: #6a1b9a; }
    .historial-icon--iniciar,
    .historial-icon--iniciado  { background: #e3f2fd; color: #0d47a1; }
    .historial-icon--responder,
    .historial-icon--respondido { background: #e1f5fe; color: #01579b; }
    .historial-icon--default   { background: #f5f5f5; color: #757575; }

    /* Línea vertical entre entradas */
    .historial-entry:not(.historial-entry--last) .historial-icon::after {
      content: '';
      position: absolute;
      top: 36px;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      bottom: -20px;
      background: #e0e0e0;
    }

    .historial-content {
      flex: 1;
      min-width: 0;
      padding-top: 6px;
    }

    .historial-header {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .historial-accion {
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .accion-aprobar   { color: #1b5e20; }
    .accion-rechazar  { color: #b71c1c; }
    .accion-devolver  { color: #e65100; }
    .accion-escalar   { color: #6a1b9a; }
    .accion-iniciar,
    .accion-iniciado  { color: #0d47a1; }
    .accion-responder,
    .accion-respondido { color: #01579b; }

    .historial-quien {
      font-size: 0.85rem;
      color: #424242;
    }

    .historial-fecha {
      font-size: 0.75rem;
      color: #9e9e9e;
      margin-left: auto;
      white-space: nowrap;
    }

    .historial-etapa {
      font-size: 0.8rem;
      color: #757575;
      margin-bottom: 4px;
    }

    .historial-obs {
      margin: 0;
      padding: 8px 12px;
      font-size: 0.875rem;
      color: #424242;
      background: #f5f5f5;
      border-left: 3px solid #1565c0;
      border-radius: 0 4px 4px 0;
    }

    /* Respuestas de etapas anteriores */
    .respuestas-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
    }

    .campos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .campo-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .campo-key {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #616161;
    }

    .campo-val {
      font-size: 0.875rem;
      color: #212121;
      word-break: break-word;
    }

    .campos-vacios {
      font-size: 0.875rem;
      color: #9e9e9e;
      font-style: italic;
      margin: 0 0 8px;
    }

    .archivos-adjuntos {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }

    .archivos-adjuntos strong {
      font-size: 0.875rem;
      color: #424242;
    }

    .archivo-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1565c0;
      font-size: 0.875rem;
      text-decoration: none;
    }

    .archivo-link:hover,
    .archivo-link:focus {
      text-decoration: underline;
      outline-offset: 2px;
    }

    .archivo-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class TramiteDetalleComponent implements OnInit, OnDestroy {
  @ViewChild('formjsContainer') containerRef!: ElementRef<HTMLDivElement>;

  tramite: Tramite | null = null;
  isLoading = true;
  isActuando = false;
  isAsignando = false;
  hasFormulario = false;
  isLoadingFormulario = false;

  obsInlineControl = new FormControl('');
  apelacionObsControl = new FormControl('');
  respuestasFormulario: RespuestaFormulario[] = [];
  private formData: Record<string, unknown> = {};

  private viewer: Form | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramiteService: TramiteService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/tramites']);
      return;
    }
    this.cargarTramite(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyViewer();
  }

  estadoConfig(estado: EstadoTramite): EstadoConfig {
    return getEstadoConfig(estado);
  }

  esCliente(): boolean {
    const rol = (this.authService.getCurrentUser()?.rolNombre ?? 'CLIENTE').toUpperCase();
    return !rol.includes('ADMIN') && !rol.includes('FUNCION');
  }

  esAdmin(): boolean {
    const rol = (this.authService.getCurrentUser()?.rolNombre ?? '').toUpperCase();
    return rol.includes('ADMIN');
  }

  puedeAccionar(): boolean {
    if (!this.tramite) return false;
    const estado = this.tramite.estado;
    if (estado !== 'INICIADO' && estado !== 'EN_PROCESO' && estado !== 'ESCALADO') return false;
    return !this.esCliente();
  }

  abrirDialogAsignar(): void {
    if (!this.tramite) return;
    const tramiteId = this.tramite.id;

    this.userService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users: User[]) => {
        const funcionarios = users.filter(
          u => (u.rolNombre ?? '').toUpperCase().includes('FUNCION')
        );

        if (funcionarios.length === 0) {
          this.snackBar.open('No hay funcionarios disponibles en el sistema.', 'Cerrar', { duration: 3500 });
          return;
        }

        const ref = this.dialog.open<AsignarFuncionarioDialogComponent, AsignarDialogData, AsignarDialogResult>(
          AsignarFuncionarioDialogComponent,
          {
            width: '400px',
            data: { tramiteId, funcionarios }
          }
        );

        ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
          if (!result?.confirmed || !result.funcionarioId) return;
          this.isAsignando = true;
          this.tramiteService.asignarManual(tramiteId, result.funcionarioId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (updated) => {
                this.tramite = updated;
                this.isAsignando = false;
                this.snackBar.open('Funcionario asignado correctamente.', 'Cerrar', { duration: 3000 });
                this.cdr.detectChanges();
              },
              error: (err: { error?: { message?: string } }) => {
                this.isAsignando = false;
                console.error('[TramiteDetalle] Error asignando funcionario:', err);
                this.snackBar.open(
                  err?.error?.message || 'Error al asignar el funcionario',
                  'Cerrar',
                  { duration: 4000 }
                );
              }
            });
        });
      },
      error: (err: unknown) => {
        console.error('[TramiteDetalle] Error cargando funcionarios:', err);
        this.snackBar.open('Error al cargar la lista de funcionarios.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  ejecutarObservarDenegar(tipo: 'observar' | 'denegar'): void {
    if (!this.tramite) return;
    const motivo = this.obsInlineControl.value?.trim() ?? '';
    if (!motivo) {
      this.snackBar.open('El motivo es obligatorio para esta acción.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.isActuando = true;
    const call$ = tipo === 'observar'
      ? this.tramiteService.observar(this.tramite.id, motivo)
      : this.tramiteService.denegar(this.tramite.id, motivo);

    call$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.tramite = updated;
        this.isActuando = false;
        this.obsInlineControl.reset();
        this.snackBar.open(
          tipo === 'observar'
            ? 'Trámite observado. El cliente puede apelar en 48 hs.'
            : 'Trámite denegado. El cliente puede apelar en 48 hs.',
          'Cerrar',
          { duration: 3500 }
        );
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.isActuando = false;
        this.snackBar.open(err?.error?.message || 'Error al procesar la acción', 'Cerrar', { duration: 4000 });
      }
    });
  }

  resolverApelacionFn(aprobada: boolean): void {
    if (!this.tramite) return;
    this.isActuando = true;
    const obs = this.apelacionObsControl.value?.trim() || undefined;

    this.tramiteService.resolverApelacion(this.tramite.id, aprobada, obs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.tramite = updated;
          this.isActuando = false;
          this.apelacionObsControl.reset();
          this.snackBar.open(
            aprobada ? 'Apelación aprobada. Trámite reactivado.' : 'Apelación denegada.',
            'Cerrar',
            { duration: 3000 }
          );
          this.cdr.detectChanges();
        },
        error: (err: { error?: { message?: string } }) => {
          this.isActuando = false;
          this.snackBar.open(err?.error?.message || 'Error al resolver la apelación', 'Cerrar', { duration: 4000 });
        }
      });
  }

  get historialOrdenado(): HistorialEntry[] {
    if (!this.tramite) return [];
    return [...this.tramite.historial].reverse();
  }

  get ultimaDevolucion(): HistorialEntry | null {
    if (!this.tramite) return null;
    const devoluciones = this.tramite.historial.filter(h => h.accion === 'DEVOLVER');
    return devoluciones.length > 0 ? devoluciones[devoluciones.length - 1] : null;
  }

  get ultimoRechazo(): HistorialEntry | null {
    if (!this.tramite) return null;
    const rechazos = this.tramite.historial.filter(h => h.accion === 'RECHAZAR');
    return rechazos.length > 0 ? rechazos[rechazos.length - 1] : null;
  }

  iconoAccion(accion: string): string {
    const map: Record<string, string> = {
      APROBAR:                  'check_circle',
      RECHAZAR:                 'cancel',
      DEVOLVER:                 'reply',
      ESCALAR:                  'escalator_warning',
      INICIAR:                  'play_arrow',
      INICIADO:                 'play_arrow',
      RESPONDER:                'chat',
      RESPONDIDO:               'chat',
      TOMADO:                   'person',
      ASIGNADO_AUTO:            'auto_awesome',
      ASIGNADO_MANUAL:          'assignment_ind',
      RESPONDIDO_POR_CLIENTE:   'send',
      OBSERVADO:                'visibility_off',
      DENEGADO_APELAR:          'block',
      APELADO:                  'gavel',
      APELACION_APROBADA:       'thumb_up',
      APELACION_DENEGADA:       'thumb_down',
      APELACION_VENCIDA:        'timer_off'
    };
    return map[accion.toUpperCase()] ?? 'circle';
  }

  formatAccion(accion: string): string {
    const map: Record<string, string> = {
      APROBAR:                  'Aprobado',
      RECHAZAR:                 'Rechazado',
      DEVOLVER:                 'Devuelto',
      ESCALAR:                  'Escalado',
      INICIAR:                  'Iniciado',
      INICIADO:                 'Iniciado',
      RESPONDER:                'Respondido',
      RESPONDIDO:               'Respondido',
      TOMADO:                   'Tomado',
      ASIGNADO_AUTO:            'Asignado automáticamente',
      ASIGNADO_MANUAL:          'Asignado manualmente',
      RESPONDIDO_POR_CLIENTE:   'Respondido por cliente',
      OBSERVADO:                'Observado',
      DENEGADO_APELAR:          'Denegado (con apelación)',
      APELADO:                  'Apelado',
      APELACION_APROBADA:       'Apelación aprobada',
      APELACION_DENEGADA:       'Apelación denegada',
      APELACION_VENCIDA:        'Apelación vencida'
    };
    return map[accion.toUpperCase()] ?? accion;
  }

  iconoEstadoFinal(): string {
    if (!this.tramite) return 'info';
    const map: Record<string, string> = {
      COMPLETADO:  'check_circle',
      RECHAZADO:   'cancel',
      CANCELADO:   'block',
      SIN_ASIGNAR: 'person_off'
    };
    return map[this.tramite.estado] ?? 'info';
  }

  ejecutarAccionInline(accion: AccionTramite): void {
    if (!this.tramite) return;

    const obs = this.obsInlineControl.value?.trim() ?? '';
    const requireObs = accion === 'DEVOLVER' || accion === 'RECHAZAR';

    if (requireObs && !obs) {
      this.snackBar.open('Las observaciones son requeridas para esta acción.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isActuando = true;
    const req: AvanzarTramiteRequest = {
      accion,
      observaciones: obs || undefined,
      camposFormulario: Object.keys(this.formData).length > 0 ? this.formData : undefined
    };

    this.tramiteService.avanzar(this.tramite.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.tramite = updated;
          this.isActuando = false;
          this.formData = {};
          this.obsInlineControl.reset();
          this.destroyViewer();
          this.hasFormulario = false;
          const labels: Record<AccionTramite, string> = {
            APROBAR:  'Trámite aprobado correctamente',
            RECHAZAR: 'Trámite rechazado',
            DEVOLVER: 'Trámite devuelto al solicitante',
            ESCALAR:  'Trámite escalado'
          };
          this.snackBar.open(labels[accion], 'Cerrar', { duration: 3000 });
          this.cdr.detectChanges();
        },
        error: (err: { error?: { message?: string } }) => {
          this.isActuando = false;
          console.error('[TramiteDetalle] Error en acción:', err);
          this.snackBar.open(
            err?.error?.message || 'Error al procesar la acción',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  private cargarTramite(id: string): void {
    this.isLoading = true;
    this.tramiteService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (t) => {
        this.tramite = t;
        this.isLoading = false;
        this.cdr.detectChanges();

        if (t.etapaActual?.formularioId && (t.estado === 'INICIADO' || t.estado === 'EN_PROCESO')) {
          this.cargarFormulario(id);
        }

        this.tramiteService.getRespuestas(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (r) => { this.respuestasFormulario = r; this.cdr.detectChanges(); },
          error: () => { /* silent — not critical */ }
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading = false;
        console.error('[TramiteDetalle] Error cargando trámite:', err);
        this.snackBar.open(
          err?.error?.message || 'Error al cargar el trámite',
          'Cerrar',
          { duration: 4000 }
        );
        this.router.navigate(['/tramites']);
      }
    });
  }

  private cargarFormulario(tramiteId: string): void {
    this.hasFormulario = true;
    this.isLoadingFormulario = true;
    this.tramiteService.getFormularioActual(tramiteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: FormularioActualResponse) => {
        this.isLoadingFormulario = false;
        if (res.formJsSchema) {
          this.cdr.detectChanges();
          setTimeout(() => this.initViewer(res.formJsSchema!), 50);
        } else {
          this.hasFormulario = false;
        }
      },
      error: (err: unknown) => {
        this.isLoadingFormulario = false;
        this.hasFormulario = false;
        console.error('[TramiteDetalle] Error cargando formulario:', err);
      }
    });
  }

  private initViewer(schema: object): void {
    if (!this.containerRef?.nativeElement) return;
    this.destroyViewer();
    this.viewer = new Form({ container: this.containerRef.nativeElement });
    this.viewer.on('submit', (event: object) => {
      const e = event as { data?: Record<string, unknown> };
      this.formData = e.data ?? {};
    });
    this.viewer.on('changed', (event: object) => {
      const e = event as { data?: Record<string, unknown> };
      this.formData = e.data ?? {};
    });
    this.viewer.importSchema(schema).catch((err: unknown) => {
      console.error('[TramiteDetalle] Error importando schema:', err);
    });
  }

  getFileUrl(fileId: string): string {
    return `${environment.apiUrl}/files/${fileId}`;
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}
