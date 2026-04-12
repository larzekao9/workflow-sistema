import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { RoleService } from '../shared/services/role.service';
import { Role } from '../shared/models/role.model';
import { RoleFormComponent } from './role-form/role-form.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-roles',
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
    MatFormFieldModule
  ],
  template: `
    <div class="page-header">
      <h1>Gestión de Roles</h1>
      <button mat-raised-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add_moderator</mat-icon>
        Nuevo Rol
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Buscar rol</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Nombre, descripción..." />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource" matSort>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
              <td mat-cell *matCellDef="let role">
                <strong>{{ role.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let role">{{ role.descripcion || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="permisos">
              <th mat-header-cell *matHeaderCellDef>Permisos</th>
              <td mat-cell *matCellDef="let role">
                <mat-chip-set>
                  <mat-chip *ngFor="let perm of role.permisos | slice:0:3">{{ perm }}</mat-chip>
                  <mat-chip *ngIf="role.permisos?.length > 3">+{{ role.permisos.length - 3 }} más</mat-chip>
                  <mat-chip *ngIf="!role.permisos?.length">Sin permisos</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let role">
                <mat-chip [color]="role.activo ? 'primary' : 'warn'" selected>
                  {{ role.activo ? 'Activo' : 'Inactivo' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let role">
                <button mat-icon-button color="primary" (click)="openEditDialog(role)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmDelete(role)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron roles
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
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
    }
    .page-header h1 { margin: 0; font-size: 24px; }
    .filter-field { width: 100%; margin-bottom: 16px; }
    .table-container { overflow-x: auto; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    table { width: 100%; }
  `]
})
export class RolesComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'descripcion', 'permisos', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<Role>();
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private roleService: RoleService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAll().subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar los roles',
          'Cerrar',
          { duration: 4000 }
        );
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

  openCreateDialog(): void {
    const ref = this.dialog.open(RoleFormComponent, {
      data: {},
      width: '520px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadRoles();
    });
  }

  openEditDialog(role: Role): void {
    const ref = this.dialog.open(RoleFormComponent, {
      data: { role },
      width: '520px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadRoles();
    });
  }

  confirmDelete(role: Role): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar rol',
        message: `¿Confirmás que querés eliminar el rol "${role.nombre}"? Esta acción no se puede deshacer.`
      },
      width: '400px'
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteRole(role.id);
    });
  }

  private deleteRole(id: string): void {
    this.roleService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Rol eliminado', 'Cerrar', { duration: 3000 });
        this.loadRoles();
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Error al eliminar el rol',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }
}
