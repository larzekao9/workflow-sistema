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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from './shared/services/auth.service';
import { User } from './shared/models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

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
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <ng-container *ngIf="(showSidenav$ | async); else noSidenav">
      <mat-toolbar color="primary" class="app-toolbar" role="banner">
        <!-- Brand -->
        <span class="brand-name">Sistema Workflow</span>
        <span class="spacer"></span>

        <!-- Role chip -->
        <ng-container *ngIf="currentUser$ | async as user">
          <span
            class="role-chip"
            [class]="getRoleChipClass(user.rolNombre)"
            [attr.aria-label]="'Rol actual: ' + (user.rolNombre || 'CLIENTE')">
            {{ user.rolNombre || 'CLIENTE' }}
          </span>

          <!-- User name -->
          <span class="user-name" aria-hidden="true">{{ user.nombreCompleto }}</span>

          <!-- User menu -->
          <button
            mat-icon-button
            [matMenuTriggerFor]="userMenu"
            [matTooltip]="user.nombreCompleto"
            [attr.aria-label]="'Menú de ' + user.nombreCompleto">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-menu-header" role="presentation">
              <span class="user-menu-name">{{ user.nombreCompleto }}</span>
              <span class="user-menu-email">{{ user.email }}</span>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Cerrar sesión</span>
            </button>
          </mat-menu>
        </ng-container>

        <!-- Fallback cuando no hay usuario -->
        <ng-container *ngIf="!(currentUser$ | async)">
          <button mat-icon-button aria-label="Opciones de usuario" [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Cerrar sesión</span>
            </button>
          </mat-menu>
        </ng-container>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav
          mode="side"
          opened
          class="app-sidenav"
          role="navigation"
          aria-label="Navegación principal">

          <mat-nav-list>
            <ng-container *ngIf="currentUser$ | async as user">
              <ng-container *ngFor="let item of getNavItems(user.rolNombre)">
                <a
                  mat-list-item
                  [routerLink]="item.route"
                  routerLinkActive="active-link"
                  [attr.aria-label]="item.label">
                  <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                  <span matListItemTitle>{{ item.label }}</span>
                </a>
              </ng-container>
            </ng-container>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="sidenav-content">
          <main id="main-content" tabindex="-1">
            <router-outlet />
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </ng-container>

    <ng-template #noSidenav>
      <router-outlet />
    </ng-template>
  `,
  styles: [`
    /* Toolbar */
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      gap: 8px;
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }

    .spacer {
      flex: 1 1 auto;
    }

    /* Role chip */
    .role-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .role-superadmin {
      background: #1a237e;
      color: #fff;
    }

    .role-admin {
      background: #b71c1c;
      color: #ffffff;
    }

    .role-funcionario {
      background: #0d47a1;
      color: #ffffff;
    }

    .role-cliente {
      background: #1b5e20;
      color: #ffffff;
    }

    .role-default {
      background: rgba(255,255,255,0.2);
      color: #ffffff;
    }

    /* User name */
    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 600px) {
      .user-name {
        display: none;
      }
    }

    /* User menu header */
    .user-menu-header {
      display: flex;
      flex-direction: column;
      padding: 12px 16px 8px;
      pointer-events: none;
    }

    .user-menu-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: #212121;
    }

    .user-menu-email {
      font-size: 0.78rem;
      color: #757575;
      margin-top: 2px;
    }

    /* Sidenav container */
    .sidenav-container {
      height: calc(100vh - 64px);
    }

    /* Sidenav */
    .app-sidenav {
      width: 230px;
      padding: 8px 0;
      border-right: 1px solid rgba(0,0,0,0.08);
    }

    /* Active link */
    ::ng-deep .active-link {
      background-color: rgba(21, 101, 192, 0.1) !important;
      border-radius: 4px;
      color: #1565c0 !important;
    }

    ::ng-deep .active-link mat-icon {
      color: #1565c0 !important;
    }

    /* Sidenav content */
    .sidenav-content {
      padding: 24px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .sidenav-content {
        padding: 16px;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  showSidenav$!: Observable<boolean>;
  currentUser$ = this.authService.currentUser$;

  private readonly NAV_SUPERADMIN: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard',            route: '/dashboard' },
    { label: 'Empresas',     icon: 'business',             route: '/empresas' },
    { label: 'Usuarios',     icon: 'people',               route: '/users' },
    { label: 'Roles',        icon: 'admin_panel_settings', route: '/roles' }
  ];

  private readonly NAV_ADMIN: NavItem[] = [
    { label: 'Dashboard',   icon: 'dashboard',            route: '/dashboard' },
    { label: 'Monitor',     icon: 'monitor_heart',         route: '/tramites' },
    { label: 'Políticas',   icon: 'account_tree',          route: '/policies' },
    { label: 'Usuarios',       icon: 'people',                route: '/users' },
    { label: 'Departamentos',  icon: 'corporate_fare',        route: '/departments' },
    { label: 'Roles',          icon: 'admin_panel_settings',  route: '/roles' }
  ];

  private readonly NAV_FUNCIONARIO: NavItem[] = [
    { label: 'Bandeja de Trabajo', icon: 'inbox',       route: '/tramites' },
    { label: 'Dashboard',          icon: 'dashboard',   route: '/dashboard' }
  ];

  private readonly NAV_CLIENTE: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard',   route: '/dashboard' },
    { label: 'Nuevo Trámite',icon: 'add_circle',  route: '/tramites/nuevo' },
    { label: 'Mis Trámites', icon: 'assignment',  route: '/mis-tramites' }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.showSidenav$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => this.isAppRoute(event.urlAfterRedirects)),
      startWith(this.isAppRoute(this.router.url))
    );
  }

  logout(): void {
    this.authService.logout();
  }

  getNavItems(rolNombre: string | undefined): NavItem[] {
    const rol = (rolNombre ?? 'CLIENTE').toUpperCase();
    // SUPERADMIN debe chequearse antes de ADMIN porque 'SUPERADMIN'.includes('ADMIN') es true
    if (rol.includes('SUPERADMIN'))  return this.NAV_SUPERADMIN;
    if (rol.includes('ADMIN'))       return this.NAV_ADMIN;
    if (rol.includes('FUNCIONARIO')) return this.NAV_FUNCIONARIO;
    return this.NAV_CLIENTE;
  }

  getRoleChipClass(rolNombre: string | undefined): string {
    const rol = (rolNombre ?? '').toUpperCase();
    // SUPERADMIN debe chequearse antes de ADMIN por el mismo motivo
    if (rol.includes('SUPERADMIN'))  return 'role-chip role-superadmin';
    if (rol.includes('ADMIN'))       return 'role-chip role-admin';
    if (rol.includes('FUNCIONARIO')) return 'role-chip role-funcionario';
    if (rol.includes('CLIENTE'))     return 'role-chip role-cliente';
    return 'role-chip role-default';
  }

  private isAppRoute(url: string): boolean {
    return url !== '/login'
      && url !== '/register'
      && !url.includes('/flow')
      && url !== '/policies/new';
  }
}
