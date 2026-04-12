import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Trámites</mat-card-title>
        <mat-card-subtitle>Sprint 3 — implementación pendiente</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content><p>Motor de trámites en construcción.</p></mat-card-content>
    </mat-card>
  `
})
export class TramitesComponent {}
