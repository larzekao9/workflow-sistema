import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Actividad,
  ActividadPropiedadesRequest,
  CreateActividadRequest,
  UpdateActividadRequest
} from '../models/actividad.model';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private readonly policiesUrl = `${environment.apiUrl}/policies`;
  private readonly activitiesUrl = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  getByPolitica(politicaId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.policiesUrl}/${politicaId}/activities`);
  }

  getByPolicy(politicaId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.activitiesUrl}/by-policy/${politicaId}`);
  }

  getById(id: string): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.activitiesUrl}/${id}`);
  }

  create(data: CreateActividadRequest): Observable<Actividad> {
    return this.http.post<Actividad>(this.activitiesUrl, data);
  }

  update(id: string, data: UpdateActividadRequest): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.activitiesUrl}/${id}`, data);
  }

  updatePropiedades(id: string, data: ActividadPropiedadesRequest): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.activitiesUrl}/${id}/propiedades`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.activitiesUrl}/${id}`);
  }
}
