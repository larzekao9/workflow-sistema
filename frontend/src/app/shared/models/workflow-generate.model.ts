export interface CampoGenerado {
  nombre: string;
  label: string;
  tipo: string;
  required: boolean;
  opciones: string[];
}

export interface ActividadGenerada {
  nombre: string;
  departamento: string | null;
  rol: string;
  accionesPermitidas: string[];
  slaHoras: number;
  campos: CampoGenerado[];
}

export interface DepartamentoGenerado {
  nombre: string;
  descripcion: string;
}

export interface FuncionarioGenerado {
  nombre: string;
  email: string;
  departamento: string;
}

export interface WorkflowGenerateRequest {
  prompt: string;
  politicaNombre?: string;
  departamentosExistentes?: string[];
  proveedor?: string;
}

export interface WorkflowRefineRequest {
  bpmnXml: string;
  actividades: ActividadGenerada[];
  instruccion: string;
  politicaNombre?: string;
  proveedor?: string;
}

export interface WorkflowGenerateResponse {
  politicaNombre: string;
  descripcion: string;
  bpmnXml: string;
  departamentos: DepartamentoGenerado[];
  funcionarios: FuncionarioGenerado[];
  actividades: ActividadGenerada[];
}
