export type TipoRelacion =
  | 'DEPENDENCIA'
  | 'PRECEDENCIA'
  | 'COMPLEMENTO'
  | 'EXCLUSION'
  | 'OVERRIDE'
  | 'ESCALAMIENTO';

export interface PoliticaRelacionResponse {
  id: string;
  politicaOrigenId: string;
  politicaOrigenNombre: string;
  politicaDestinoId: string;
  politicaDestinoNombre: string;
  tipoRelacion: TipoRelacion;
  prioridad: number;
  descripcion?: string;
  activo: boolean;
  creadoEn: string;
}

export interface CreatePoliticaRelacionRequest {
  politicaDestinoId: string;
  tipoRelacion: TipoRelacion;
  prioridad: number;
  descripcion?: string;
}
