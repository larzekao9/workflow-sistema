import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../shared/services/auth.service';
import { RoleService } from '../../shared/services/role.service';
import { Role } from '../../shared/models/role.model';
import { RegisterRequest } from '../../shared/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Crear Cuenta</mat-card-title>
          <mat-card-subtitle>Sistema Workflow</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre completo</mat-label>
              <input matInput formControlName="nombreCompleto" placeholder="Juan Pérez" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="registerForm.get('nombreCompleto')?.hasError('required')">El nombre es obligatorio</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de usuario</mat-label>
              <input matInput formControlName="username" placeholder="juanperez" />
              <mat-icon matSuffix>account_circle</mat-icon>
              <mat-error *ngIf="registerForm.get('username')?.hasError('required')">El usuario es obligatorio</mat-error>
              <mat-error *ngIf="registerForm.get('username')?.hasError('minlength')">Mínimo 3 caracteres</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" placeholder="usuario@ejemplo.com" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">El correo es obligatorio</mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Ingresá un correo válido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.get('password')?.hasError('required')">La contraseña es obligatoria</mat-error>
              <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">Mínimo 6 caracteres</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Rol</mat-label>
              <mat-select formControlName="rolId">
                <mat-option *ngFor="let role of roles" [value]="role.id">
                  {{ role.nombre }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="registerForm.get('rolId')?.hasError('required')">Seleccioná un rol</mat-error>
            </mat-form-field>

            <div *ngIf="errorMessage" class="error-message">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width submit-btn"
              [disabled]="isLoading || registerForm.invalid">
              <mat-spinner *ngIf="isLoading" diameter="20" class="spinner-inline"></mat-spinner>
              <span *ngIf="!isLoading">Crear Cuenta</span>
            </button>

          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="login-link">
            ¿Ya tenés cuenta?
            <a routerLink="/login">Iniciá sesión</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      overflow-y: auto;
    }

    .register-card {
      width: 100%;
      max-width: 460px;
      padding: 16px;
      margin: 24px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .submit-btn {
      margin-top: 8px;
      height: 44px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      background: #fdecea;
      padding: 10px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .spinner-inline {
      display: inline-block;
    }

    .login-link {
      text-align: center;
      width: 100%;
      margin: 8px 0 0;
    }

    .login-link a {
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  roles: Role[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      nombreCompleto: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rolId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.roleService.getAll().subscribe({
      next: (roles) => { this.roles = roles; },
      error: () => { this.roles = []; }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const data: RegisterRequest = this.registerForm.value;

    this.authService.register(data).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Cuenta creada exitosamente. Iniciá sesión.', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Error al crear la cuenta. Intentá nuevamente.';
      }
    });
  }
}
