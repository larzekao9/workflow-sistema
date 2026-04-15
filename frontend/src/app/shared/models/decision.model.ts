export interface Decision {
  id: string;
  nombre: string;
  dmnXml?: string;
  politicaId: string;
  gatewayBpmnId: string;
  creadoPorId?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}
