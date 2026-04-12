from pydantic import BaseModel, Field


class ActivityDraft(BaseModel):
    name: str
    description: str
    type: str = Field(description="LINEAR | ALTERNATIVE | PARALLEL | ITERATIVE")
    order: int


class PolicyGenerateRequest(BaseModel):
    description: str = Field(min_length=10, description="Descripción en lenguaje natural de la política")
    context: str | None = None


class PolicyGenerateResponse(BaseModel):
    name: str
    description: str
    activities: list[ActivityDraft]
