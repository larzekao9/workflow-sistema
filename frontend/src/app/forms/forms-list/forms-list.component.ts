import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { FormularioService } from '../../shared/services/formulario.service';
import { FormularioResponse, EstadoFormulario } from '../../shared/models/formulario.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="page-header">
      <h1>Formularios</h1>
      <button mat-raised-button color="primary" routerLink="/forms/new">
        <mat-icon>add</mat-icon>
        Nuevo Formulario
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="filters-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar por nombre</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Nombre del formulario..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="estado-field">
            <mat-label>Estado</mat-label>
            <mat-select [formControl]="estadoControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="ACTIVO">Activo</mat-option>
              <mat-option value="INACTIVO">Inactivo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource">

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let f">{{ f.nombre }}</td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let f">
                <mat-chip [ngClass]="getEstadoClass(f.estado)" selected>
                  {{ f.estado }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="campos">
              <th mat-header-cell *matHeaderCellDef>Total campos</th>
              <td mat-cell *matCellDef="let f">{{ contarCampos(f) }}</td>
            </ng-container>

            <ng-container matColumnDef="actualizadoEn">
              <th mat-header-cell *matHeaderCellDef>Ultima actualización</th>
              <td mat-cell *matCellDef="let f">{{ f.actualizadoEn | date:'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let f">
                <button mat-icon-button color="primary" [routerLink]="['/forms', f.id]" matTooltip="Ver detalle">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="accent" [routerLink]="['/forms', f.id, 'edit']" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminar(f)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron formularios
              </td>
            </tr>
          </table>

          <mat-paginator
            [length]="totalElements"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50]"
            showFirstLastButtons
            (page)="onPageChange($event)">
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
    }
    .page-header h1 { margin: 0; font-size: 24px; }
    .filters-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .search-field { flex: 1; min-width: 240px; }
    .estado-field { width: 180px; }
    .table-container { overflow-x: auto; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    table { width: 100%; }
    .chip-activo   { background-color: #4caf50 !important; color: white !important; }
    .chip-inactivo { background-color: #9e9e9e !important; color: white !important; }
  `]
})
export class FormsListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'estado', 'campos', 'actualizadoEn', 'acciones'];
  dataSource = new MatTableDataSource<FormularioResponse>();
  isLoading = false;
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;

  searchControl = new FormControl('');
  estadoControl = new FormControl('');

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private formularioService: FormularioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFormularios();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadFormularios();
    });

    this.estadoControl.valueChanges.subscribe(() => {
      this.currentPage = 0;
      this.loadFormularios();
    });
  }

  ngAfterViewInit(): void {}

  loadFormularios(): void {
    this.isLoading = true;
    const nombre = this.searchControl.value || undefined;
    const estado = (this.estadoControl.value as EstadoFormulario) || undefined;

    this.formularioService.getAll({
      nombre,
      estado,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;
        this.totalElements = page.totalElements;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar los formularios',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadFormularios();
  }

  contarCampos(f: FormularioResponse): number {
    return f.secciones.reduce((total, s) => total + s.campos.length, 0);
  }

  getEstadoClass(estado: EstadoFormulario): string {
    return estado === 'ACTIVO' ? 'chip-activo' : 'chip-inactivo';
  }

  eliminar(f: FormularioResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar formulario',
        message: `¿Confirmas que quieres eliminar el formulario "${f.nombre}"? Esta acción no se puede deshacer.`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.formularioService.delete(f.id).subscribe({
        next: () => {
          this.snackBar.open('Formulario eliminado', 'Cerrar', { duration: 3000 });
          this.loadFormularios();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al eliminar', 'Cerrar', { duration: 4000 })
      });
    });
  }
}
