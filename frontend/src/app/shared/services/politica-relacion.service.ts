import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  PoliticaRelacionResponse,
  CreatePoliticaRelacionRequest
} from '../models/politica-relacion.model';

@Injectable({ providedIn: 'root' })
export class PoliticaRelacionService {
  private readonly baseUrl = `${environment.apiUrl}/policies`;

  constructor(private http: HttpClient) {}

  getByPolitica(policyId: string): Observable<PoliticaRelacionResponse[]> {
    return this.http.get<PoliticaRelacionResponse[]>(
      `${this.baseUrl}/${policyId}/relations`
    );
  }

  create(
    policyId: string,
    body: CreatePoliticaRelacionRequest
  ): Observable<PoliticaRelacionResponse> {
    return this.http.post<PoliticaRelacionResponse>(
      `${this.baseUrl}/${policyId}/relations`,
      body
    );
  }

  delete(policyId: string, relacionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${policyId}/relations/${relacionId}`
    );
  }
}
