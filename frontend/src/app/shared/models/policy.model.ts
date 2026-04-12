export type PolicyStatus = 'DRAFT' | 'PUBLISHED' | 'FROZEN';
export type ActivityType = 'LINEAR' | 'ALTERNATIVE' | 'PARALLEL' | 'ITERATIVE';

export interface Policy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  version: number;
  activities: Activity[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  order: number;
  responsibleRoleId: string;
  responsibleRoleName?: string;
  formId?: string;
  conditions?: ActivityCondition[];
}

export interface ActivityCondition {
  field: string;
  operator: string;
  value: string;
  nextActivityId: string;
}

export interface CreatePolicyRequest {
  name: string;
  description: string;
}
