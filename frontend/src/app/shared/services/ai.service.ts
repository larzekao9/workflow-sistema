import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BpmnCommandRequest, BpmnCommandResponse } from '../models/bpmn-command.model';
import { WorkflowGenerateRequest, WorkflowGenerateResponse, WorkflowRefineRequest } from '../models/workflow-generate.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private base = environment.aiServiceUrl;

  constructor(private http: HttpClient) {}

  sendBpmnCommand(request: BpmnCommandRequest): Observable<BpmnCommandResponse> {
    return this.http.post<BpmnCommandResponse>(`${this.base}/ai/bpmn/command`, request);
  }

  generateWorkflow(request: WorkflowGenerateRequest): Observable<WorkflowGenerateResponse> {
    return this.http.post<WorkflowGenerateResponse>(`${this.base}/ai/workflow/generate`, request);
  }

  refineWorkflow(request: WorkflowRefineRequest): Observable<WorkflowGenerateResponse> {
    return this.http.post<WorkflowGenerateResponse>(`${this.base}/ai/workflow/refine`, request);
  }
}
