import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PoliticaService } from '../../shared/services/politica.service';

@Component({
  selector: 'app-new-policy',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="new-policy-shell">

      <!-- Panel izquierdo: hero -->
      <aside class="hero-panel">
        <button mat-icon-button routerLink="/policies" class="back-btn" matTooltip="Volver a políticas">
          <mat-icon>arrow_back</mat-icon>
        </button>

        <div class="hero-body">
          <div class="hero-icon-wrap">
            <mat-icon class="hero-icon">account_tree</mat-icon>
          </div>
          <h1 class="hero-title">Nueva Política<br>de Negocio</h1>
          <p class="hero-sub">Define el nombre y el departamento, luego diseña el flujo completo en el editor visual.</p>

          <div class="steps-track">
            <div class="step-item done">
              <div class="step-dot"><mat-icon>edit_note</mat-icon></div>
              <span>Información básica</span>
            </div>
            <div class="step-line"></div>
            <div class="step-item next">
              <div class="step-dot"><mat-icon>device_hub</mat-icon></div>
              <span>Diseñar flujo</span>
            </div>
            <div class="step-line"></div>
            <div class="step-item">
              <div class="step-dot"><mat-icon>rocket_launch</mat-icon></div>
              <span>Publicar</span>
            </div>
          </div>
        </div>

        <div class="hero-footer">
          <mat-icon class="tip-icon">lightbulb</mat-icon>
          <span>Podrás agregar actividades, roles y formularios desde el editor de flujo.</span>
        </div>
      </aside>

      <!-- Panel derecho: formulario -->
      <main class="form-panel">
        <div class="form-card">
          <div class="form-card-header">
            <span class="badge">Paso 1 de 2</span>
            <h2>Información básica</h2>
            <p>Solo lo esencial para empezar. El resto lo defines en el editor.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="form-body">

            <mat-form-field appearance="outline" class="field-full">
              <mat-label>Nombre de la política *</mat-label>
              <input
                matInput
                formControlName="nombre"
                placeholder="Ej: Aprobación de créditos, Registro de proveedores..."
                autocomplete="off" />
              <mat-icon matPrefix class="field-prefix">label</mat-icon>
              <mat-hint align="end">{{ form.get('nombre')?.value?.length || 0 }}/120</mat-hint>
              <mat-error *ngIf="form.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
              <mat-error *ngIf="form.get('nombre')?.hasError('maxlength')">Máximo 120 caracteres</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-full">
              <mat-label>Departamento *</mat-label>
              <input
                matInput
                formControlName="departamento"
                placeholder="Ej: Recursos Humanos, Finanzas, Legal..."
                autocomplete="off" />
              <mat-icon matPrefix class="field-prefix">business</mat-icon>
              <mat-error *ngIf="form.get('departamento')?.hasError('required')">El departamento es obligatorio</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-full">
              <mat-label>Descripción <span class="optional-label">(opcional)</span></mat-label>
              <textarea
                matInput
                formControlName="descripcion"
                rows="3"
                placeholder="¿Para qué sirve esta política? ¿Qué proceso automatiza?"></textarea>
              <mat-icon matPrefix class="field-prefix">notes</mat-icon>
            </mat-form-field>

            <div *ngIf="errorMessage" class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <div class="form-actions">
              <button
                mat-button
                type="button"
                routerLink="/policies"
                [disabled]="isSaving"
                class="cancel-btn">
                Cancelar
              </button>
              <button
                mat-raised-button
                type="submit"
                class="submit-btn"
                [disabled]="form.invalid || isSaving">
                <mat-spinner *ngIf="isSaving" diameter="18" class="btn-spinner"></mat-spinner>
                <mat-icon *ngIf="!isSaving">arrow_forward</mat-icon>
                <span>{{ isSaving ? 'Creando...' : 'Crear y abrir editor' }}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .new-policy-shell {
      display: grid;
      grid-template-columns: 380px 1fr;
      height: 100%;
    }

    /* ── PANEL IZQUIERDO ── */
    .hero-panel {
      background: linear-gradient(160deg, #1a237e 0%, #283593 40%, #0d47a1 100%);
      color: white;
      display: flex;
      flex-direction: column;
      padding: 28px 32px;
      position: relative;
      overflow: hidden;
    }

    .hero-panel::before {
      content: '';
      position: absolute;
      top: -80px;
      right: -80px;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
      pointer-events: none;
    }

    .hero-panel::after {
      content: '';
      position: absolute;
      bottom: 60px;
      left: -60px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      pointer-events: none;
    }

    .back-btn {
      color: rgba(255,255,255,0.7) !important;
      align-self: flex-start;
      margin-bottom: 8px;
    }
    .back-btn:hover { color: white !important; }

    .hero-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .hero-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      backdrop-filter: blur(4px);
    }

    .hero-icon {
      font-size: 34px;
      width: 34px;
      height: 34px;
      color: white;
    }

    .hero-title {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.25;
      margin: 0 0 12px;
      letter-spacing: -0.3px;
    }

    .hero-sub {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255,255,255,0.72);
      margin: 0 0 40px;
    }

    /* Steps track */
    .steps-track {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      font-weight: 500;
    }

    .step-item.done { color: rgba(255,255,255,0.95); }
    .step-item.next { color: rgba(255,255,255,0.75); }

    .step-dot {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .step-item.done .step-dot {
      background: rgba(255,255,255,0.25);
    }

    .step-dot mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: inherit;
    }

    .step-line {
      width: 2px;
      height: 20px;
      background: rgba(255,255,255,0.15);
      margin-left: 17px;
    }

    /* Hero footer */
    .hero-footer {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 12px;
      color: rgba(255,255,255,0.65);
      line-height: 1.5;
      position: relative;
      z-index: 1;
    }

    .tip-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #ffd54f;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── PANEL DERECHO ── */
    .form-panel {
      background: #f5f5f7;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 32px;
      overflow-y: auto;
    }

    .form-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
      padding: 40px 44px;
      width: 100%;
      max-width: 520px;
    }

    .form-card-header {
      margin-bottom: 32px;
    }

    .badge {
      display: inline-block;
      background: #e8eaf6;
      color: #3949ab;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 14px;
    }

    .form-card-header h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px;
      color: #1a237e;
    }

    .form-card-header p {
      font-size: 14px;
      color: rgba(0,0,0,0.5);
      margin: 0;
      line-height: 1.5;
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-full { width: 100%; }

    .field-prefix {
      font-size: 18px;
      color: rgba(0,0,0,0.38);
      margin-right: 4px;
    }

    .optional-label {
      font-size: 12px;
      color: rgba(0,0,0,0.4);
      font-weight: 400;
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff3f3;
      border: 1px solid #ffcdd2;
      border-radius: 10px;
      padding: 12px 16px;
      color: #c62828;
      font-size: 13px;
      margin-top: 4px;
    }

    .error-banner mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .cancel-btn {
      color: rgba(0,0,0,0.45) !important;
      font-size: 14px;
    }

    .submit-btn {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%) !important;
      color: white !important;
      border-radius: 12px !important;
      padding: 0 24px !important;
      height: 44px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      box-shadow: 0 4px 14px rgba(26,35,126,0.35) !important;
      transition: box-shadow 0.2s, transform 0.15s !important;
    }

    .submit-btn:not([disabled]):hover {
      box-shadow: 0 6px 20px rgba(26,35,126,0.45) !important;
      transform: translateY(-1px);
    }

    .submit-btn[disabled] {
      opacity: 0.55 !important;
    }

    .btn-spinner {
      display: inline-block;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .new-policy-shell {
        grid-template-columns: 1fr;
        height: auto;
        overflow: auto;
      }
      .hero-panel {
        padding: 24px 24px 32px;
        min-height: unset;
      }
      .hero-body { justify-content: flex-start; padding-top: 8px; }
      .hero-title { font-size: 22px; }
      .steps-track { display: none; }
      :host { height: auto; overflow: auto; }
      .form-panel { padding: 24px 16px; }
      .form-card { padding: 28px 24px; }
    }
  `]
})
export class NewPolicyComponent {
  private readonly destroyRef = inject(DestroyRef);

  form: FormGroup;
  isSaving = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      departamento: ['', Validators.required],
      descripcion: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSaving = true;
    this.errorMessage = null;

    this.politicaService.create(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (politica) => {
          this.isSaving = false;
          this.snackBar.open(`"${politica.nombre}" creada — bienvenido al editor`, '', { duration: 3000 });
          this.router.navigate(['/policies', politica.id, 'flow']);
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.message || 'Error al crear la política. Intentá nuevamente.';
        }
      });
  }
}
