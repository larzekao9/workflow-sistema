export type EstadoPolitica = 'BORRADOR' | 'ACTIVA' | 'INACTIVA' | 'ARCHIVADA';

export interface Politica {
  id: string;
  nombre: string;
  descripcion: string;
  version: number;
  versionPadreId: string | null;
  estado: EstadoPolitica;
  actividadInicioId: string | null;
  actividadIds: string[];
  metadatos: { tags: string[]; icono: string; color: string };
  creadoPorId: string;
  departamento: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreatePoliticaRequest {
  nombre: string;
  descripcion: string;
  departamento: string;
  metadatos?: { tags?: string[]; icono?: string; color?: string };
}

export interface UpdatePoliticaRequest {
  nombre?: string;
  descripcion?: string;
  departamento?: string;
  metadatos?: { tags?: string[]; icono?: string; color?: string };
}
