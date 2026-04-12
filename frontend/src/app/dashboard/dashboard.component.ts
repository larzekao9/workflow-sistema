import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Dashboard</mat-card-title>
        <mat-card-subtitle>Sprint 4 — implementación pendiente</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content><p>Panel operacional en construcción.</p></mat-card-content>
    </mat-card>
  `
})
export class DashboardComponent {}
