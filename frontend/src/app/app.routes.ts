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
    path: 'departments',
    canActivate: [authGuard],
    loadComponent: () => import('./departments/departments-list/departments-list.component').then(m => m.DepartmentsListComponent)
  },
  {
    path: 'empresas',
    canActivate: [authGuard],
    loadComponent: () => import('./empresas/empresas-list/empresas-list.component').then(m => m.EmpresasListComponent)
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    loadComponent: () => import('./roles/roles.component').then(m => m.RolesComponent)
  },
  {
    path: 'policies',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/policies-list/policies-list.component').then(m => m.PoliciesListComponent)
  },
  {
    path: 'policies/new',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/new-policy/new-policy.component').then(m => m.NewPolicyComponent)
  },
  {
    path: 'policies/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/policy-detail/policy-detail.component').then(m => m.PolicyDetailComponent)
  },
  {
    path: 'policies/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/policy-form/policy-form.component').then(m => m.PolicyFormComponent)
  },
  {
    path: 'policies/:id/flow',
    canActivate: [authGuard],
    loadComponent: () => import('./policies/flow-editor/flow-editor.component').then(m => m.FlowEditorComponent)
  },
  {
    path: 'decisions/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./decisions/dmn-editor/dmn-editor.component').then(m => m.DmnEditorComponent)
  },
  {
    path: 'tramites',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/tramites.component').then(m => m.TramitesComponent)
  },
  {
    path: 'tramites/nuevo',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/nuevo-tramite/nuevo-tramite.component').then(m => m.NuevoTramiteComponent)
  },
  {
    path: 'tramites/:id/correccion',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/tramite-correccion/tramite-correccion.component').then(m => m.TramiteCorreccionComponent)
  },
  {
    path: 'tramites/:id/apelacion',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/tramite-apelacion/tramite-apelacion.component').then(m => m.TramiteApelacionComponent)
  },
  {
    path: 'tramites/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./tramites/tramite-detalle/tramite-detalle.component').then(m => m.TramiteDetalleComponent)
  },
  {
    path: 'mis-tramites',
    canActivate: [authGuard],
    loadComponent: () => import('./mis-tramites/mis-tramites.component').then(m => m.MisTramitesComponent)
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
