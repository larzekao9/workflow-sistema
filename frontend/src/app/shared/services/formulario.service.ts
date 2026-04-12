import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FormularioResponse,
  CreateFormularioRequest,
  UpdateFormularioRequest,
  PageFormulario,
  EstadoFormulario
} from '../models/formulario.model';

@Injectable({ providedIn: 'root' })
export class FormularioService {
  private readonly url = `${environment.apiUrl}/forms`;

  constructor(private http: HttpClient) {}

  getAll(params?: {
    nombre?: string;
    estado?: EstadoFormulario;
    page?: number;
    size?: number;
  }): Observable<PageFormulario> {
    let httpParams = new HttpParams();
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.estado) httpParams = httpParams.set('estado', params.estado);
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    return this.http.get<PageFormulario>(this.url, { params: httpParams });
  }

  getById(id: string): Observable<FormularioResponse> {
    return this.http.get<FormularioResponse>(`${this.url}/${id}`);
  }

  create(body: CreateFormularioRequest): Observable<FormularioResponse> {
    return this.http.post<FormularioResponse>(this.url, body);
  }

  update(id: string, body: UpdateFormularioRequest): Observable<FormularioResponse> {
    return this.http.put<FormularioResponse>(`${this.url}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
