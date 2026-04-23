export interface Empresa {
  id: string;
  nombre: string;
  razonSocial?: string;
  nit?: string;
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  activa: boolean;
  adminPrincipalId?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface EmpresaRequest {
  nombre: string;
  razonSocial?: string;
  nit?: string;
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  activa: boolean;
}
