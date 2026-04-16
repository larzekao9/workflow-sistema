export interface BpmnOperation {
  type: string;
  description: string;
}

export interface BpmnCommandRequest {
  prompt: string;
  bpmnXml: string;
  politicaId?: string;
}

export interface BpmnCommandResponse {
  newBpmnXml: string;
  explanation: string;
  operations: BpmnOperation[];
  hasChanges: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  operations?: BpmnOperation[];
  pendingXml?: string;  // XML listo para aplicar (muestra botones Aplicar/Descartar)
}
