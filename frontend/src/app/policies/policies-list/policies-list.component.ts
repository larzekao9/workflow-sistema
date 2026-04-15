import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
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

import { PoliticaService } from '../../shared/services/politica.service';
import { Politica, EstadoPolitica } from '../../shared/models/politica.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreatePoliticaDialogComponent } from '../create-politica-dialog/create-politica-dialog.component';

@Component({
  selector: 'app-policies-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
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
      <h1>Políticas de Negocio</h1>
      <button mat-raised-button color="primary" routerLink="/policies/new">
        <mat-icon>add</mat-icon>
        Nueva Política
      </button>
    </div>

    <mat-card>
      <mat-card-content>
        <div class="filters-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar por nombre</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Nombre de la política..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="estado-field">
            <mat-label>Estado</mat-label>
            <mat-select [formControl]="estadoControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="BORRADOR">Borrador</mat-option>
              <mat-option value="ACTIVA">Activa</mat-option>
              <mat-option value="INACTIVA">Inactiva</mat-option>
              <mat-option value="ARCHIVADA">Archivada</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!isLoading" class="table-container">
          <table mat-table [dataSource]="dataSource" matSort>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
              <td mat-cell *matCellDef="let p">{{ p.nombre }}</td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">
                <mat-chip [ngClass]="getEstadoClass(p.estado)" selected>
                  {{ p.estado }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Versión</th>
              <td mat-cell *matCellDef="let p">v{{ p.version }}</td>
            </ng-container>

            <ng-container matColumnDef="departamento">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Departamento</th>
              <td mat-cell *matCellDef="let p">{{ p.departamento }}</td>
            </ng-container>

            <ng-container matColumnDef="editor">
              <th mat-header-cell *matHeaderCellDef>Editor</th>
              <td mat-cell *matCellDef="let p">
                <button
                  mat-raised-button
                  color="primary"
                  *ngIf="p.estado === 'BORRADOR'"
                  [routerLink]="['/policies', p.id, 'flow']"
                  matTooltip="Abrir editor de flujo">
                  <mat-icon>edit_note</mat-icon>
                  Editar
                </button>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button color="primary" [routerLink]="['/policies', p.id]" matTooltip="Ver detalle">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="accent"
                  [routerLink]="['/policies', p.id, 'edit']"
                  [disabled]="p.estado !== 'BORRADOR'"
                  matTooltip="Editar (solo BORRADOR)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="primary"
                  *ngIf="p.estado === 'BORRADOR'"
                  (click)="publishPolitica(p)"
                  matTooltip="Publicar">
                  <mat-icon>publish</mat-icon>
                </button>
                <button
                  mat-icon-button
                  *ngIf="p.estado === 'ACTIVA' || p.estado === 'ARCHIVADA'"
                  (click)="newVersion(p)"
                  matTooltip="Nueva versión">
                  <mat-icon>file_copy</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  *ngIf="p.estado === 'ACTIVA'"
                  (click)="deactivatePolitica(p)"
                  matTooltip="Desactivar">
                  <mat-icon>pause_circle</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  (click)="deletePolitica(p)"
                  matTooltip="Eliminar permanentemente">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                No se encontraron políticas
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
    .chip-borrador { background-color: #9e9e9e !important; color: white !important; }
    .chip-activa   { background-color: #4caf50 !important; color: white !important; }
    .chip-inactiva { background-color: #ff9800 !important; color: white !important; }
    .chip-archivada{ background-color: #f44336 !important; color: white !important; }
  `]
})
export class PoliciesListComponent implements OnInit, AfterViewInit {
  displayedColumns = ['nombre', 'estado', 'version', 'departamento', 'editor', 'acciones'];
  dataSource = new MatTableDataSource<Politica>();
  isLoading = false;

  searchControl = new FormControl('');
  estadoControl = new FormControl('');

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private politicaService: PoliticaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPoliticas();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.loadPoliticas());

    this.estadoControl.valueChanges.subscribe(() => this.loadPoliticas());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPoliticas(): void {
    this.isLoading = true;
    const filters: { estado?: any; nombre?: string } = {};
    const estado = this.estadoControl.value;
    const nombre = this.searchControl.value;
    if (estado) filters.estado = estado;
    if (nombre) filters.nombre = nombre;

    this.politicaService.getAll(filters).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(
          err?.error?.message || 'Error al cargar las políticas',
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }

  getEstadoClass(estado: EstadoPolitica): string {
    const map: Record<EstadoPolitica, string> = {
      BORRADOR: 'chip-borrador',
      ACTIVA: 'chip-activa',
      INACTIVA: 'chip-inactiva',
      ARCHIVADA: 'chip-archivada'
    };
    return map[estado] ?? '';
  }

  publishPolitica(p: Politica): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Publicar política',
        message: `¿Confirmás que querés publicar "${p.nombre}"? Una vez publicada no podrá editarse estructuralmente.`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.politicaService.publish(p.id).subscribe({
        next: () => {
          this.snackBar.open('Política publicada correctamente', 'Cerrar', { duration: 3000 });
          this.loadPoliticas();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al publicar', 'Cerrar', { duration: 4000 })
      });
    });
  }

  deactivatePolitica(p: Politica): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Desactivar política',
        message: `¿Confirmás que querés desactivar "${p.nombre}"?`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.politicaService.deactivate(p.id).subscribe({
        next: () => {
          this.snackBar.open('Política desactivada', 'Cerrar', { duration: 3000 });
          this.loadPoliticas();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al desactivar', 'Cerrar', { duration: 4000 })
      });
    });
  }

  deletePolitica(p: Politica): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar política',
        message: `¿Confirmás que querés eliminar permanentemente "${p.nombre}"? Esta acción no puede revertirse.`
      },
      width: '420px'
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.politicaService.delete(p.id).subscribe({
        next: () => {
          this.snackBar.open('Política eliminada correctamente', 'Cerrar', { duration: 3000 });
          this.loadPoliticas();
        },
        error: (err) => this.snackBar.open(err?.error?.message || 'Error al eliminar', 'Cerrar', { duration: 4000 })
      });
    });
  }

  newVersion(p: Politica): void {
    this.politicaService.newVersion(p.id).subscribe({
      next: (nueva) => {
        this.snackBar.open('Nueva versión creada correctamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/policies', nueva.id, 'edit']);
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear nueva versión', 'Cerrar', { duration: 4000 })
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(CreatePoliticaDialogComponent, {
      width: '480px',
      disableClose: false
    });

    ref.afterClosed().subscribe(nuevaPolitica => {
      if (!nuevaPolitica) return; // Usuario canceló

      this.snackBar.open('Política creada correctamente', 'Cerrar', { duration: 3000 });
      // Navega al editor de flujo de la nueva política
      this.router.navigate(['/policies', nuevaPolitica.id, 'flow']);
    });
  }
}
