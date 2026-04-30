import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiChatMessage, ChatRequest, ChatResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly base = `${environment.aiServiceUrl}/ai/chat`;

  constructor(private http: HttpClient) {}

  private get token(): string {
    return sessionStorage.getItem('access_token') ?? '';
  }

  sendMessage(messages: ApiChatMessage[]): Observable<ChatResponse> {
    const request: ChatRequest = { messages, token: this.token };
    return this.http.post<ChatResponse>(this.base, request);
  }

  submitForm(tramiteId: string, camposFormulario: Record<string, string>): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/submit-form`, {
      tramiteId,
      camposFormulario,
      token: this.token,
      accion: 'APROBAR',
    });
  }
}
