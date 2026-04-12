from pydantic import BaseModel


class ActivityMetric(BaseModel):
    name: str
    avg_duration_hours: float
    pending_count: int


class FlowAnalyzeRequest(BaseModel):
    policy_name: str
    activities_metrics: list[ActivityMetric]


class FlowAnalyzeResponse(BaseModel):
    bottlenecks: list[str]
    recommendations: list[str]
    risk_level: str  # LOW | MEDIUM | HIGH
