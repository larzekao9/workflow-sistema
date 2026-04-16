import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken, HttpContext } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Marcar una request HTTP de fondo para que un 401 NO dispare logout automático.
 * Uso: http.get(url, { context: new HttpContext().set(SKIP_AUTH_LOGOUT, true) })
 */
export const SKIP_AUTH_LOGOUT = new HttpContextToken<boolean>(() => false);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  const authService = inject(AuthService);

  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo hacer logout si: recibimos 401 CON token válido enviado (no una cascade sin token)
      // Y la request NO está marcada como "background" (colaboración, polling, etc.)
      const skipLogout = req.context.get(SKIP_AUTH_LOGOUT);
      if (error.status === 401 && !!token && !skipLogout) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
