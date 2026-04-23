// Modelo alineado con los campos que retorna el backend (UserResponse)
export interface User {
  id: string;
  username: string;
  email: string;
  nombreCompleto: string;
  rolId: string;
  rolNombre?: string;
  departamento?: string;
  departmentId?: string;
  departmentNombre?: string;
  cargo?: string;
  activo: boolean;
  creadoEn: string;
  empresaId?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  nombreCompleto: string;
  password: string;
  rolId: string;
  departmentId?: string;
  cargo?: string;
  empresaId?: string;
}

export interface UpdateUserRequest {
  nombreCompleto?: string;
  rolId?: string;
  departmentId?: string;
  cargo?: string;
  activo?: boolean;
  empresaId?: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nombreCompleto: string;
  rolId: string;
}
