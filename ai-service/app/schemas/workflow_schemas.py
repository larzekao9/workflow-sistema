from pydantic import BaseModel


class CampoFormulario(BaseModel):
    nombre: str
    label: str
    tipo: str  # TEXT | NUMBER | DATE | FILE | SELECT | TEXTAREA | BOOLEAN
    required: bool = False
    opciones: list[str] = []


class ActividadGenerada(BaseModel):
    nombre: str
    departamento: str | None = None  # None = asignado al cliente
    rol: str = "FUNCIONARIO"
    accionesPermitidas: list[str] = ["APROBAR", "RECHAZAR", "DEVOLVER"]
    slaHoras: int = 24
    campos: list[CampoFormulario] = []


class DepartamentoGenerado(BaseModel):
    nombre: str
    descripcion: str = ""


class FuncionarioGenerado(BaseModel):
    nombre: str
    email: str
    departamento: str


class WorkflowRefineRequest(BaseModel):
    bpmnXml: str
    actividades: list[ActividadGenerada] = []
    instruccion: str
    politicaNombre: str = ""
    proveedor: str = "claude"


class WorkflowGenerateRequest(BaseModel):
    prompt: str
    politicaNombre: str = ""
    departamentosExistentes: list[str] = []
    proveedor: str = "claude"  # "claude" | "groq"


class WorkflowGenerateResponse(BaseModel):
    politicaNombre: str
    descripcion: str
    bpmnXml: str
    departamentos: list[DepartamentoGenerado] = []
    funcionarios: list[FuncionarioGenerado] = []
    actividades: list[ActividadGenerada] = []
