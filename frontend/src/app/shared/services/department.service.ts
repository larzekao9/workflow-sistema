import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Department, DepartmentRequest } from '../models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly url = `${environment.apiUrl}/departments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.url);
  }

  getById(id: string): Observable<Department> {
    return this.http.get<Department>(`${this.url}/${id}`);
  }

  create(data: DepartmentRequest): Observable<Department> {
    return this.http.post<Department>(this.url, data);
  }

  update(id: string, data: DepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getCargosByDepartamento(departmentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/${departmentId}/cargos`);
  }
}
