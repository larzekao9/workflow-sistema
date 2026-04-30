import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Observable, Subscription, interval } from 'rxjs';
import { filter, map, startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from './shared/services/auth.service';
import { User } from './shared/models/user.model';
import { NotificacionService } from './shared/services/notificacion.service';
import { Notificacion } from './shared/models/notificacion.model';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';

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
    MatDividerModule,
    MatBadgeModule,
    ChatbotComponent
  ],
  template: `
    <ng-container *ngIf="(showSidenav$ | async); else noSidenav">
      <mat-toolbar color="primary" class="app-toolbar" role="banner">
        <!-- Brand -->
        <span class="brand-name">Sistema Workflow</span>
        <span class="spacer"></span>

        <!-- Usuario autenticado: role chip · nombre · campana · avatar -->
        <ng-container *ngIf="currentUser$ | async as user">
          <span
            class="role-chip"
            [class]="getRoleChipClass(user.rolNombre)"
            [attr.aria-label]="'Rol actual: ' + (user.rolNombre || 'CLIENTE')">
            {{ user.rolNombre || 'CLIENTE' }}
          </span>

          <span class="user-name" aria-hidden="true">{{ user.nombreCompleto }}</span>

          <!-- Campana de notificaciones -->
          <button
            mat-icon-button
            [matMenuTriggerFor]="notifMenu"
            aria-label="Ver notificaciones"
            matTooltip="Notificaciones"
            class="notif-bell-btn">
            <mat-icon
              [matBadge]="noLeidasCount"
              matBadgeColor="warn"
              matBadgeSize="small"
              [matBadgeHidden]="noLeidasCount === 0"
              aria-hidden="true">
              notifications
            </mat-icon>
          </button>

          <!-- Panel de notificaciones -->
          <mat-menu #notifMenu="matMenu">
            <div class="notif-header" (click)="$event.stopPropagation()">
              <span class="notif-header-title">Notificaciones</span>
              <button
                *ngIf="noLeidasCount > 0"
                mat-button
                class="notif-mark-all-btn"
                (click)="marcarTodasLeidas(); $event.stopPropagation()"
                aria-label="Marcar todas como leídas">
                Marcar todas como leídas
              </button>
            </div>
            <mat-divider></mat-divider>
            <div class="notif-list-wrapper" (click)="$event.stopPropagation()">
              <ng-container *ngIf="notificaciones.length > 0; else sinNotifs">
                <div
                  *ngFor="let n of notificaciones"
                  class="notif-item"
                  [class.notif-item--unread]="!n.leida"
                  [class.notif-item--read]="n.leida"
                  (click)="onNotifClick(n)"
                  (keydown.enter)="onNotifClick(n)"
                  (keydown.space)="onNotifClick(n)"
                  tabindex="0"
                  [attr.aria-label]="n.titulo + (n.leida ? '' : ' (no leída)')">
                  <span *ngIf="!n.leida" class="notif-dot" aria-hidden="true"></span>
                  <span *ngIf="n.leida"  class="notif-dot-placeholder" aria-hidden="true"></span>
                  <div class="notif-content">
                    <p class="notif-titulo">{{ n.titulo }}</p>
                    <p class="notif-cuerpo">{{ n.cuerpo }}</p>
                    <p class="notif-fecha">{{ formatFechaRelativa(n.creadoEn) }}</p>
                  </div>
                  <mat-icon class="notif-tipo-icon" aria-hidden="true">{{ getTipoIcon(n.tipo) }}</mat-icon>
                </div>
              </ng-container>
              <ng-template #sinNotifs>
                <div class="notif-empty" role="status" aria-live="polite">
                  <mat-icon aria-hidden="true">notifications_none</mat-icon>
                  <p>No tenés notificaciones</p>
                </div>
              </ng-template>
            </div>
          </mat-menu>

          <!-- Menú de usuario -->
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

        <!-- Fallback sin usuario -->
        <ng-container *ngIf="!(currentUser$ | async)">
          <button mat-icon-button aria-label="Opciones de usuario" [matMenuTriggerFor]="fallbackMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #fallbackMenu="matMenu">
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

      <!-- Chatbot FAB: fuera del sidenav-content para evitar problemas de stacking context -->
      <app-chatbot></app-chatbot>
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

    /* Bell button — overflow visible para que el badge no quede cortado */
    .notif-bell-btn {
      overflow: visible;
      margin: 0 4px;
    }

    /* Panel header */
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 8px;
      min-width: 340px;
    }

    .notif-header-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #212121;
    }

    .notif-mark-all-btn {
      font-size: 0.75rem;
      color: #1565c0;
      line-height: 1;
      min-width: unset;
      padding: 4px 8px;
    }

    /* Lista wrapper */
    .notif-list-wrapper {
      width: 380px;
      max-height: 440px;
      overflow-y: auto;
    }

    /* Item individual */
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      outline: none;
    }

    .notif-item:hover,
    .notif-item:focus-visible {
      background-color: #f5f5f5;
    }

    .notif-item:focus-visible {
      box-shadow: inset 0 0 0 2px #1565c0;
    }

    .notif-item--unread {
      background-color: #e8f0fe;
    }

    .notif-item--unread:hover,
    .notif-item--unread:focus-visible {
      background-color: #d2e3fc;
    }

    .notif-item--read {
      background-color: #ffffff;
    }

    /* Dot indicador */
    .notif-dot {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #1565c0;
      margin-top: 6px;
    }

    .notif-dot-placeholder {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
    }

    /* Contenido de texto */
    .notif-content {
      flex: 1;
      min-width: 0;
    }

    .notif-titulo {
      margin: 0 0 2px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #212121;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-cuerpo {
      margin: 0 0 4px;
      font-size: 0.78rem;
      color: #424242;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .notif-fecha {
      margin: 0;
      font-size: 0.72rem;
      color: #757575;
    }

    /* Icono tipo */
    .notif-tipo-icon {
      flex-shrink: 0;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9e9e9e;
      margin-top: 2px;
    }

    /* Estado vacío */
    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      color: #9e9e9e;
      gap: 8px;
    }

    .notif-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .notif-empty p {
      margin: 0;
      font-size: 0.85rem;
    }

    @media (max-width: 600px) {
      .notif-list-wrapper {
        width: calc(100vw - 32px);
        max-width: 380px;
      }

      .notif-header {
        min-width: unset;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  showSidenav$!: Observable<boolean>;
  currentUser$ = this.authService.currentUser$;

  notificaciones: Notificacion[] = [];
  noLeidasCount = 0;

  private pollingSub: Subscription | null = null;

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

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit(): void {
    this.showSidenav$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => this.isAppRoute(event.urlAfterRedirects)),
      startWith(this.isAppRoute(this.router.url))
    );

    // Polling de notificaciones: arranca inmediatamente y repite cada 20s.
    // Solo activo cuando hay sesión iniciada.
    this.pollingSub = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        return interval(20000).pipe(
          startWith(0),
          switchMap(() =>
            this.notificacionService.getMisNotificaciones().pipe(
              catchError(err => {
                console.error('[NotifPanel] Error al cargar notificaciones:', err);
                return of([] as Notificacion[]);
              })
            )
          )
        );
      })
    ).subscribe(notifs => {
      this.notificaciones = notifs.slice(0, 20);
      this.noLeidasCount = notifs.filter(n => !n.leida).length;
    });
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  onNotifClick(notif: Notificacion): void {
    if (!notif.leida) {
      this.notificacionService.marcarLeida(notif.id).pipe(
        catchError(err => {
          console.error('[NotifPanel] Error al marcar como leída:', err);
          return of(undefined);
        })
      ).subscribe(() => {
        notif.leida = true;
        this.noLeidasCount = this.notificaciones.filter(n => !n.leida).length;
      });
    }
    if (notif.tramiteId) {
      this.router.navigate(['/tramites', notif.tramiteId]);
    }
  }

  marcarTodasLeidas(): void {
    const noLeidas = this.notificaciones.filter(n => !n.leida);
    noLeidas.forEach(notif => {
      this.notificacionService.marcarLeida(notif.id).pipe(
        catchError(err => {
          console.error('[NotifPanel] Error al marcar como leída:', err);
          return of(undefined);
        })
      ).subscribe(() => {
        notif.leida = true;
        this.noLeidasCount = this.notificaciones.filter(n => !n.leida).length;
      });
    });
  }

  getTipoIcon(tipo: string): string {
    const iconMap: Record<string, string> = {
      TRAMITE_AVANZADO:   'arrow_forward',
      TRAMITE_RECHAZADO:  'cancel',
      TRAMITE_OBSERVADO:  'visibility',
      TAREA_ASIGNADA:     'assignment_ind',
      CLIENTE_RESPONDIO:  'reply',
      APELACION_RESUELTA: 'gavel'
    };
    return iconMap[tipo] ?? 'notifications';
  }

  formatFechaRelativa(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHs = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHs / 24);

    if (diffMin < 1)   return 'Ahora mismo';
    if (diffMin < 60)  return `Hace ${diffMin} min`;
    if (diffHs < 24)   return `Hace ${diffHs} h`;
    if (diffDias < 7)  return `Hace ${diffDias} día${diffDias === 1 ? '' : 's'}`;

    return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
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
