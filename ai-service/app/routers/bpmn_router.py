from fastapi import APIRouter, HTTPException
from app.schemas.bpmn_schemas import BpmnCommandRequest, BpmnCommandResponse
from app.services.bpmn_command_service import process_bpmn_command

router = APIRouter(prefix="/bpmn", tags=["bpmn"])


@router.post("/command", response_model=BpmnCommandResponse)
async def bpmn_command(request: BpmnCommandRequest) -> BpmnCommandResponse:
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío")
    if not request.bpmnXml or not request.bpmnXml.strip():
        raise HTTPException(status_code=400, detail="El XML del diagrama no puede estar vacío")

    return await process_bpmn_command(request)
