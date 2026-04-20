import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Tramite,
  CreateTramiteRequest,
  AvanzarTramiteRequest,
  FormularioActualResponse,
  TramiteStats
} from '../models/tramite.model';

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private readonly base = `${environment.apiUrl}/tramites`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    page = 0,
    size = 10,
    estado?: string
  ): Observable<{ content: Tramite[]; totalElements: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (estado && estado.trim() !== '') {
      params = params.set('estado', estado);
    }
    return this.http.get<{ content: Tramite[]; totalElements: number }>(this.base, { params });
  }

  getStats(): Observable<TramiteStats> {
    return this.http.get<TramiteStats>(`${this.base}/stats`);
  }

  getById(id: string): Observable<Tramite> {
    return this.http.get<Tramite>(`${this.base}/${id}`);
  }

  create(req: CreateTramiteRequest): Observable<Tramite> {
    return this.http.post<Tramite>(this.base, req);
  }

  avanzar(id: string, req: AvanzarTramiteRequest): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/avanzar`, req);
  }

  responder(id: string, observaciones: string): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/responder`, { observaciones });
  }

  getFormularioActual(id: string): Observable<FormularioActualResponse> {
    return this.http.get<FormularioActualResponse>(`${this.base}/${id}/formulario-actual`);
  }

  tomar(id: string): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/tomar`, {});
  }
}
