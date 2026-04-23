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

import { EmpresaService } from '../../shared/services/empresa.service';
import { Empresa } from '../../shared/models/empresa.model';
import { EmpresaFormDialogComponent } from '../empresa-form-dialog/empresa-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatFormFieldModule
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

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let empresa">
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

    @media (max-width: 600px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .page-header h1 { font-size: 20px; }
    }
  `]
})
export class EmpresasListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'razonSocial', 'ciudad', 'pais', 'activa', 'acciones'];
  dataSource = new MatTableDataSource<Empresa>();
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private empresaService: EmpresaService,
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
