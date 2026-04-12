export type TramiteStatus = 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'SUSPENDED';

export interface Tramite {
  id: string;
  policyId: string;
  policyName: string;
  policyVersion: number;
  currentActivityId: string;
  currentActivityName: string;
  status: TramiteStatus;
  assignedUserId: string;
  assignedUserName?: string;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TramiteHistoryEvent {
  id: string;
  tramiteId: string;
  action: string;
  fromActivityId?: string;
  toActivityId?: string;
  performedBy: string;
  performedByName?: string;
  notes?: string;
  timestamp: string;
}

export interface AdvanceTramiteRequest {
  notes?: string;
  formData?: Record<string, unknown>;
}
