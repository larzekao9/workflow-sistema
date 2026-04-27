import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMisNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(`${this.apiUrl}/notificaciones`);
  }

  marcarLeida(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notificaciones/${id}/leer`, {});
  }
}
