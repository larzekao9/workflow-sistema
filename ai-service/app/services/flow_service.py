from app.schemas.flow_schemas import FlowAnalyzeRequest, FlowAnalyzeResponse

# TODO Sprint 5: reemplazar mock con llamada real a Claude API
async def analyze_flow(request: FlowAnalyzeRequest) -> FlowAnalyzeResponse:
    """
    Detecta cuellos de botella en un flujo de política.
    Sprint 5 implementará la llamada real a la API de Claude.
    """
    slow_activities = [
        m.name for m in request.activities_metrics
        if m.avg_duration_hours > 24 or m.pending_count > 5
    ]
    risk = "HIGH" if len(slow_activities) > 2 else "MEDIUM" if slow_activities else "LOW"
    return FlowAnalyzeResponse(
        bottlenecks=slow_activities if slow_activities else ["Sin cuellos de botella detectados (mock)"],
        recommendations=["Revisar capacidad del equipo", "Automatizar validaciones repetitivas"],
        risk_level=risk
    )
