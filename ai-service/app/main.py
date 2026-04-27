from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import AIServiceException, ValidationException, ai_service_exception_handler, validation_exception_handler
from app.routers import policy_router, tramite_router, flow_router
from app.routers import bpmn_router
from app.routers import workflow_router
from app.routers.workflow_router import transcribe_router

settings = get_settings()

app = FastAPI(
    title="Workflow AI Service",
    description="Microservicio de IA para generación y análisis de políticas de negocio",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AIServiceException, ai_service_exception_handler)
app.add_exception_handler(ValidationException, validation_exception_handler)

app.include_router(policy_router.router, prefix="/api/v1")
app.include_router(tramite_router.router, prefix="/api/v1")
app.include_router(flow_router.router, prefix="/api/v1")
app.include_router(bpmn_router.router, prefix="/ai")
app.include_router(workflow_router.router, prefix="/ai")
app.include_router(transcribe_router, prefix="/ai")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}
