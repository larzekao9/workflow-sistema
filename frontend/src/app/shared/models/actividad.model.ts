export type TipoActividad = 'INICIO' | 'TAREA' | 'DECISION' | 'FIN';
export type AccionPermitida = 'APROBAR' | 'RECHAZAR' | 'DEVOLVER' | 'ESCALAR' | 'OBSERVAR' | 'DENEGAR';

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
  cargoRequerido: string | null;
  departmentId: string | null;
  posicion: { x: number; y: number };
  transiciones: Transicion[];
  tiempoLimiteHoras: number | null;
  accionesPermitidas: AccionPermitida[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface ActividadPropiedadesRequest {
  nombre?: string;
  descripcion?: string;
  /** ID del departamento */
  area?: string;
  cargoRequerido?: string;
  formularioId?: string;
  slaHoras?: number;
  accionesPermitidas?: AccionPermitida[];
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
