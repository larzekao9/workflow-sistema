export type EstadoTramite = 'INICIADO' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO' | 'DEVUELTO' | 'ESCALADO';
export type AccionTramite = 'APROBAR' | 'RECHAZAR' | 'DEVOLVER' | 'ESCALAR';

export interface EtapaActual {
  actividadBpmnId: string;
  nombre: string;
  responsableRolNombre: string;
  formularioId?: string;
}

export interface HistorialEntry {
  actividadBpmnId?: string;
  actividadNombre?: string;
  responsableId?: string;
  responsableNombre?: string;
  accion: string;
  timestamp: string;
  observaciones?: string;
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
  INICIADO:   { label: 'Iniciado',   cssClass: 'chip-iniciado' },
  EN_PROCESO: { label: 'En proceso', cssClass: 'chip-en-proceso' },
  COMPLETADO: { label: 'Completado', cssClass: 'chip-completado' },
  RECHAZADO:  { label: 'Rechazado',  cssClass: 'chip-rechazado' },
  DEVUELTO:   { label: 'Devuelto',   cssClass: 'chip-devuelto' },
  CANCELADO:  { label: 'Cancelado',  cssClass: 'chip-cancelado' },
  ESCALADO:   { label: 'Escalado',   cssClass: 'chip-escalado' }
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
}
