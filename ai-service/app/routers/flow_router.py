from fastapi import APIRouter, HTTPException
from app.schemas.flow_schemas import FlowAnalyzeRequest, FlowAnalyzeResponse
from app.services.flow_service import analyze_flow

router = APIRouter(prefix="/flow", tags=["flow"])


@router.post("/analyze", response_model=FlowAnalyzeResponse)
async def analyze_flow_endpoint(request: FlowAnalyzeRequest) -> FlowAnalyzeResponse:
    if not request.activities_metrics:
        raise HTTPException(status_code=400, detail="Las métricas de actividades no pueden estar vacías")
    return await analyze_flow(request)
