import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Empresa, EmpresaRequest } from '../models/empresa.model';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly url = `${environment.apiUrl}/empresas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.url);
  }

  getById(id: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.url}/${id}`);
  }

  create(data: EmpresaRequest): Observable<Empresa> {
    return this.http.post<Empresa>(this.url, data);
  }

  update(id: string, data: EmpresaRequest): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  asignarAdmin(empresaId: string, adminId: string): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.url}/${empresaId}/asignar-admin`, { adminId });
  }
}
