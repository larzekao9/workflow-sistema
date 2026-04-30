export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ApiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ApiChatMessage[];
  token: string;
}

export interface ChatResponse {
  reply: string;
  action?: string | null;
  tramiteId?: string | null;
  politicaId?: string | null;
  fields?: Record<string, unknown>[] | null;
}
