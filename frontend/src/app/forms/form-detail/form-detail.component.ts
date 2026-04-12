import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

import { FormularioService } from '../../shared/services/formulario.service';
import { FormularioResponse, EstadoFormulario } from '../../shared/models/formulario.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-form-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  template: `
    <div class="page-header">
      <button mat-button routerLink="/forms">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
      <div class="header-actions" *ngIf="formulario">
        <button mat-stroked-button color="accent" [routerLink]="['/forms', formulario.id, 'edit']">
          <mat-icon>edit</mat-icon>
          Editar
        </button>
        <button mat-stroked-button color="warn" (click)="eliminar()">
          <mat-icon>delete</mat-icon>
          Eliminar
        </button>
      </div>
    </div>

    <div *ngIf="isLoading" class="loading-container">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <ng-container *ngIf="!isLoading && formulario">
      <mat-card class="info-card">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-field">
              <span class="info-label">Nombre</span>
              <span class="info-value">{{ formulario.nombre }}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Estado</span>
              <mat-chip [ngClass]="getEstadoClass(formulario.estado)" selected>
                {{ formulario.estado }}
              </mat-chip>
            </div>
            <div class="info-field full-width">
              <span class="info-label">Descripcion</span>
              <span class="info-value">{{ formulario.descripcion || '—' }}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Creado en</span>
              <span class="info-value">{{ formulario.creadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Ultima actualizacion</span>
              <span class="info-value">{{ formulario.actualizadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <h2 class="secciones-title">
        Secciones ({{ formulario.secciones.length }})
      </h2>

      <mat-accordion>
        <mat-expansion-panel
          *ngFor="let seccion of formulario.secciones; let i = index"
          [expanded]="i === 0">
          <mat-expansion-panel-header>
            <mat-panel-title>
              {{ seccion.titulo }}
            </mat-panel-title>
            <mat-panel-description>
              {{ seccion.campos.length }} campo{{ seccion.campos.length !== 1 ? 's' : '' }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="campos-list">
            <div *ngFor="let campo of seccion.campos" class="campo-item">
              <div class="campo-header">
                <span class="campo-etiqueta">{{ campo.etiqueta }}</span>
                <mat-chip class="tipo-chip">{{ campo.tipo }}</mat-chip>
                <mat-chip *ngIf="campo.obligatorio" class="required-chip">Obligatorio</mat-chip>
              </div>
              <div class="campo-meta">
                <span class="meta-item"><strong>Nombre técnico:</strong> {{ campo.nombre }}</span>
                <span class="meta-item" *ngIf="campo.placeholder"><strong>Placeholder:</strong> {{ campo.placeholder }}</span>
                <span class="meta-item" *ngIf="campo.valorDefecto"><strong>Valor por defecto:</strong> {{ campo.valorDefecto }}</span>
                <span class="meta-item" *ngIf="campo.opciones?.length">
                  <strong>Opciones:</strong> {{ campo.opciones!.join(', ') }}
                </span>
              </div>
            </div>
            <div *ngIf="seccion.campos.length === 0" class="no-campos">
              Sin campos configurados
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <div *ngIf="formulario.secciones.length === 0" class="empty-state">
        <mat-icon>inbox</mat-icon>
        <p>Este formulario no tiene secciones configuradas</p>
      </div>
    </ng-container>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header-actions { display: flex; gap: 8px; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .info-card { margin-bottom: 24px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width { grid-column: 1 / -1; }
    .info-field { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 12px; color: rgba(0,0,0,0.5); font-weight: 500; text-transform: uppercase; }
    .info-value { font-size: 15px; }
    .secciones-title { font-size: 18px; font-weight: 500; margin: 0 0 12px; }
    .campos-list { display: flex; flex-direction: column; gap: 12px; }
    .campo-item {
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 6px;
      padding: 12px;
    }
    .campo-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .campo-etiqueta { font-weight: 500; font-size: 14px; flex: 1; }
    .tipo-chip { background-color: #e3f2fd !important; color: #1565c0 !important; font-size: 11px !important; }
    .required-chip { background-color: #fce4ec !important; color: #c62828 !important; font-size: 11px !important; }
    .campo-meta { display: flex; flex-direction: column; gap: 2px; }
    .meta-item { font-size: 12px; color: rgba(0,0,0,0.6); }
    .no-campos { text-align: center; color: #888; padding: 16px; font-size: 13px; }
    .empty-state {
      text-align: center;
      padding: 48px;
      color: rgba(0,0,0,0.4);
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .chip-activo   { background-color: #4caf50 !important; color: white !important; }
    .chip-inactivo { background-color: #9e9e9e !important; color: white !important; }
  `]
})
export class FormDetailComponent implements OnInit {
  formulario: FormularioResponse | null = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formularioService: FormularioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/forms']);
      return;
    }
    this.isLoading = true;
    this.formularioService.getById(id).subscribe({
      next: (f) => {
        this.formulario = f;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err?.error?.message || 'Error al cargar el formulario', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/forms']);
      }
    });
  }

  getEstadoClass(estado: EstadoFormulario): string {
    return estado === 'ACTIVO' ? 'chip-activo' : 'chip-inactivo';
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
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.formulario) return;
      this.formularioService.delete(this.formulario.id).subscribe({
        next: () => {
          this.snackBar.open('Formulario eliminado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/forms']);
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al eliminar', 'Cerrar', { duration: 4000 })
      });
    });
  }
}
