export interface Department {
  id: string;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  activa: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  empresaId?: string;
}

export interface DepartmentRequest {
  nombre: string;
  descripcion?: string;
  responsable?: string;
  activa: boolean;
  empresaId?: string;
}
