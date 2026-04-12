from app.schemas.tramite_schemas import TramiteSummarizeRequest, TramiteSummarizeResponse

# TODO Sprint 5: reemplazar mock con llamada real a Claude API
async def summarize_tramite(request: TramiteSummarizeRequest) -> TramiteSummarizeResponse:
    """
    Resume el historial de un trámite en lenguaje natural.
    Sprint 5 implementará la llamada real a la API de Claude.
    """
    event_count = len(request.history)
    return TramiteSummarizeResponse(
        summary=f"Trámite {request.tramite_id} con {event_count} eventos registrados. (Resumen mock)",
        current_status="EN_PROGRESO",
        recommendations=["Completar documentación pendiente", "Asignar responsable a la siguiente etapa"]
    )
