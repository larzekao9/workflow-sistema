from pydantic import BaseModel
from typing import Optional


class BpmnCommandRequest(BaseModel):
    prompt: str
    bpmnXml: str
    politicaId: Optional[str] = None


class BpmnOperation(BaseModel):
    type: str          # ADD_TASK, ADD_GATEWAY, CONNECT, DELETE, RENAME, MODIFY_XML
    description: str


class BpmnCommandResponse(BaseModel):
    newBpmnXml: str
    explanation: str
    operations: list[BpmnOperation]
    hasChanges: bool
