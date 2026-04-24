import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Tramite,
  CreateTramiteRequest,
  AvanzarTramiteRequest,
  FormularioActualResponse,
  TramiteStats,
  Apelacion
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

  getTramitesSinAsignar(
    page = 0,
    size = 20
  ): Observable<{ content: Tramite[]; totalElements: number }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<{ content: Tramite[]; totalElements: number }>(
      `${this.base}/sin-asignar`,
      { params }
    );
  }

  asignarManual(tramiteId: string, funcionarioId: string): Observable<Tramite> {
    return this.http.post<Tramite>(
      `${this.base}/${tramiteId}/asignar-manual`,
      { funcionarioId }
    );
  }

  observar(id: string, motivo: string, documentosIds?: string[]): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/observar`, { motivo, documentosIds });
  }

  denegar(id: string, motivo: string, documentosIds?: string[]): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/denegar`, { motivo, documentosIds });
  }

  apelar(id: string, justificacion: string, documentosIds?: string[]): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/apelar`, { justificacion, documentosIds });
  }

  resolverApelacion(id: string, aprobada: boolean, observaciones?: string): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/${id}/resolver-apelacion`, { aprobada, observaciones });
  }

  getApelacion(id: string): Observable<Apelacion> {
    return this.http.get<Apelacion>(`${this.base}/${id}/apelacion`);
  }
}
