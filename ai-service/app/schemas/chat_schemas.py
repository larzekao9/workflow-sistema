from pydantic import BaseModel
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    token: str


class ChatResponse(BaseModel):
    reply: str
    action: str | None = None
    tramiteId: str | None = None
    politicaId: str | None = None
    fields: list[dict] | None = None


class FormSubmitRequest(BaseModel):
    tramiteId: str
    camposFormulario: dict
    token: str
    accion: str = "APROBAR"
