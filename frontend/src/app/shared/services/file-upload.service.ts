import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface FileReference {
  fileId: string;
  nombre: string;
  tipo: string;
  url: string;
  tamanio: number;
  subidoEn: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly uploadUrl = `${environment.apiUrl}/files/upload`;
  private readonly filesUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  /**
   * Sube un archivo al servidor.
   * Usa reportProgress: true para permitir seguimiento de progreso si el caller lo necesita.
   */
  upload(file: File): Observable<FileReference> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileReference>(this.uploadUrl, formData, {
      reportProgress: true
    });
  }

  /**
   * Construye la URL completa para visualizar o descargar un archivo por su ID.
   */
  getFileUrl(fileId: string): string {
    return `${this.filesUrl}/${fileId}`;
  }

  /**
   * Elimina un archivo del servidor por su ID.
   */
  delete(fileId: string): Observable<void> {
    return this.http.delete<void>(`${this.filesUrl}/${fileId}`);
  }
}
