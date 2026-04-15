import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Decision } from '../models/decision.model';

@Injectable({ providedIn: 'root' })
export class DecisionService {
  private url = `${environment.apiUrl}/decisions`;

  constructor(private http: HttpClient) {}

  create(politicaId: string, gatewayBpmnId: string, nombre: string): Observable<Decision> {
    return this.http.post<Decision>(this.url, { politicaId, gatewayBpmnId, nombre });
  }

  getById(id: string): Observable<Decision> {
    return this.http.get<Decision>(`${this.url}/${id}`);
  }

  listByPolitica(politicaId: string): Observable<Decision[]> {
    return this.http.get<Decision[]>(`${this.url}/by-politica/${politicaId}`);
  }

  getByGateway(politicaId: string, gatewayBpmnId: string): Observable<Decision> {
    return this.http.get<Decision>(`${this.url}/by-gateway`, {
      params: { politicaId, gatewayBpmnId }
    });
  }

  getDmn(id: string): Observable<{ dmnXml: string }> {
    return this.http.get<{ dmnXml: string }>(`${this.url}/${id}/dmn`);
  }

  saveDmn(id: string, dmnXml: string): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/dmn`, { dmnXml });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
