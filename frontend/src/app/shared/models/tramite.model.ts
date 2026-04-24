export type EstadoTramite = 'INICIADO' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO' | 'DEVUELTO' | 'ESCALADO' | 'SIN_ASIGNAR' | 'EN_APELACION';
export type AccionTramite = 'APROBAR' | 'RECHAZAR' | 'DEVOLVER' | 'ESCALAR';

export interface EtapaActual {
  actividadBpmnId: string;
  nombre: string;
  responsableRolNombre: string;
  formularioId?: string;
  area?: string;
}

export interface FileRef {
  fileId: string;
  nombre: string;
  tipo: string;
  url: string;
  tamanio?: number;
  subidoEn?: string;
}

export interface Apelacion {
  activa: boolean;
  fechaInicio: string;
  fechaLimite: string;
  motivoOriginal: string;
  documentosOriginales?: FileRef[];
  documentosApelatoria?: FileRef[];
  justificacionCliente?: string;
  estado: 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'DENEGADO';
}

export interface HistorialEntry {
  actividadBpmnId?: string;
  actividadNombre?: string;
  responsableId?: string;
  responsableNombre?: string;
  responsableCargo?: string;
  accion: string;
  timestamp: string;
  observaciones?: string;
  documentosAdjuntos?: FileRef[];
}

export interface Tramite {
  id: string;
  politicaId: string;
  politicaNombre: string;
  politicaVersion: number;
  clienteId: string;
  clienteNombre?: string;
  estado: EstadoTramite;
  etapaActual?: EtapaActual;
  historial: HistorialEntry[];
  asignadoAId?: string;
  asignadoANombre?: string;
  creadoEn: string;
  actualizadoEn: string;
  fechaVencimientoEtapa?: string;
  apelacion?: Apelacion;
}

export interface CreateTramiteRequest {
  politicaId: string;
}

export interface AvanzarTramiteRequest {
  accion: AccionTramite;
  observaciones?: string;
  formularioRespuesta?: Record<string, unknown>;
}

export interface FormularioActualResponse {
  formularioId?: string;
  formJsSchema?: object;
}

export interface EstadoConfig {
  label: string;
  cssClass: string;
}

export const ESTADO_CONFIG: Record<EstadoTramite, EstadoConfig> = {
  INICIADO:      { label: 'Iniciado',       cssClass: 'chip-iniciado' },
  EN_PROCESO:    { label: 'En proceso',     cssClass: 'chip-en-proceso' },
  COMPLETADO:    { label: 'Completado',     cssClass: 'chip-completado' },
  RECHAZADO:     { label: 'Rechazado',      cssClass: 'chip-rechazado' },
  DEVUELTO:      { label: 'Devuelto',       cssClass: 'chip-devuelto' },
  CANCELADO:     { label: 'Cancelado',      cssClass: 'chip-cancelado' },
  ESCALADO:      { label: 'Escalado',       cssClass: 'chip-escalado' },
  SIN_ASIGNAR:   { label: 'Sin asignar',    cssClass: 'chip-sin-asignar' },
  EN_APELACION:  { label: 'En apelación',   cssClass: 'chip-en-apelacion' }
};

export function estadoConfig(estado: EstadoTramite): EstadoConfig {
  return ESTADO_CONFIG[estado] ?? { label: estado, cssClass: 'chip-cancelado' };
}

export interface TramiteStats {
  total: number;
  iniciados: number;
  enProceso: number;
  completados: number;
  rechazados: number;
  devueltos: number;
  escalados: number;
  sinAsignar?: number;
}
