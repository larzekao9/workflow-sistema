import anthropic
import groq as groq_sdk
from fastapi import APIRouter, HTTPException, UploadFile, File
from groq import Groq

from app.core.config import get_settings
from app.schemas.workflow_schemas import WorkflowGenerateRequest, WorkflowGenerateResponse, WorkflowRefineRequest
from app.services.workflow_service import generate_workflow, refine_workflow

router = APIRouter(prefix="/workflow", tags=["workflow"])
transcribe_router = APIRouter(tags=["transcribe"])


@router.post("/generate", response_model=WorkflowGenerateResponse)
async def workflow_generate(request: WorkflowGenerateRequest) -> WorkflowGenerateResponse:
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío")
    try:
        return await generate_workflow(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except anthropic.BadRequestError as e:
        raise HTTPException(status_code=402, detail=f"Error en API de Claude: {e.message}")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error comunicando con Claude: {e.message}")
    except groq_sdk.AuthenticationError:
        raise HTTPException(status_code=401, detail="GROQ_API_KEY inválida — verificá la key en console.groq.com")
    except groq_sdk.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error comunicando con Groq: {e}")


@router.post("/refine", response_model=WorkflowGenerateResponse)
async def workflow_refine(request: WorkflowRefineRequest) -> WorkflowGenerateResponse:
    if not request.instruccion or not request.instruccion.strip():
        raise HTTPException(status_code=400, detail="La instrucción no puede estar vacía")
    if not request.bpmnXml or not request.bpmnXml.strip():
        raise HTTPException(status_code=400, detail="Se requiere el bpmnXml actual para refinar")
    try:
        return await refine_workflow(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except anthropic.BadRequestError as e:
        raise HTTPException(status_code=402, detail=f"Error en API de Claude: {e.message}")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error comunicando con Claude: {e.message}")
    except groq_sdk.AuthenticationError:
        raise HTTPException(status_code=401, detail="GROQ_API_KEY inválida")
    except groq_sdk.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error comunicando con Groq: {e}")


@transcribe_router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)) -> dict:
    settings = get_settings()
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")
    try:
        client = Groq(api_key=settings.groq_api_key)
        transcription = client.audio.transcriptions.create(
            file=(audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
            model="whisper-large-v3-turbo",
            language="es",
        )
        return {"text": transcription.text}
    except groq_sdk.AuthenticationError:
        raise HTTPException(status_code=401, detail="GROQ_API_KEY inválida — verificá la key en console.groq.com")
    except groq_sdk.APIError as e:
        raise HTTPException(status_code=502, detail=f"Error comunicando con Groq Whisper: {e}")
