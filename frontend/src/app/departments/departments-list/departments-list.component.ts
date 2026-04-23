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

import { DepartmentService } from '../../shared/services/department.service';
import { Department } from '../../shared/models/department.model';
import { DepartmentFormDialogComponent } from '../department-form-dialog/department-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-departments-list',
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
      <h1>Gestión de Departamentos</h1>
      <button
        mat-raised-button
        color="primary"
        (click)="openCreateDialog()"
        aria-label="Crear nuevo departamento">
        <mat-icon>add_business</mat-icon>
        Nuevo Departamento
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Buscar departamento</mat-label>
          <input
            matInput
            (keyup)="applyFilter($event)"
            placeholder="Nombre, responsable..."
            aria-label="Filtrar departamentos" />
          <mat-icon matSuffix aria-hidden="true">search</mat-icon>
        </mat-form-field>

        <div *ngIf="isLoading" class="loading-container" role="status" aria-label="Cargando departamentos">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource" matSort aria-label="Tabla de departamentos">

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
              <td mat-cell *matCellDef="let dept">
                <strong>{{ dept.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let dept">{{ dept.descripcion || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="responsable">
              <th mat-header-cell *matHeaderCellDef>Responsable</th>
              <td mat-cell *matCellDef="let dept">{{ dept.responsable || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="activa">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let dept">
                <mat-chip [color]="dept.activa ? 'primary' : 'warn'" selected>
                  {{ dept.activa ? 'Activo' : 'Inactivo' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let dept">
                <button
                  mat-icon-button
                  color="primary"
                  (click)="openEditDialog(dept)"
                  [matTooltip]="'Editar ' + dept.nombre"
                  [attr.aria-label]="'Editar departamento ' + dept.nombre">
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  (click)="confirmDelete(dept)"
                  [matTooltip]="'Eliminar ' + dept.nombre"
                  [attr.aria-label]="'Eliminar departamento ' + dept.nombre">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron departamentos
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons aria-label="Paginación de departamentos"></mat-paginator>
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

    @media (max-width: 600px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .page-header h1 { font-size: 20px; }
    }
  `]
})
export class DepartmentsListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'descripcion', 'responsable', 'activa', 'acciones'];
  dataSource = new MatTableDataSource<Department>();
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private departmentService: DepartmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.departmentService.getAll().subscribe({
      next: (departments) => {
        this.dataSource.data = departments;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar los departamentos',
          'Cerrar',
          { duration: 4000 }
        );
        console.error('Error cargando departamentos:', err);
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
    const ref = this.dialog.open(DepartmentFormDialogComponent, {
      data: {},
      width: '520px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadDepartments();
    });
  }

  openEditDialog(department: Department): void {
    const ref = this.dialog.open(DepartmentFormDialogComponent, {
      data: { department },
      width: '520px'
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadDepartments();
    });
  }

  confirmDelete(department: Department): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar departamento',
        message: `¿Confirmás que querés eliminar el departamento "${department.nombre}"? Esta acción no se puede deshacer.`
      },
      width: '400px'
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteDepartment(department.id);
    });
  }

  private deleteDepartment(id: string): void {
    this.departmentService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Departamento eliminado', 'Cerrar', { duration: 3000 });
        this.loadDepartments();
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Error al eliminar el departamento',
          'Cerrar',
          { duration: 4000 }
        );
        console.error('Error eliminando departamento:', err);
      }
    });
  }
}
