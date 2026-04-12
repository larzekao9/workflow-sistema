from fastapi import APIRouter, HTTPException
from app.schemas.policy_schemas import PolicyGenerateRequest, PolicyGenerateResponse
from app.services.policy_service import generate_policy

router = APIRouter(prefix="/policy", tags=["policy"])


@router.post("/generate", response_model=PolicyGenerateResponse)
async def generate_policy_endpoint(request: PolicyGenerateRequest) -> PolicyGenerateResponse:
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="La descripción no puede estar vacía")
    return await generate_policy(request)
