export type TipoCampo =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTISELECT'
  | 'TEXTAREA'
  | 'FILE'
  | 'EMAIL';

export type EstadoFormulario = 'ACTIVO' | 'INACTIVO';

export interface ValidacionCampo {
  min?: number;
  max?: number;
  pattern?: string;
  mensajeError?: string;
}

export interface CampoFormulario {
  id: string;
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  orden: number;
  placeholder?: string;
  valorDefecto?: string;
  opciones?: string[];
  validaciones?: ValidacionCampo;
}

export interface SeccionFormulario {
  id: string;
  titulo: string;
  orden: number;
  campos: CampoFormulario[];
}

export interface FormularioResponse {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoFormulario;
  secciones: SeccionFormulario[];
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  formJsSchema?: object;
}

export interface CreateFormularioRequest {
  nombre: string;
  descripcion: string;
  secciones: Omit<SeccionFormulario, 'id'>[];
  formJsSchema?: object;
}

export interface UpdateFormularioRequest {
  nombre?: string;
  descripcion?: string;
  estado?: EstadoFormulario;
  secciones?: Omit<SeccionFormulario, 'id'>[];
  formJsSchema?: object;
}

export interface PageFormulario {
  content: FormularioResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
