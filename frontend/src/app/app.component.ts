import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <ng-container *ngIf="(showSidenav$ | async); else noSidenav">
      <mat-toolbar color="primary" class="toolbar">
        <span>Sistema Workflow</span>
        <span class="spacer"></span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Cerrar sesión</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <mat-sidenav-container style="height: calc(100vh - 64px)">
        <mat-sidenav mode="side" opened style="width: 220px; padding: 8px">
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>
            <a mat-list-item routerLink="/policies" routerLinkActive="active-link">
              <mat-icon matListItemIcon>account_tree</mat-icon>
              <span matListItemTitle>Politicas</span>
            </a>
            <a mat-list-item routerLink="/forms" routerLinkActive="active-link">
              <mat-icon matListItemIcon>dynamic_form</mat-icon>
              <span matListItemTitle>Formularios</span>
            </a>
            <a mat-list-item routerLink="/tramites" routerLinkActive="active-link">
              <mat-icon matListItemIcon>assignment</mat-icon>
              <span matListItemTitle>Tramites</span>
            </a>
            <a mat-list-item routerLink="/users" routerLinkActive="active-link">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
            <a mat-list-item routerLink="/roles" routerLinkActive="active-link">
              <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
              <span matListItemTitle>Roles</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>
        <mat-sidenav-content style="padding: 24px">
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    </ng-container>

    <ng-template #noSidenav>
      <router-outlet />
    </ng-template>
  `,
  styles: [`
    .toolbar { position: sticky; top: 0; z-index: 1000; }
    .spacer { flex: 1 1 auto; }
    .active-link { background-color: rgba(0,0,0,0.08); border-radius: 4px; }
  `]
})
export class AppComponent implements OnInit {
  showSidenav$!: Observable<boolean>;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.showSidenav$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        return url !== '/login' && url !== '/register';
      }),
      startWith(!this.isAuthRoute())
    );
  }

  logout(): void {
    this.authService.logout();
  }

  private isAuthRoute(): boolean {
    const url = this.router.url;
    return url === '/login' || url === '/register';
  }
}
