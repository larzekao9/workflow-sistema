from fastapi import APIRouter, HTTPException
from app.schemas.tramite_schemas import TramiteSummarizeRequest, TramiteSummarizeResponse
from app.services.tramite_service import summarize_tramite

router = APIRouter(prefix="/tramite", tags=["tramite"])


@router.post("/summarize", response_model=TramiteSummarizeResponse)
async def summarize_tramite_endpoint(request: TramiteSummarizeRequest) -> TramiteSummarizeResponse:
    if not request.history:
        raise HTTPException(status_code=400, detail="El historial no puede estar vacío")
    return await summarize_tramite(request)
