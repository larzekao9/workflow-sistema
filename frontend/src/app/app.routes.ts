import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./users/users.component').then(m => m.UsersComponent)
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    loadComponent: () => import('./roles/roles.component').then(m => m.RolesComponent)
  },
  {
    path: 'policies',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/policies.component').then(m => m.PoliciesComponent)
  },
  {
    path: 'tramites',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/tramites.component').then(m => m.TramitesComponent)
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
