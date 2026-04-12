export type TipoActividad = 'INICIO' | 'TAREA' | 'DECISION' | 'FIN';

export interface Transicion {
  actividadDestinoId: string;
  condicion: string;
  etiqueta: string;
}

export interface Actividad {
  id: string;
  politicaId: string;
  nombre: string;
  descripcion: string;
  tipo: TipoActividad;
  responsableRolId: string | null;
  formularioId: string | null;
  posicion: { x: number; y: number };
  transiciones: Transicion[];
  tiempoLimiteHoras: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreateActividadRequest {
  politicaId: string;
  nombre: string;
  descripcion: string;
  tipo: TipoActividad;
  responsableRolId?: string | null;
  formularioId?: string | null;
  posicion: { x: number; y: number };
  transiciones?: Transicion[];
  tiempoLimiteHoras?: number | null;
}

export interface UpdateActividadRequest {
  nombre?: string;
  descripcion?: string;
  tipo?: TipoActividad;
  responsableRolId?: string | null;
  formularioId?: string | null;
  posicion?: { x: number; y: number };
  transiciones?: Transicion[];
  tiempoLimiteHoras?: number | null;
}
