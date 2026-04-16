import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BpmnCommandRequest, BpmnCommandResponse } from '../models/bpmn-command.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private base = environment.aiServiceUrl;

  constructor(private http: HttpClient) {}

  sendBpmnCommand(request: BpmnCommandRequest): Observable<BpmnCommandResponse> {
    return this.http.post<BpmnCommandResponse>(`${this.base}/ai/bpmn/command`, request);
  }
}
