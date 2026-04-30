from fastapi import APIRouter
from app.schemas.chat_schemas import ChatRequest, ChatResponse, FormSubmitRequest
from app.services.chat_service import chat, submit_form

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    return await chat(request)


@router.post("/submit-form", response_model=ChatResponse)
async def submit_form_endpoint(request: FormSubmitRequest) -> ChatResponse:
    return await submit_form(request)
