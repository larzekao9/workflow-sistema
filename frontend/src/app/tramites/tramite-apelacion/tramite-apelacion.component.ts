import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TramiteService } from '../../shared/services/tramite.service';
import { Tramite, FileRef } from '../../shared/models/tramite.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tramite-apelacion',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatCardModule, MatProgressBarModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="apelacion-shell">

      <div class="apelacion-header">
        <button mat-icon-button [routerLink]="['/tramites', tramiteId]" aria-label="Volver al trámite">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Corregir y apelar</h1>
      </div>

      <div *ngIf="isLoading" class="apelacion-loading" role="status">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <ng-container *ngIf="!isLoading && tramite">

        <mat-card class="info-card">
          <mat-card-content>
            <p><strong>Trámite:</strong> {{ tramite.politicaNombre }} (v{{ tramite.politicaVersion }})</p>
            <p *ngIf="tramite.apelacion?.motivoOriginal">
              <strong>Motivo de la observación:</strong> {{ tramite.apelacion!.motivoOriginal }}
            </p>
            <p *ngIf="tramite.apelacion?.fechaLimite">
              <strong>Plazo límite:</strong> {{ tramite.apelacion!.fechaLimite | date:'dd/MM/yyyy HH:mm' }}
            </p>
          </mat-card-content>
        </mat-card>

        <div *ngIf="apelacionVencida" class="vencido-banner" role="alert">
          <mat-icon aria-hidden="true">timer_off</mat-icon>
          <span>El plazo de apelación ha vencido. No podés enviar documentación.</span>
        </div>

        <mat-card *ngIf="!apelacionVencida" class="form-card">
          <mat-card-header>
            <mat-card-title>Tu apelación</mat-card-title>
            <mat-card-subtitle>Adjuntá la documentación corregida y explicá los cambios realizados.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>

            <div class="upload-zone" (click)="fileInput.click()" role="button" tabindex="0"
              (keydown.enter)="fileInput.click()" aria-label="Seleccionar archivos">
              <mat-icon aria-hidden="true">upload_file</mat-icon>
              <span>Hacé clic para adjuntar documentos</span>
              <small>PDF, JPG, PNG, DOC, DOCX — máx. 10 MB por archivo</small>
              <input #fileInput type="file" multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                (change)="onFilesSelected($event)"
                [disabled]="isUploading"
                style="display:none">
            </div>

            <mat-progress-bar *ngIf="isUploading" mode="indeterminate" style="margin-top:8px"></mat-progress-bar>

            <div *ngIf="archivosSubidos.length > 0" class="archivos-list">
              <div *ngFor="let f of archivosSubidos" class="archivo-item">
                <mat-icon aria-hidden="true">attach_file</mat-icon>
                <span>{{ f.nombre }}</span>
                <button mat-icon-button (click)="eliminarArchivo(f)"
                  [attr.aria-label]="'Eliminar ' + f.nombre">
                  <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                </button>
              </div>
            </div>

            <mat-form-field appearance="outline" style="width:100%;margin-top:20px">
              <mat-label>Justificación</mat-label>
              <textarea matInput [formControl]="justificacionControl" rows="5"
                placeholder="Explicá las correcciones realizadas y por qué debería aprobarse tu apelación..."
                aria-label="Justificación de la apelación">
              </textarea>
              <mat-error *ngIf="justificacionControl.hasError('required')">La justificación es obligatoria.</mat-error>
              <mat-error *ngIf="justificacionControl.hasError('minlength')">Ingresá al menos 10 caracteres.</mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary"
              (click)="enviarApelacion()"
              [disabled]="isEnviando || justificacionControl.invalid"
              style="margin-top:8px"
              aria-label="Enviar apelación">
              <mat-spinner *ngIf="isEnviando" diameter="18"
                style="display:inline-block;margin-right:6px;vertical-align:middle">
              </mat-spinner>
              <mat-icon *ngIf="!isEnviando" aria-hidden="true">send</mat-icon>
              Enviar apelación
            </button>

          </mat-card-content>
        </mat-card>

      </ng-container>
    </div>
  `,
  styles: [`
    .apelacion-shell { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
    .apelacion-header { display: flex; align-items: center; gap: 8px; }
    .apelacion-header h1 { margin: 0; font-size: 1.4rem; font-weight: 700; color: #1a237e; }
    .apelacion-loading { display: flex; justify-content: center; padding: 64px 0; }
    .info-card { background: #f9f9f9; }
    .vencido-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 18px; background: #ffebee;
      border: 1px solid #ef9a9a; border-radius: 8px; color: #b71c1c;
    }
    .upload-zone {
      border: 2px dashed #90caf9; border-radius: 8px; padding: 24px;
      text-align: center; cursor: pointer; display: flex;
      flex-direction: column; align-items: center; gap: 6px; color: #1565c0;
      transition: background 150ms;
    }
    .upload-zone:hover { background: #e3f2fd; }
    .upload-zone mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .upload-zone small { color: #757575; font-size: 0.8rem; }
    .archivos-list { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
    .archivo-item { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; padding: 4px 8px; background: #f5f5f5; border-radius: 4px; }
    .archivo-item span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class TramiteApelacionComponent implements OnInit, OnDestroy {
  tramiteId = '';
  tramite: Tramite | null = null;
  isLoading = true;
  isUploading = false;
  isEnviando = false;
  apelacionVencida = false;
  archivosSubidos: FileRef[] = [];

  justificacionControl = new FormControl('', [Validators.required, Validators.minLength(10)]);

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramiteService: TramiteService,
    private readonly http: HttpClient,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.tramiteId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.tramiteId) { this.router.navigate(['/tramites']); return; }

    this.tramiteService.getById(this.tramiteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (t) => {
        this.tramite = t;
        this.isLoading = false;
        if (t.apelacion?.fechaLimite) {
          this.apelacionVencida = new Date(t.apelacion.fechaLimite).getTime() < Date.now();
        }
        if (t.estado !== 'EN_APELACION') {
          this.router.navigate(['/tramites', this.tramiteId]);
        }
      },
      error: () => { this.isLoading = false; this.router.navigate(['/tramites']); }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    this.isUploading = true;

    const uploads = Array.from(files).map(file => {
      const fd = new FormData();
      fd.append('file', file);
      return this.http.post<FileRef>(`${environment.apiUrl}/files/upload`, fd).toPromise();
    });

    Promise.all(uploads)
      .then(refs => {
        this.archivosSubidos.push(...refs.filter((r): r is FileRef => !!r));
        this.isUploading = false;
      })
      .catch(() => {
        this.isUploading = false;
        this.snackBar.open('Error al subir uno o más archivos', 'Cerrar', { duration: 3500 });
      });
  }

  eliminarArchivo(f: FileRef): void {
    this.archivosSubidos = this.archivosSubidos.filter(a => a.fileId !== f.fileId);
  }

  enviarApelacion(): void {
    if (this.justificacionControl.invalid || !this.tramiteId) return;
    this.isEnviando = true;
    const fileIds = this.archivosSubidos.map(f => f.fileId);

    this.tramiteService.apelar(this.tramiteId, this.justificacionControl.value!, fileIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Apelación enviada correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tramites', this.tramiteId]);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isEnviando = false;
          this.snackBar.open(
            err?.error?.message || 'Error al enviar la apelación',
            'Cerrar', { duration: 4000 }
          );
        }
      });
  }
}
