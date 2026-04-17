import json
import logging
import anthropic
from app.schemas.bpmn_schemas import BpmnCommandRequest, BpmnCommandResponse, BpmnOperation
from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente experto en modelado de procesos BPMN 2.0.
Tu tarea es modificar diagramas BPMN XML según instrucciones en español.

Reglas estrictas:
- El XML que devuelves DEBE ser BPMN 2.0 válido, compatible con bpmn-js.
- Mantén todos los elementos existentes a menos que el usuario pida eliminarlos.
- Usa IDs únicos para elementos nuevos (formato: Element_XXXXXXXX con 8 caracteres hex).
- Los elementos del proceso van dentro del elemento <bpmn:process>.
- Los elementos visuales (BPMNShape, BPMNEdge) van dentro de <bpmndi:BPMNDiagram>.
- Posiciona los elementos nuevos de forma lógica (después del último elemento, hacia la derecha o abajo).
- Responde SIEMPRE con JSON válido, sin markdown, sin texto extra.

Formato de respuesta JSON:
{
  "newBpmnXml": "<xml completo del diagrama modificado>",
  "explanation": "Descripción en español de los cambios realizados",
  "operations": [
    {"type": "ADD_TASK", "description": "Agregué la tarea 'Nombre'"},
    {"type": "CONNECT", "description": "Conecté X con Y"}
  ],
  "hasChanges": true
}

Si la instrucción no requiere cambios, devuelve el mismo XML con hasChanges=false.
"""


async def process_bpmn_command(request: BpmnCommandRequest) -> BpmnCommandResponse:
    """
    Procesa un comando en lenguaje natural y modifica el BPMN XML usando Claude.
    """
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_message = f"""XML actual del diagrama BPMN:
<bpmn_xml>
{request.bpmnXml}
</bpmn_xml>

Instrucción del usuario: {request.prompt}

Devuelve SOLO el JSON con los cambios aplicados al XML."""

    message = client.messages.create(
        model=settings.claude_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    # Extraer texto de la respuesta de Claude — protegido ante respuesta vacía o inesperada
    try:
        raw = message.content[0].text.strip()
    except (IndexError, AttributeError) as e:
        logger.error("Respuesta de Claude sin contenido de texto: %s | content=%s", e, message.content)
        return BpmnCommandResponse(
            newBpmnXml=request.bpmnXml,
            explanation="El asistente no devolvió contenido. Intenta reformular la instrucción.",
            operations=[],
            hasChanges=False,
        )

    # Limpiar posible wrapper de código markdown
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    # Parsear JSON — protegido ante respuesta no estructurada de Claude
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("Claude no devolvió JSON válido. Error: %s | raw_response=%.500s", e, raw)
        return BpmnCommandResponse(
            newBpmnXml=request.bpmnXml,
            explanation="El asistente no pudo procesar el comando. Intenta reformular la instrucción.",
            operations=[],
            hasChanges=False,
        )

    operations = [
        BpmnOperation(type=op["type"], description=op["description"])
        for op in data.get("operations", [])
    ]

    return BpmnCommandResponse(
        newBpmnXml=data.get("newBpmnXml") or request.bpmnXml,
        explanation=data.get("explanation", "Cambios aplicados al diagrama."),
        operations=operations,
        hasChanges=data.get("hasChanges", True)
    )
