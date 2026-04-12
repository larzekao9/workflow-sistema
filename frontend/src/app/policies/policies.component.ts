import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Políticas de Negocio</mat-card-title>
        <mat-card-subtitle>Sprint 2 — implementación pendiente</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content><p>Editor de workflows en construcción.</p></mat-card-content>
    </mat-card>
  `
})
export class PoliciesComponent {}
