import { Component, OnInit, ViewChild, AfterViewInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { EmpresaService } from '../../shared/services/empresa.service';
import { UserService } from '../../shared/services/user.service';
import { Empresa } from '../../shared/models/empresa.model';
import { User } from '../../shared/models/user.model';
import { EmpresaFormDialogComponent } from '../empresa-form-dialog/empresa-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

// ── Dialog asignar admin ──────────────────────────────────────────────────────
interface AsignarAdminDialogData { empresa: Empresa; administradores: User[]; }

@Component({
  selector: 'app-asignar-admin-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule,
            MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Asignar administrador</h2>
    <mat-dialog-content>
      <p>Empresa: <strong>{{ data.empresa.nombre }}</strong></p>
      <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
        <mat-label>Seleccioná un administrador</mat-label>
        <mat-select [formControl]="ctrl">
          <mat-option *ngFor="let u of data.administradores" [value]="u.id">
            {{ u.nombreCompleto }} — {{ u.email }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary"
        [disabled]="!ctrl.value"
        (click)="confirmar()">Asignar</button>
    </mat-dialog-actions>
  `
})
export class AsignarAdminDialogComponent {
  ctrl = new FormControl<string>('');
  constructor(
    public dialogRef: MatDialogRef<AsignarAdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarAdminDialogData
  ) {
    if (data.empresa.adminPrincipalId) this.ctrl.setValue(data.empresa.adminPrincipalId);
  }
  confirmar(): void { this.dialogRef.close(this.ctrl.value); }
}

@Component({
  selector: 'app-empresas-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    AsignarAdminDialogComponent
  ],
  template: `
    <div class="page-header">
      <h1>Gestión de Empresas</h1>
      <button
        mat-raised-button
        color="primary"
        (click)="openCreateDialog()"
        aria-label="Crear nueva empresa">
        <mat-icon>business</mat-icon>
        Nueva Empresa
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Buscar empresa</mat-label>
          <input
            matInput
            (keyup)="applyFilter($event)"
            placeholder="Nombre, razón social, ciudad..."
            aria-label="Filtrar empresas" />
          <mat-icon matSuffix aria-hidden="true">search</mat-icon>
        </mat-form-field>

        <div *ngIf="isLoading" class="loading-container" role="status" aria-label="Cargando empresas">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource" matSort aria-label="Tabla de empresas">

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
              <td mat-cell *matCellDef="let empresa">
                <strong>{{ empresa.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="razonSocial">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Razón Social</th>
              <td mat-cell *matCellDef="let empresa">{{ empresa.razonSocial || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="ciudad">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ciudad</th>
              <td mat-cell *matCellDef="let empresa">{{ empresa.ciudad || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="pais">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>País</th>
              <td mat-cell *matCellDef="let empresa">{{ empresa.pais || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="activa">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let empresa">
                <mat-chip [color]="empresa.activa ? 'primary' : 'warn'" selected>
                  {{ empresa.activa ? 'Activa' : 'Inactiva' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="adminPrincipal">
              <th mat-header-cell *matHeaderCellDef>Administrador</th>
              <td mat-cell *matCellDef="let empresa">
                <span *ngIf="empresa.adminPrincipalNombre" class="admin-asignado">
                  <mat-icon aria-hidden="true" class="admin-icon">person</mat-icon>
                  {{ empresa.adminPrincipalNombre }}
                </span>
                <span *ngIf="!empresa.adminPrincipalNombre" class="admin-sin">Sin asignar</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let empresa">
                <button
                  mat-icon-button
                  color="accent"
                  (click)="openAsignarAdminDialog(empresa)"
                  [matTooltip]="'Asignar administrador a ' + empresa.nombre"
                  [attr.aria-label]="'Asignar admin a ' + empresa.nombre">
                  <mat-icon>manage_accounts</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="primary"
                  (click)="openEditDialog(empresa)"
                  [matTooltip]="'Editar ' + empresa.nombre"
                  [attr.aria-label]="'Editar empresa ' + empresa.nombre">
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  (click)="confirmDelete(empresa)"
                  [matTooltip]="'Eliminar ' + empresa.nombre"
                  [attr.aria-label]="'Eliminar empresa ' + empresa.nombre">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron empresas
              </td>
            </tr>
          </table>

          <mat-paginator
            [pageSizeOptions]="[10, 25, 50]"
            showFirstLastButtons
            aria-label="Paginación de empresas">
          </mat-paginator>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-header h1 { margin: 0; font-size: 24px; }
    .filter-field { width: 100%; margin-bottom: 16px; }
    .table-container { overflow-x: auto; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    table { width: 100%; }
    .admin-asignado { display: flex; align-items: center; gap: 4px; font-size: 0.875rem; color: #1565c0; }
    .admin-icon { font-size: 16px; width: 16px; height: 16px; }
    .admin-sin { font-size: 0.8rem; color: #9e9e9e; font-style: italic; }

    @media (max-width: 600px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .page-header h1 { font-size: 20px; }
    }
  `]
})
export class EmpresasListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'razonSocial', 'ciudad', 'pais', 'activa', 'adminPrincipal', 'acciones'];
  dataSource = new MatTableDataSource<Empresa>();
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private empresaService: EmpresaService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadEmpresas(): void {
    this.isLoading = true;
    this.empresaService.getAll().subscribe({
      next: (empresas) => {
        this.dataSource.data = empresas;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar las empresas',
          'Cerrar',
          { duration: 4000 }
        );
        console.error('Error cargando empresas:', err);
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openAsignarAdminDialog(empresa: Empresa): void {
    this.userService.getAll().subscribe({
      next: (users: User[]) => {
        const administradores = users.filter(
          u => (u.rolNombre ?? '').toUpperCase().includes('ADMIN') &&
               !(u.rolNombre ?? '').toUpperCase().includes('SUPER')
        );
        if (administradores.length === 0) {
          this.snackBar.open('No hay administradores disponibles', 'Cerrar', { duration: 3500 });
          return;
        }
        const ref = this.dialog.open<AsignarAdminDialogComponent, AsignarAdminDialogData, string>(
          AsignarAdminDialogComponent,
          { width: '420px', data: { empresa, administradores } }
        );
        ref.afterClosed().subscribe(adminId => {
          if (!adminId) return;
          this.empresaService.asignarAdmin(empresa.id, adminId).subscribe({
            next: (updated) => {
              const idx = this.dataSource.data.findIndex(e => e.id === updated.id);
              if (idx >= 0) {
                const copy = [...this.dataSource.data];
                copy[idx] = updated;
                this.dataSource.data = copy;
              }
              this.snackBar.open('Administrador asignado correctamente', 'Cerrar', { duration: 3000 });
            },
            error: (err: { error?: { message?: string } }) =>
              this.snackBar.open(err?.error?.message || 'Error al asignar', 'Cerrar', { duration: 4000 })
          });
        });
      },
      error: () => this.snackBar.open('Error al cargar usuarios', 'Cerrar', { duration: 4000 })
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(EmpresaFormDialogComponent, {
      data: {},
      width: '560px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadEmpresas();
    });
  }

  openEditDialog(empresa: Empresa): void {
    const ref = this.dialog.open(EmpresaFormDialogComponent, {
      data: { empresa },
      width: '560px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadEmpresas();
    });
  }

  confirmDelete(empresa: Empresa): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar empresa',
        message: `¿Confirmás que querés eliminar la empresa "${empresa.nombre}"? Esta acción no se puede deshacer.`
      },
      width: '400px'
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteEmpresa(empresa.id);
    });
  }

  private deleteEmpresa(id: string): void {
    this.empresaService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Empresa eliminada', 'Cerrar', { duration: 3000 });
        this.loadEmpresas();
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Error al eliminar la empresa',
          'Cerrar',
          { duration: 4000 }
        );
        console.error('Error eliminando empresa:', err);
      }
    });
  }
}
