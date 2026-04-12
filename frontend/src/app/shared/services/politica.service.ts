import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Politica,
  CreatePoliticaRequest,
  UpdatePoliticaRequest,
  EstadoPolitica
} from '../models/politica.model';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly url = `${environment.apiUrl}/policies`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { estado?: EstadoPolitica; nombre?: string }): Observable<Politica[]> {
    let params = new HttpParams();
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.nombre) params = params.set('nombre', filters.nombre);
    return this.http.get<Politica[]>(this.url, { params });
  }

  getById(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.url}/${id}`);
  }

  getVersiones(versionPadreId: string): Observable<Politica[]> {
    return this.http.get<Politica[]>(this.url, {
      params: new HttpParams().set('versionPadreId', versionPadreId)
    });
  }

  create(data: CreatePoliticaRequest): Observable<Politica> {
    return this.http.post<Politica>(this.url, data);
  }

  update(id: string, data: UpdatePoliticaRequest): Observable<Politica> {
    return this.http.put<Politica>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  publish(id: string): Observable<Politica> {
    return this.http.post<Politica>(`${this.url}/${id}/publish`, {});
  }

  deactivate(id: string): Observable<Politica> {
    return this.http.put<Politica>(`${this.url}/${id}`, { estado: 'INACTIVA' });
  }

  newVersion(id: string): Observable<Politica> {
    return this.http.post<Politica>(`${this.url}/${id}/version`, {});
  }
}
