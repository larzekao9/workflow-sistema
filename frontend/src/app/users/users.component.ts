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

import { UserService } from '../shared/services/user.service';
import { User } from '../shared/models/user.model';
import { UserFormComponent } from './user-form/user-form.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
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
      <h1>Gestión de Usuarios</h1>
      <button mat-raised-button color="primary" (click)="openCreateDialog()">
        <mat-icon>person_add</mat-icon>
        Nuevo Usuario
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Buscar usuario</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Nombre, email, usuario..." />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource" matSort>

            <ng-container matColumnDef="nombreCompleto">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre Completo</th>
              <td mat-cell *matCellDef="let user">{{ user.nombreCompleto }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Correo</th>
              <td mat-cell *matCellDef="let user">{{ user.email }}</td>
            </ng-container>

            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Usuario</th>
              <td mat-cell *matCellDef="let user">{{ user.username }}</td>
            </ng-container>

            <ng-container matColumnDef="rolNombre">
              <th mat-header-cell *matHeaderCellDef>Rol</th>
              <td mat-cell *matCellDef="let user">
                <mat-chip-set>
                  <mat-chip>{{ user.rolNombre || 'Sin rol' }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let user">
                <mat-chip [color]="user.activo ? 'primary' : 'warn'" selected>
                  {{ user.activo ? 'Activo' : 'Inactivo' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let user">
                <button mat-icon-button color="primary" (click)="openEditDialog(user)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmDelete(user)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron usuarios
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
export class UsersComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombreCompleto', 'email', 'username', 'rolNombre', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<User>();
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAll().subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar los usuarios',
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
    const ref = this.dialog.open(UserFormComponent, {
      data: {},
      width: '500px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadUsers();
    });
  }

  openEditDialog(user: User): void {
    const ref = this.dialog.open(UserFormComponent, {
      data: { user },
      width: '500px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadUsers();
    });
  }

  confirmDelete(user: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar usuario',
        message: `¿Confirmás que querés eliminar a "${user.nombreCompleto}"? Esta acción no se puede deshacer.`
      },
      width: '400px'
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteUser(user.id);
    });
  }

  private deleteUser(id: string): void {
    this.userService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado', 'Cerrar', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Error al eliminar el usuario',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }
}
