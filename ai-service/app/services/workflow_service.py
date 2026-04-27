import json
import logging
import anthropic
from groq import Groq

from app.core.config import get_settings
from app.schemas.workflow_schemas import (
    WorkflowGenerateRequest, WorkflowGenerateResponse,
    WorkflowRefineRequest,
    ActividadGenerada, CampoFormulario,
    DepartamentoGenerado, FuncionarioGenerado,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sos un experto en diseño de workflows empresariales BPMN 2.0.
Tu tarea es generar un workflow completo y funcional a partir de una descripción en lenguaje natural.

═══════════════════════════════════════════════
RESTRICCIONES DEL MOTOR BPMN (críticas — no negociables)
═══════════════════════════════════════════════
1. El motor siempre toma el PRIMER outgoing de un gateway (no evalúa condiciones).
2. Las tareas automáticas (scriptTask, serviceTask) se atraviesan sin intervención humana.
3. ExclusiveGateway: primera salida = camino normal/happy-path; segunda = visual/alternativa.
4. ParallelGateway split: primera salida = camino secuencial real; segunda = fork visual.
5. ParallelGateway join: único outgoing → siguiente tarea real.
6. El nombre del userTask en BPMN DEBE coincidir exactamente (carácter a carácter) con el campo "nombre" de la actividad.

═══════════════════════════════════════════════
PATRÓN OBLIGATORIO EN CADA userTask BPMN
═══════════════════════════════════════════════
CADA userTask DEBE tener EXACTAMENTE estos dos atributos/elementos:

  <userTask id="t1" name="Nombre Tarea" camunda:candidateGroups="CLIENTE_O_FUNCIONARIO">
    <documentation>AREA:NombreExactoDelDepartamento</documentation>
  </userTask>

Reglas:
- camunda:candidateGroups: "CLIENTE" para la primera tarea, "FUNCIONARIO" para todas las demás.
- AREA:nombre: el nombre del departamento TAL CUAL aparece en departamentos[].nombre.
- Para tarea CLIENTE: <documentation>AREA:Cliente</documentation>
- El AREA: en BPMN DEBE ser idéntico a departamentos[].nombre (mismo texto, misma capitalización).
- Sin este patrón el motor no puede asignar la tarea al área correcta.

═══════════════════════════════════════════════
CONSISTENCIA OBLIGATORIA DE NOMBRES
═══════════════════════════════════════════════
Los nombres de departamentos deben ser IDÉNTICOS en los 3 lugares:
  departamentos[i].nombre  ==  actividades[j].departamento  ==  AREA: en BPMN documentation

Ejemplo correcto:
  departamentos: [{"nombre": "Activaciones"}, {"nombre": "Técnica"}]
  actividades:   [{"departamento": "Activaciones"}, {"departamento": "Técnica"}]
  BPMN:          <documentation>AREA:Activaciones</documentation>
                 <documentation>AREA:Técnica</documentation>

NUNCA uses nombres distintos para el mismo departamento en distintos campos.

═══════════════════════════════════════════════
TIPOS DE CAMPO DISPONIBLES
═══════════════════════════════════════════════
TEXT, NUMBER, DATE, FILE, SELECT, TEXTAREA, BOOLEAN
- SELECT requiere opciones[] con al menos 2 valores.
- FILE → el usuario sube un archivo (foto, PDF, etc).

═══════════════════════════════════════════════
REGLAS DE COORDENADAS BPMN DI
═══════════════════════════════════════════════
Pool horizontal con lanes verticales:
- Pool: x=100, y=60, width=200+(N_elementos*200), height=150*N_lanes
- Lanes: x=130, h=150 cada uno, apilados verticalmente desde y=60
- center_y de lane i = 60 + 150*i + 75  →  lane 0=135, lane 1=285, lane 2=435, lane 3=585
- UserTask: 120x80   (x-60, y-40 desde center)
- Gateway: 50x50     (x-25, y-25 desde center)
- StartEvent/EndEvent: 36x36 (x-18, y-18 desde center)
- Espaciado horizontal entre elementos: 180-200px

═══════════════════════════════════════════════
EJEMPLO COMPLETO — Proceso Simple (2 departamentos)
Proceso: Cliente solicita → Soporte verifica → Fin
═══════════════════════════════════════════════
JSON de referencia (bpmnXml simplificado para claridad):

{
  "politicaNombre": "Solicitud de Soporte",
  "descripcion": "Cliente solicita soporte técnico y el área lo resuelve.",
  "departamentos": [{"nombre": "Soporte", "descripcion": "Área de soporte técnico"}],
  "funcionarios": [{"nombre": "Ana García", "email": "ana.garcia@empresa.bo", "departamento": "Soporte"}],
  "actividades": [
    {
      "nombre": "Solicitud de Soporte",
      "departamento": null,
      "rol": "CLIENTE",
      "accionesPermitidas": ["APROBAR"],
      "slaHoras": 48,
      "campos": [
        {"nombre": "descripcion_problema", "label": "Descripción del problema", "tipo": "TEXTAREA", "required": true, "opciones": []},
        {"nombre": "numero_equipo", "label": "Número de equipo", "tipo": "TEXT", "required": true, "opciones": []}
      ]
    },
    {
      "nombre": "Resolución de Soporte",
      "departamento": "Soporte",
      "rol": "FUNCIONARIO",
      "accionesPermitidas": ["APROBAR", "RECHAZAR", "DEVOLVER"],
      "slaHoras": 24,
      "campos": [
        {"nombre": "diagnostico", "label": "Diagnóstico", "tipo": "TEXTAREA", "required": true, "opciones": []},
        {"nombre": "solucion_aplicada", "label": "Solución aplicada", "tipo": "SELECT", "required": true, "opciones": ["Remoto", "En sitio", "Cambio de equipo"]}
      ]
    }
  ],
  "bpmnXml": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><definitions xmlns=\\"http://www.omg.org/spec/BPMN/20100524/MODEL\\" xmlns:bpmndi=\\"http://www.omg.org/spec/BPMN/20100524/DI\\" xmlns:dc=\\"http://www.omg.org/spec/DD/20100524/DC\\" xmlns:di=\\"http://www.omg.org/spec/DD/20100524/DI\\" xmlns:camunda=\\"http://camunda.org/schema/1.0/bpmn\\" targetNamespace=\\"http://workflow.com/bpmn\\"><collaboration id=\\"collab1\\"><participant id=\\"pool1\\" name=\\"Solicitud de Soporte\\" processRef=\\"proc1\\"/></collaboration><process id=\\"proc1\\" isExecutable=\\"true\\"><laneSet id=\\"ls1\\"><lane id=\\"lane0\\" name=\\"Cliente\\"><flowNodeRef>start</flowNodeRef><flowNodeRef>t1</flowNodeRef></lane><lane id=\\"lane1\\" name=\\"Soporte\\"><flowNodeRef>t2</flowNodeRef><flowNodeRef>end</flowNodeRef></lane></laneSet><startEvent id=\\"start\\"/><sequenceFlow id=\\"f0\\" sourceRef=\\"start\\" targetRef=\\"t1\\"/><userTask id=\\"t1\\" name=\\"Solicitud de Soporte\\" camunda:candidateGroups=\\"CLIENTE\\"><documentation>AREA:Cliente</documentation></userTask><sequenceFlow id=\\"f1\\" sourceRef=\\"t1\\" targetRef=\\"t2\\"/><userTask id=\\"t2\\" name=\\"Resolución de Soporte\\" camunda:candidateGroups=\\"FUNCIONARIO\\"><documentation>AREA:Soporte</documentation></userTask><sequenceFlow id=\\"f2\\" sourceRef=\\"t2\\" targetRef=\\"end\\"/><endEvent id=\\"end\\"/></process><bpmndi:BPMNDiagram id=\\"diagram1\\"><bpmndi:BPMNPlane bpmnElement=\\"collab1\\"><bpmndi:BPMNShape id=\\"pool1_di\\" bpmnElement=\\"pool1\\" isHorizontal=\\"true\\"><dc:Bounds x=\\"100\\" y=\\"60\\" width=\\"800\\" height=\\"300\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"lane0_di\\" bpmnElement=\\"lane0\\" isHorizontal=\\"true\\"><dc:Bounds x=\\"130\\" y=\\"60\\" width=\\"770\\" height=\\"150\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"lane1_di\\" bpmnElement=\\"lane1\\" isHorizontal=\\"true\\"><dc:Bounds x=\\"130\\" y=\\"210\\" width=\\"770\\" height=\\"150\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"start_di\\" bpmnElement=\\"start\\"><dc:Bounds x=\\"200\\" y=\\"117\\" width=\\"36\\" height=\\"36\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"t1_di\\" bpmnElement=\\"t1\\"><dc:Bounds x=\\"300\\" y=\\"95\\" width=\\"120\\" height=\\"80\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"t2_di\\" bpmnElement=\\"t2\\"><dc:Bounds x=\\"500\\" y=\\"245\\" width=\\"120\\" height=\\"80\\"/></bpmndi:BPMNShape><bpmndi:BPMNShape id=\\"end_di\\" bpmnElement=\\"end\\"><dc:Bounds x=\\"700\\" y=\\"267\\" width=\\"36\\" height=\\"36\\"/></bpmndi:BPMNShape><bpmndi:BPMNEdge id=\\"f0_di\\" bpmnElement=\\"f0\\"><di:waypoint x=\\"236\\" y=\\"135\\"/><di:waypoint x=\\"300\\" y=\\"135\\"/></bpmndi:BPMNEdge><bpmndi:BPMNEdge id=\\"f1_di\\" bpmnElement=\\"f1\\"><di:waypoint x=\\"420\\" y=\\"135\\"/><di:waypoint x=\\"460\\" y=\\"135\\"/><di:waypoint x=\\"460\\" y=\\"285\\"/><di:waypoint x=\\"500\\" y=\\"285\\"/></bpmndi:BPMNEdge><bpmndi:BPMNEdge id=\\"f2_di\\" bpmnElement=\\"f2\\"><di:waypoint x=\\"620\\" y=\\"285\\"/><di:waypoint x=\\"700\\" y=\\"285\\"/></bpmndi:BPMNEdge></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></definitions>"
}

═══════════════════════════════════════════════
FORMATO DE RESPUESTA (JSON estricto, sin markdown)
═══════════════════════════════════════════════
{
  "politicaNombre": "Nombre del proceso",
  "descripcion": "Descripción del proceso en 1-2 oraciones",
  "departamentos": [
    { "nombre": "NombreExacto", "descripcion": "Descripción del área" }
  ],
  "funcionarios": [
    { "nombre": "Nombre Apellido", "email": "nombre.apellido@empresa.bo", "departamento": "NombreExacto" }
  ],
  "actividades": [
    {
      "nombre": "Nombre exacto igual al name del userTask en BPMN",
      "departamento": null,
      "rol": "CLIENTE",
      "accionesPermitidas": ["APROBAR"],
      "slaHoras": 48,
      "campos": [
        { "nombre": "campo_id", "label": "Etiqueta visible", "tipo": "TEXT", "required": true, "opciones": [] }
      ]
    }
  ],
  "bpmnXml": "... XML completo con DI, swimlanes, camunda:candidateGroups y AREA: en documentation ..."
}

REGLAS ADICIONALES:
- Mínimo 3 actividades, máximo 7.
- La primera actividad SIEMPRE es del CLIENTE (departamento=null, rol=CLIENTE, accionesPermitidas=["APROBAR"]).
- Cada departamento tiene exactamente 1 funcionario de ejemplo.
- Email format: nombre.apellido@empresa.bo (sin espacios, sin acentos, solo minúsculas).
- El bpmnXml DEBE tener swimlanes (collaboration + pool + laneSet + lanes).
- Incluir al menos 1 exclusiveGateway para la decisión de negocio principal.
- Si el proceso tiene revisión paralela → incluir parallelGateway.
- TODO userTask DEBE tener camunda:candidateGroups y <documentation>AREA:nombre</documentation>.
- Responde SOLO con JSON válido. Sin texto antes ni después. Sin markdown.
"""


def _parse_response(raw: str, request: WorkflowGenerateRequest) -> WorkflowGenerateResponse:
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    data = json.loads(raw)

    actividades = [
        ActividadGenerada(
            nombre=a["nombre"],
            departamento=a.get("departamento"),
            rol=a.get("rol", "FUNCIONARIO"),
            accionesPermitidas=a.get("accionesPermitidas", ["APROBAR", "RECHAZAR", "DEVOLVER"]),
            slaHoras=a.get("slaHoras", 24),
            campos=[
                CampoFormulario(
                    nombre=c["nombre"],
                    label=c["label"],
                    tipo=c["tipo"],
                    required=c.get("required", False),
                    opciones=c.get("opciones", []),
                )
                for c in a.get("campos", [])
            ],
        )
        for a in data.get("actividades", [])
    ]

    departamentos = [
        DepartamentoGenerado(nombre=d["nombre"], descripcion=d.get("descripcion", ""))
        for d in data.get("departamentos", [])
    ]

    funcionarios = [
        FuncionarioGenerado(nombre=f["nombre"], email=f["email"], departamento=f["departamento"])
        for f in data.get("funcionarios", [])
    ]

    return WorkflowGenerateResponse(
        politicaNombre=data.get("politicaNombre") or request.politicaNombre or "Proceso generado",
        descripcion=data.get("descripcion", ""),
        bpmnXml=data["bpmnXml"],
        departamentos=departamentos,
        funcionarios=funcionarios,
        actividades=actividades,
    )


def _build_user_msg(request: WorkflowGenerateRequest) -> str:
    contexto_depts = ""
    if request.departamentosExistentes:
        contexto_depts = f"\nDepartamentos ya existentes: {', '.join(request.departamentosExistentes)}. Reutilizalos si aplican."
    return (
        f"Generá un workflow empresarial completo para el siguiente proceso:\n\n"
        f"{request.prompt}\n"
        f"{f'Nombre sugerido: {request.politicaNombre}' if request.politicaNombre else ''}"
        f"{contexto_depts}\n\n"
        f"Devolvé SOLO el JSON con bpmnXml, departamentos, funcionarios y actividades."
    )


async def _call_claude(user_msg: str, settings) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.claude_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return message.content[0].text.strip()


async def _call_groq(user_msg: str, settings) -> str:
    client = Groq(api_key=settings.groq_api_key)
    completion = client.chat.completions.create(
        model=settings.groq_model,
        max_tokens=settings.max_tokens,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    )
    return completion.choices[0].message.content.strip()


async def generate_workflow(request: WorkflowGenerateRequest) -> WorkflowGenerateResponse:
    settings = get_settings()
    user_msg = _build_user_msg(request)
    proveedor = (request.proveedor or "claude").lower()

    logger.info("[WorkflowService] Generando con proveedor=%s prompt=%.100s", proveedor, request.prompt)

    if proveedor == "groq":
        raw = await _call_groq(user_msg, settings)
    else:
        raw = await _call_claude(user_msg, settings)

    logger.info("[WorkflowService] Respuesta recibida (%d chars)", len(raw))

    try:
        return _parse_response(raw, request)
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("[WorkflowService] Error parseando respuesta: %s | raw=%.300s", e, raw)
        raise ValueError(f"El modelo no generó un JSON válido: {e}")


async def refine_workflow(request: WorkflowRefineRequest) -> WorkflowGenerateResponse:
    settings = get_settings()
    actividades_resumen = "\n".join(
        f"- {a.nombre} (rol:{a.rol}, depto:{a.departamento}, campos:{len(a.campos)})"
        for a in request.actividades
    )
    user_msg = (
        f"Tenés este workflow existente que necesita ajustes.\n\n"
        f"Nombre: {request.politicaNombre}\n"
        f"Actividades actuales:\n{actividades_resumen}\n\n"
        f"BPMN actual (primeros 500 chars):\n{request.bpmnXml[:500]}...\n\n"
        f"Instrucción de refinamiento: {request.instruccion}\n\n"
        f"Devolvé el workflow COMPLETO actualizado con el mismo formato JSON."
    )

    proveedor = (request.proveedor or "claude").lower()
    logger.info("[WorkflowService] Refinando con proveedor=%s instruccion=%.100s", proveedor, request.instruccion)

    raw = await _call_groq(user_msg, settings) if proveedor == "groq" else await _call_claude(user_msg, settings)
    logger.info("[WorkflowService] Refinamiento recibido (%d chars)", len(raw))

    fake_req = WorkflowGenerateRequest(prompt=request.instruccion, politicaNombre=request.politicaNombre)
    try:
        return _parse_response(raw, fake_req)
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("[WorkflowService] Error parseando refinamiento: %s | raw=%.300s", e, raw)
        raise ValueError(f"El modelo no generó un JSON válido: {e}")
