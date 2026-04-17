import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
    return this.http.get<any>(this.url, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.content ?? []))
    );
  }

  getAllPaged(filters?: { estado?: EstadoPolitica; nombre?: string; page?: number; size?: number }): Observable<{ content: Politica[]; totalElements: number }> {
    let params = new HttpParams();
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.nombre) params = params.set('nombre', filters.nombre);
    params = params.set('page', (filters?.page ?? 0).toString());
    params = params.set('size', (filters?.size ?? 10).toString());
    return this.http.get<any>(this.url, { params }).pipe(
      map(res => Array.isArray(res)
        ? { content: res, totalElements: res.length }
        : { content: res?.content ?? [], totalElements: res?.totalElements ?? 0 }
      )
    );
  }

  getById(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.url}/${id}`);
  }

  getVersiones(versionPadreId: string): Observable<Politica[]> {
    // Backend devuelve Page<T> — extraer .content para evitar n.filter crash
    return this.http.get<any>(this.url, {
      params: new HttpParams().set('versionPadreId', versionPadreId)
    }).pipe(
      map(res => Array.isArray(res) ? res : (res?.content ?? []))
    );
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

  deleteAll(): Observable<{ mensaje: string; politicasEliminadas: number }> {
    return this.http.delete<{ mensaje: string; politicasEliminadas: number }>(this.url);
  }

  publish(id: string): Observable<Politica> {
    return this.http.post<Politica>(`${this.url}/${id}/publish`, {});
  }

  deactivate(id: string): Observable<Politica> {
    return this.http.put<Politica>(`${this.url}/${id}/deactivate`, {});
  }

  newVersion(id: string): Observable<Politica> {
    return this.http.post<Politica>(`${this.url}/${id}/version`, {});
  }

  getBpmn(id: string): Observable<{ bpmnXml: string; bpmnVersion: number }> {
    return this.http.get<{ bpmnXml: string; bpmnVersion: number }>(`${this.url}/${id}/bpmn`);
  }

  saveBpmn(id: string, bpmnXml: string, bpmnVersion?: number): Observable<{ bpmnVersion: number }> {
    return this.http.put<{ bpmnVersion: number }>(`${this.url}/${id}/bpmn`, { bpmnXml, bpmnVersion });
  }
}
