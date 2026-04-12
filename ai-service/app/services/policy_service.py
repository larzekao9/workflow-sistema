from app.schemas.policy_schemas import PolicyGenerateRequest, PolicyGenerateResponse, ActivityDraft
from app.core.config import get_settings

# TODO Sprint 5: reemplazar mock con llamada real a Claude API
async def generate_policy(request: PolicyGenerateRequest) -> PolicyGenerateResponse:
    """
    Genera un borrador de política a partir de una descripción en lenguaje natural.
    Sprint 5 implementará la llamada real a la API de Claude.
    """
    return PolicyGenerateResponse(
        name="Política generada (mock)",
        description=request.description,
        activities=[
            ActivityDraft(name="Recepción de solicitud", description="Primera etapa", type="LINEAR", order=1),
            ActivityDraft(name="Revisión", description="Validación de documentos", type="LINEAR", order=2),
            ActivityDraft(name="Aprobación", description="Decisión final", type="ALTERNATIVE", order=3),
        ]
    )
