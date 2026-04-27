export type TipoNotificacion =
  | 'TRAMITE_AVANZADO'
  | 'TRAMITE_RECHAZADO'
  | 'TRAMITE_OBSERVADO'
  | 'TAREA_ASIGNADA'
  | 'CLIENTE_RESPONDIO'
  | 'APELACION_RESUELTA';

export interface Notificacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tramiteId: string | null;
  tipo: TipoNotificacion;
  leida: boolean;
  creadoEn: string; // ISO datetime
}
