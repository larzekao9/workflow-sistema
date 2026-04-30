import anthropic
import httpx

from app.core.config import get_settings
from app.schemas.chat_schemas import ChatRequest, ChatResponse, FormSubmitRequest

settings = get_settings()

BACKEND_URL = "http://backend:8080"

TOOLS = [
    {
        "name": "listar_politicas",
        "description": "Lista las políticas activas disponibles para que el cliente inicie un trámite.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "iniciar_tramite",
        "description": "Inicia un nuevo trámite para una política específica. Úsala solo después de que el usuario confirme qué política quiere.",
        "input_schema": {
            "type": "object",
            "properties": {
                "politicaId": {"type": "string", "description": "ID de la política a iniciar"}
            },
            "required": ["politicaId"],
        },
    },
    {
        "name": "consultar_tramite",
        "description": "Consulta el estado actual de un trámite por su ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "tramiteId": {"type": "string", "description": "ID del trámite"}
            },
            "required": ["tramiteId"],
        },
    },
    {
        "name": "listar_mis_tramites",
        "description": "Lista todos los trámites del cliente autenticado.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]

SYSTEM_PROMPT = (
    "Eres un asistente virtual de atención al cliente para una empresa de telecomunicaciones. "
    "Ayudas a los clientes a iniciar trámites, consultar su estado y completar formularios. "
    "Responde siempre en español, sé breve y amable. "
    "Antes de iniciar un trámite, lista las opciones disponibles y pide confirmación al usuario. "
    "Cuando inicies un trámite y haya campos requeridos, informa al cliente que debe completar el formulario."
)


async def _call_backend(method: str, path: str, token: str, body: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        url = f"{BACKEND_URL}{path}"
        if method == "GET":
            resp = await client.get(url, headers=headers)
        else:
            resp = await client.post(url, headers=headers, json=body or {})
        resp.raise_for_status()
        return resp.json()


async def _execute_tool(name: str, inputs: dict, token: str, ctx: dict) -> str:
    try:
        if name == "listar_politicas":
            data = await _call_backend("GET", "/policies/publicas?size=10", token)
            items = data.get("content", [])
            if not items:
                return "No hay trámites disponibles en este momento."
            lines = [f"- {p['nombre']} (ID: {p['id']}): {p.get('descripcion', '')}" for p in items]
            return "Trámites disponibles:\n" + "\n".join(lines)

        elif name == "iniciar_tramite":
            data = await _call_backend("POST", "/tramites", token, {"politicaId": inputs["politicaId"]})
            tramite_id = data["id"]
            etapa = data.get("etapaActual", {}).get("nombre", "N/A")

            # Fetch form fields for the current stage
            try:
                form_data = await _call_backend("GET", f"/tramites/{tramite_id}/formulario-actual", token)
                campos = form_data.get("campos", [])
                if campos:
                    ctx["tramiteId"] = tramite_id
                    ctx["fields"] = campos
            except Exception:
                pass  # form fetch is best-effort

            return (
                f"Trámite iniciado. ID: {tramite_id}. "
                f"Estado: {data['estado']}. "
                f"Etapa actual: {etapa}."
                + (" Hay un formulario que completar." if ctx.get("fields") else "")
            )

        elif name == "consultar_tramite":
            data = await _call_backend("GET", f"/tramites/{inputs['tramiteId']}", token)
            etapa = data.get("etapaActual", {}).get("nombre", "N/A")
            return (
                f"Trámite {data['id']}: "
                f"Estado={data['estado']}, "
                f"Etapa={etapa}, "
                f"Política={data.get('politicaNombre', 'N/A')}."
            )

        elif name == "listar_mis_tramites":
            data = await _call_backend("GET", "/tramites/mis-tramites", token)
            items = data if isinstance(data, list) else data.get("content", [])
            if not items:
                return "No tienes trámites registrados."
            lines = [
                f"- {t.get('politicaNombre', 'N/A')}: {t['estado']} (ID: {t['id']})"
                for t in items[:5]
            ]
            return "Tus trámites:\n" + "\n".join(lines)

        return "Herramienta no reconocida."

    except httpx.HTTPStatusError as e:
        return f"Error al consultar el servicio ({e.response.status_code})."
    except Exception:
        return "Error inesperado al ejecutar la acción."


async def chat(request: ChatRequest) -> ChatResponse:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    ctx: dict = {}  # mutable context to capture form data from tools

    for _ in range(5):
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if hasattr(b, "text")), "")
            return ChatResponse(
                reply=text,
                action="FILL_FORM" if ctx.get("fields") else None,
                tramiteId=ctx.get("tramiteId"),
                fields=ctx.get("fields"),
            )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await _execute_tool(block.name, block.input, request.token, ctx)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        break

    return ChatResponse(reply="No pude procesar tu solicitud. Por favor intenta de nuevo.")


async def submit_form(request: FormSubmitRequest) -> ChatResponse:
    try:
        await _call_backend(
            "POST",
            f"/tramites/{request.tramiteId}/avanzar",
            request.token,
            {
                "accion": request.accion,
                "datos": request.camposFormulario,
            },
        )
        return ChatResponse(
            reply="Formulario enviado correctamente. Tu trámite ha avanzado a la siguiente etapa. "
                  "Te notificaremos cuando haya novedades."
        )
    except httpx.HTTPStatusError as e:
        return ChatResponse(reply=f"Error al enviar el formulario ({e.response.status_code}). Intenta de nuevo.")
    except Exception:
        return ChatResponse(reply="Error inesperado al enviar el formulario.")
