// Modelo alineado con los campos que retorna el backend (RoleResponse)
export interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  activo: boolean;
  creadoEn: string;
}

export interface CreateRoleRequest {
  nombre: string;
  descripcion: string;
  permisos: string[];
}

export interface UpdateRoleRequest {
  nombre?: string;
  descripcion?: string;
  permisos?: string[];
  activo?: boolean;
}
