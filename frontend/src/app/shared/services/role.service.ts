import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly url = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.url);
  }

  getById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.url}/${id}`);
  }

  create(data: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.url, data);
  }

  update(id: string, data: UpdateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
