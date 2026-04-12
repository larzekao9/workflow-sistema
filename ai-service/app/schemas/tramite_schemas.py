from pydantic import BaseModel


class HistoryEvent(BaseModel):
    action: str
    user: str
    timestamp: str
    notes: str | None = None


class TramiteSummarizeRequest(BaseModel):
    tramite_id: str
    history: list[HistoryEvent]


class TramiteSummarizeResponse(BaseModel):
    summary: str
    current_status: str
    recommendations: list[str]
