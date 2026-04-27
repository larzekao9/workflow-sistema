#!/usr/bin/env python3
"""
seed_reclamo.py — TelecomBolivia · Reclamo de Facturación
Política compleja: ExclusiveGateway (decisión por monto) + ParallelGateway (auditoría + revisión financiera).

Flujo real del motor (siempre toma primer outgoing de cada gateway):
  Cliente   → Datos del Reclamo
  [GW excl] → script auto "Clasificación" → Análisis de Factura (Call Center)
  [GW para] → Auditoría Técnica (Auditoría)
  [GW join] → Revisión Financiera (Call Center)
              Resolución Supervisor (Gerencia)
  [End]

Visualmente en bpmn-js:
  ● ExclusiveGateway "¿Monto alto?" con dos ramas (≤ Bs 500 y > Bs 500)
  ● ParallelGateway split → Auditoría Técnica ║ Revisión Financiera (visual fork)
  ● ParallelGateway join → convergencia hacia Resolución

Compatible con seed_telecom.py: no toca la política de Instalación de Internet.
"""
import sys
import requests

BASE = "http://localhost:8080"

# ── Helpers ───────────────────────────────────────────────────────────────────

def login(email, pwd):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
    if r.status_code != 200:
        print(f"  ERROR login {email}: {r.status_code} {r.text[:200]}")
        sys.exit(1)
    return r.json()["token"]

def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def find(lst, field, val):
    if isinstance(lst, dict):
        lst = lst.get("content", [])
    return next((x for x in lst if x.get(field) == val), None)

def post(url, payload, token, label=""):
    r = requests.post(url, json=payload, headers=h(token))
    if r.status_code not in (200, 201):
        print(f"  ERROR {label}: {r.status_code} {r.text[:200]}")
        return None
    print(f"  + {label}")
    return r.json()

def put(url, payload, token, label=""):
    r = requests.put(url, json=payload, headers=h(token))
    if r.status_code not in (200, 201):
        print(f"  ERROR {label}: {r.status_code} {r.text[:200]}")
        return None
    if label:
        print(f"  ~ {label}")
    return r.json()

def patch(url, payload, token, label=""):
    r = requests.patch(url, json=payload, headers=h(token))
    if r.status_code not in (200, 201):
        print(f"  ERROR {label}: {r.status_code} {r.text[:200]}")
        return None
    if label:
        print(f"  ~ {label}")
    return r.json()

# ── BPMN ─────────────────────────────────────────────────────────────────────
#
# Pool horizontal con 4 swimlanes:
#   Cliente | Call Center | Auditoría | Gerencia
#
# Nodos:
#   start → t1 (Datos del Reclamo, Cliente)
#         → gw1 (ExclusiveGateway "¿Monto alto?")
#             ─ f2a (primer outgoing = motor sigue este) → script1 (Clasificación auto)
#             ─ f2b (segundo outgoing = visual: "Monto alto") → t2 directo
#         → t2 (Análisis de Factura, Call Center)
#         → gw2 (ParallelGateway split "División paralela")
#             ─ f5a (primer outgoing = motor sigue este) → t3 (Auditoría Técnica)
#             ─ f5b (segundo outgoing = visual parallel) → t4 (Revisión Financiera)
#         → gw3 (ParallelGateway join "Convergencia") ← primer outgoing lleva a t4
#         → t4 (Revisión Financiera, Call Center)
#         → t5 (Resolución Supervisor, Gerencia)
#         → end
#
# El motor (BpmnMotorService) atraviesa script1/gw* automáticamente.
# Los flujos f2b y f5b son exclusivamente visuales (bpmn-js los muestra como ramas).
#
# Coordenadas (pool x=100 y=60 w=1900 h=600):
#   Lane Cliente:    y=60,  h=150, cy=135
#   Lane CallCenter: y=210, h=150, cy=285
#   Lane Auditoría:  y=360, h=150, cy=435
#   Lane Gerencia:   y=510, h=150, cy=585

BPMN = '''<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             targetNamespace="http://workflow.com/bpmn">

  <collaboration id="collab_reclamo">
    <participant id="pool_reclamo" name="Reclamo de Facturación" processRef="proc_reclamo"/>
  </collaboration>

  <process id="proc_reclamo" name="Reclamo de Facturación" isExecutable="true">
    <laneSet id="ls_reclamo">
      <lane id="lane_cliente" name="Cliente">
        <flowNodeRef>start</flowNodeRef>
        <flowNodeRef>t1</flowNodeRef>
        <flowNodeRef>gw1</flowNodeRef>
        <flowNodeRef>script1</flowNodeRef>
      </lane>
      <lane id="lane_cc" name="Call Center">
        <flowNodeRef>t2</flowNodeRef>
        <flowNodeRef>gw2</flowNodeRef>
        <flowNodeRef>t4</flowNodeRef>
      </lane>
      <lane id="lane_auditoria" name="Auditoría">
        <flowNodeRef>t3</flowNodeRef>
        <flowNodeRef>gw3</flowNodeRef>
      </lane>
      <lane id="lane_gerencia" name="Gerencia">
        <flowNodeRef>t5</flowNodeRef>
        <flowNodeRef>end</flowNodeRef>
      </lane>
    </laneSet>

    <!-- ── Inicio ─────────────────────────────────────────── -->
    <startEvent id="start" name="Inicio"/>
    <sequenceFlow id="f0" sourceRef="start" targetRef="t1"/>

    <!-- ── t1: Cliente completa datos del reclamo ─────────── -->
    <userTask id="t1" name="Datos del Reclamo" camunda:candidateGroups="CLIENTE">
      <documentation>AREA:Cliente</documentation>
    </userTask>
    <sequenceFlow id="f1" sourceRef="t1" targetRef="gw1"/>

    <!-- ── gw1: ExclusiveGateway — ¿Monto alto? ──────────── -->
    <!--   Motor: toma f2a (primer outgoing) → script1 → t2   -->
    <!--   Visual: f2b muestra ruta alternativa "Monto alto"  -->
    <exclusiveGateway id="gw1" name="¿Monto alto?" default="f2a"/>

    <!-- f2a: primera salida — reclamo estándar (≤ Bs 500) -->
    <sequenceFlow id="f2a" sourceRef="gw1" targetRef="script1" name="Estándar (≤ Bs 500)"/>

    <!-- f2b: segunda salida — monto alto (> Bs 500), va directo a t2 -->
    <sequenceFlow id="f2b" sourceRef="gw1" targetRef="t2" name="Monto alto (> Bs 500)">
      <conditionExpression>monto &gt; 500</conditionExpression>
    </sequenceFlow>

    <!-- ── script1: Clasificación automática (auto-traversed) ── -->
    <scriptTask id="script1" name="Clasificación Automática">
      <script>// Clasifica y registra el tipo de reclamo automáticamente</script>
    </scriptTask>
    <sequenceFlow id="f3" sourceRef="script1" targetRef="t2"/>

    <!-- ── t2: Call Center analiza la factura ─────────────── -->
    <userTask id="t2" name="Análisis de Factura" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Call Center</documentation>
    </userTask>
    <sequenceFlow id="f4" sourceRef="t2" targetRef="gw2"/>

    <!-- ── gw2: ParallelGateway split ────────────────────── -->
    <!--   Motor: toma f5a (primer outgoing) → t3 Auditoría  -->
    <!--   Visual: f5b muestra rama paralela → t4 Financiera  -->
    <parallelGateway id="gw2" name="División paralela"/>

    <!-- f5a: primera salida → Auditoría (motor sigue este) -->
    <sequenceFlow id="f5a" sourceRef="gw2" targetRef="t3"/>

    <!-- f5b: segunda salida → Revisión Financiera (visual parallel) -->
    <sequenceFlow id="f5b" sourceRef="gw2" targetRef="t4"/>

    <!-- ── t3: Auditoría revisa logs técnicos ─────────────── -->
    <userTask id="t3" name="Auditoría Técnica" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Auditoría</documentation>
    </userTask>
    <sequenceFlow id="f6" sourceRef="t3" targetRef="gw3"/>

    <!-- ── gw3: ParallelGateway join ─────────────────────── -->
    <!--   Motor: toma f7 (primer outgoing) → t4 Financiera  -->
    <parallelGateway id="gw3" name="Convergencia"/>
    <sequenceFlow id="f7" sourceRef="gw3" targetRef="t4"/>

    <!-- ── t4: Call Center determina crédito/devolución ───── -->
    <userTask id="t4" name="Revisión Financiera" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Call Center</documentation>
    </userTask>
    <sequenceFlow id="f8" sourceRef="t4" targetRef="t5"/>

    <!-- ── t5: Supervisor aprueba o rechaza resolución ─────── -->
    <userTask id="t5" name="Resolución Supervisor" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Gerencia</documentation>
    </userTask>
    <sequenceFlow id="f9" sourceRef="t5" targetRef="end"/>

    <endEvent id="end" name="Fin"/>
  </process>

  <!-- ══════════════════════════════════════════════════════════════
       DI — coordenadas para bpmn-js
       Pool x=100 y=60 w=1900 h=600
       Lane cy: Cliente=135, CallCenter=285, Auditoría=435, Gerencia=585
       ══════════════════════════════════════════════════════════════ -->
  <bpmndi:BPMNDiagram id="diagram_reclamo">
    <bpmndi:BPMNPlane id="plane_reclamo" bpmnElement="collab_reclamo">

      <!-- Pool -->
      <bpmndi:BPMNShape id="pool_reclamo_di" bpmnElement="pool_reclamo" isHorizontal="true">
        <dc:Bounds x="100" y="60" width="1900" height="600"/>
      </bpmndi:BPMNShape>

      <!-- Lanes -->
      <bpmndi:BPMNShape id="lane_cliente_di" bpmnElement="lane_cliente" isHorizontal="true">
        <dc:Bounds x="130" y="60" width="1870" height="150"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_cc_di" bpmnElement="lane_cc" isHorizontal="true">
        <dc:Bounds x="130" y="210" width="1870" height="150"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_auditoria_di" bpmnElement="lane_auditoria" isHorizontal="true">
        <dc:Bounds x="130" y="360" width="1870" height="150"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_gerencia_di" bpmnElement="lane_gerencia" isHorizontal="true">
        <dc:Bounds x="130" y="510" width="1870" height="150"/>
      </bpmndi:BPMNShape>

      <!-- start — Cliente cy=135 -->
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="200" y="117" width="36" height="36"/>
      </bpmndi:BPMNShape>

      <!-- t1 Datos del Reclamo — Cliente cy=135 -->
      <bpmndi:BPMNShape id="t1_di" bpmnElement="t1">
        <dc:Bounds x="290" y="95" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- gw1 ExclusiveGateway — Cliente cy=135 -->
      <bpmndi:BPMNShape id="gw1_di" bpmnElement="gw1" isMarkerVisible="true">
        <dc:Bounds x="470" y="110" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="80" width="90" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- script1 Clasificación Automática — Cliente cy=135 -->
      <bpmndi:BPMNShape id="script1_di" bpmnElement="script1">
        <dc:Bounds x="590" y="95" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- t2 Análisis de Factura — CallCenter cy=285 -->
      <bpmndi:BPMNShape id="t2_di" bpmnElement="t2">
        <dc:Bounds x="800" y="245" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- gw2 ParallelGateway split — CallCenter cy=285 -->
      <bpmndi:BPMNShape id="gw2_di" bpmnElement="gw2">
        <dc:Bounds x="990" y="260" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="960" y="318" width="110" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- t3 Auditoría Técnica — Auditoría cy=435 -->
      <bpmndi:BPMNShape id="t3_di" bpmnElement="t3">
        <dc:Bounds x="1080" y="395" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- gw3 ParallelGateway join — Auditoría cy=435 -->
      <bpmndi:BPMNShape id="gw3_di" bpmnElement="gw3">
        <dc:Bounds x="1270" y="410" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1245" y="468" width="100" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- t4 Revisión Financiera — CallCenter cy=285 -->
      <bpmndi:BPMNShape id="t4_di" bpmnElement="t4">
        <dc:Bounds x="1380" y="245" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- t5 Resolución Supervisor — Gerencia cy=585 -->
      <bpmndi:BPMNShape id="t5_di" bpmnElement="t5">
        <dc:Bounds x="1560" y="545" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- end — Gerencia cy=585 -->
      <bpmndi:BPMNShape id="end_di" bpmnElement="end">
        <dc:Bounds x="1740" y="567" width="36" height="36"/>
      </bpmndi:BPMNShape>

      <!-- ── Edges ─────────────────────────────────────────────── -->

      <!-- f0: start → t1 (horizontal en Cliente) -->
      <bpmndi:BPMNEdge id="f0_di" bpmnElement="f0">
        <di:waypoint x="236" y="135"/>
        <di:waypoint x="290" y="135"/>
      </bpmndi:BPMNEdge>

      <!-- f1: t1 → gw1 -->
      <bpmndi:BPMNEdge id="f1_di" bpmnElement="f1">
        <di:waypoint x="410" y="135"/>
        <di:waypoint x="470" y="135"/>
      </bpmndi:BPMNEdge>

      <!-- f2a: gw1 → script1 (primer outgoing: Estándar) -->
      <bpmndi:BPMNEdge id="f2a_di" bpmnElement="f2a">
        <di:waypoint x="520" y="135"/>
        <di:waypoint x="590" y="135"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="521" y="108" width="78" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>

      <!-- f2b: gw1 → t2 (segundo outgoing visual: Monto alto) -->
      <bpmndi:BPMNEdge id="f2b_di" bpmnElement="f2b">
        <di:waypoint x="495" y="160"/>
        <di:waypoint x="495" y="210"/>
        <di:waypoint x="860" y="210"/>
        <di:waypoint x="860" y="245"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="585" y="186" width="120" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>

      <!-- f3: script1 → t2 (baja de Cliente a CallCenter) -->
      <bpmndi:BPMNEdge id="f3_di" bpmnElement="f3">
        <di:waypoint x="710" y="135"/>
        <di:waypoint x="755" y="135"/>
        <di:waypoint x="755" y="285"/>
        <di:waypoint x="800" y="285"/>
      </bpmndi:BPMNEdge>

      <!-- f4: t2 → gw2 (horizontal en CallCenter) -->
      <bpmndi:BPMNEdge id="f4_di" bpmnElement="f4">
        <di:waypoint x="920" y="285"/>
        <di:waypoint x="990" y="285"/>
      </bpmndi:BPMNEdge>

      <!-- f5a: gw2 → t3 (baja a Auditoría, primer outgoing) -->
      <bpmndi:BPMNEdge id="f5a_di" bpmnElement="f5a">
        <di:waypoint x="1015" y="310"/>
        <di:waypoint x="1015" y="435"/>
        <di:waypoint x="1080" y="435"/>
      </bpmndi:BPMNEdge>

      <!-- f5b: gw2 → t4 (horizontal en CallCenter, visual parallel) -->
      <bpmndi:BPMNEdge id="f5b_di" bpmnElement="f5b">
        <di:waypoint x="1040" y="285"/>
        <di:waypoint x="1380" y="285"/>
      </bpmndi:BPMNEdge>

      <!-- f6: t3 → gw3 (horizontal en Auditoría) -->
      <bpmndi:BPMNEdge id="f6_di" bpmnElement="f6">
        <di:waypoint x="1200" y="435"/>
        <di:waypoint x="1270" y="435"/>
      </bpmndi:BPMNEdge>

      <!-- f7: gw3 → t4 (sube de Auditoría a CallCenter) -->
      <bpmndi:BPMNEdge id="f7_di" bpmnElement="f7">
        <di:waypoint x="1295" y="410"/>
        <di:waypoint x="1295" y="285"/>
        <di:waypoint x="1380" y="285"/>
      </bpmndi:BPMNEdge>

      <!-- f8: t4 → t5 (baja de CallCenter a Gerencia) -->
      <bpmndi:BPMNEdge id="f8_di" bpmnElement="f8">
        <di:waypoint x="1500" y="285"/>
        <di:waypoint x="1620" y="285"/>
        <di:waypoint x="1620" y="545"/>
      </bpmndi:BPMNEdge>

      <!-- f9: t5 → end (horizontal en Gerencia) -->
      <bpmndi:BPMNEdge id="f9_di" bpmnElement="f9">
        <di:waypoint x="1680" y="585"/>
        <di:waypoint x="1740" y="585"/>
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>'''

# ── Formularios por actividad ─────────────────────────────────────────────────
# Tipos: TEXT, NUMBER, DATE, FILE, SELECT, TEXTAREA, BOOLEAN

CAMPOS = {
    "Datos del Reclamo": [
        {"nombre": "nro_factura",      "label": "Número de factura",         "tipo": "TEXT",     "required": True},
        {"nombre": "periodo_factura",   "label": "Período facturado",         "tipo": "TEXT",     "required": True,
         "opciones": []},
        {"nombre": "monto_reclamado",   "label": "Monto reclamado (Bs)",      "tipo": "NUMBER",   "required": True},
        {"nombre": "tipo_reclamo",      "label": "Tipo de reclamo",           "tipo": "SELECT",   "required": True,
         "opciones": ["Cobro incorrecto", "Servicio no prestado", "Cargo duplicado", "Error de medición", "Otro"]},
        {"nombre": "descripcion",       "label": "Descripción del problema",  "tipo": "TEXTAREA", "required": True},
        {"nombre": "evidencia",         "label": "Evidencia (foto/documento)","tipo": "FILE",     "required": False},
    ],
    "Análisis de Factura": [
        {"nombre": "factura_valida",    "label": "¿Factura válida en sistema?","tipo": "BOOLEAN",  "required": True},
        {"nombre": "monto_sistema",     "label": "Monto registrado en sistema (Bs)","tipo": "NUMBER","required": True},
        {"nombre": "diferencia",        "label": "Diferencia detectada (Bs)", "tipo": "NUMBER",   "required": False},
        {"nombre": "causa_probable",    "label": "Causa probable",            "tipo": "SELECT",   "required": True,
         "opciones": ["Error de facturación", "Cargo por mora", "Servicio adicional no solicitado", "Sin causa aparente"]},
        {"nombre": "notas_analisis",    "label": "Notas del análisis",        "tipo": "TEXTAREA", "required": False},
    ],
    "Auditoría Técnica": [
        {"nombre": "logs_revisados",    "label": "¿Logs técnicos revisados?", "tipo": "BOOLEAN",  "required": True},
        {"nombre": "anomalias",         "label": "¿Se detectaron anomalías?", "tipo": "BOOLEAN",  "required": True},
        {"nombre": "periodo_afectado",  "label": "Período con anomalía",      "tipo": "TEXT",     "required": False},
        {"nombre": "tipo_anomalia",     "label": "Tipo de anomalía",          "tipo": "SELECT",   "required": False,
         "opciones": ["Consumo irregular", "Interrupción de servicio", "Doble registro", "Sin anomalía"]},
        {"nombre": "informe_tecnico",   "label": "Informe técnico detallado", "tipo": "TEXTAREA", "required": True},
        {"nombre": "evidencia_tecnica", "label": "Captura de logs",           "tipo": "FILE",     "required": False},
    ],
    "Revisión Financiera": [
        {"nombre": "credito_a_aplicar", "label": "Monto a devolver/acreditar (Bs)","tipo": "NUMBER","required": True},
        {"nombre": "tipo_devolucion",   "label": "Forma de devolución",       "tipo": "SELECT",   "required": True,
         "opciones": ["Nota de crédito en próxima factura", "Descuento inmediato", "Reembolso bancario"]},
        {"nombre": "cuenta_bancaria",   "label": "Cuenta bancaria (si aplica)","tipo": "TEXT",    "required": False},
        {"nombre": "observaciones_fin", "label": "Observaciones financieras", "tipo": "TEXTAREA", "required": False},
    ],
    "Resolución Supervisor": [
        {"nombre": "decision",          "label": "Decisión final",            "tipo": "SELECT",   "required": True,
         "opciones": ["APROBAR reclamo — proceder con devolución", "RECHAZAR reclamo — sin mérito", "MEDIACIÓN — contactar al cliente"]},
        {"nombre": "monto_aprobado",    "label": "Monto final aprobado (Bs)", "tipo": "NUMBER",   "required": False},
        {"nombre": "justificacion",     "label": "Justificación de la resolución","tipo": "TEXTAREA","required": True},
        {"nombre": "fecha_resolucion",  "label": "Fecha de resolución",       "tipo": "DATE",     "required": True},
    ],
}

TAREAS = [
    # (nombre_bpmn,          departamento,    acciones_permitidas)
    ("Datos del Reclamo",     None,            ["APROBAR"]),
    ("Análisis de Factura",   "Call Center",   ["APROBAR", "RECHAZAR", "DEVOLVER", "OBSERVAR"]),
    ("Auditoría Técnica",     "Auditoría",     ["APROBAR", "RECHAZAR", "DEVOLVER"]),
    ("Revisión Financiera",   "Call Center",   ["APROBAR", "RECHAZAR", "DEVOLVER"]),
    ("Resolución Supervisor", "Gerencia",      ["APROBAR", "RECHAZAR"]),
]

POL_NOMBRE = "Reclamo de Facturación"

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Seed TelecomBolivia — Reclamo de Facturación ===\n")

    sa_token  = login("superadmin@workflow.com", "Super2024!")
    adm_token = login("admin@workflow.com",      "Admin2024!")
    print("[auth] OK")

    # ── Empresa ───────────────────────────────────────────────────────────────
    empresas = requests.get(f"{BASE}/empresas", headers=h(sa_token)).json()
    empresa  = find(empresas, "nombre", "TelecomBolivia")
    if not empresa:
        empresa = post(f"{BASE}/empresas",
            {"nombre": "TelecomBolivia", "razonSocial": "TelecomBolivia S.A.",
             "ciudad": "La Paz", "pais": "Bolivia", "activa": True},
            sa_token, "empresa TelecomBolivia")
    else:
        print("  ✓ empresa TelecomBolivia")
    empresa_id = empresa["id"]

    if not empresa.get("adminPrincipalId"):
        users_all = requests.get(f"{BASE}/users", headers=h(sa_token)).json()
        admin_u   = find(users_all, "email", "admin@workflow.com")
        if admin_u:
            requests.post(f"{BASE}/empresas/{empresa_id}/asignar-admin",
                          json={"adminId": admin_u["id"]}, headers=h(sa_token))
    adm_token = login("admin@workflow.com", "Admin2024!")

    # ── Roles ─────────────────────────────────────────────────────────────────
    roles       = requests.get(f"{BASE}/roles", headers=h(adm_token)).json()
    rol_func_id = find(roles, "nombre", "FUNCIONARIO")["id"]
    rol_cli_id  = find(roles, "nombre", "CLIENTE")["id"]

    # ── Departamentos ─────────────────────────────────────────────────────────
    print("[departamentos]")
    dept_map = {}
    depts = requests.get(f"{BASE}/departments", headers=h(adm_token)).json()

    for nombre in ["Call Center", "Auditoría", "Gerencia"]:
        d = find(depts, "nombre", nombre)
        if d:
            print(f"  ✓ {nombre}")
            dept_map[nombre] = d["id"]
        else:
            r = requests.post(f"{BASE}/departments",
                              json={"nombre": nombre, "descripcion": nombre},
                              headers=h(adm_token))
            if r.status_code in (200, 201):
                dept_map[nombre] = r.json()["id"]
                print(f"  + {nombre}")
            else:
                depts2 = requests.get(f"{BASE}/departments", headers=h(adm_token)).json()
                d2 = find(depts2, "nombre", nombre)
                if d2:
                    dept_map[nombre] = d2["id"]
                    print(f"  ✓ {nombre} (re-encontrado)")

    # ── Usuarios ──────────────────────────────────────────────────────────────
    print("[usuarios]")
    users = requests.get(f"{BASE}/users", headers=h(adm_token)).json()

    FUNCS = [
        ("carlos.cc@telecom.bo",       "Carlos Mendoza",   "Func2024!", "Call Center"),
        ("luis.auditoria@telecom.bo",   "Luis Mamani",      "Func2024!", "Auditoría"),
        ("sofia.supervisora@telecom.bo","Sofía Ríos",       "Func2024!", "Gerencia"),
    ]
    CLIS = [
        ("cliente1@telecom.bo", "María López",  "Cliente2024!"),
        ("cliente2@telecom.bo", "Juan Flores",  "Cliente2024!"),
    ]

    func_tokens = {}
    for email, nombre, pwd, dept in FUNCS:
        u = find(users, "email", email)
        if not u:
            u = post(f"{BASE}/users",
                {"email": email, "username": email.split("@")[0],
                 "nombreCompleto": nombre, "password": pwd,
                 "rolId": rol_func_id, "departmentId": dept_map.get(dept)},
                adm_token, email)
        else:
            if dept_map.get(dept) and u.get("departmentId") != dept_map.get(dept):
                requests.put(f"{BASE}/users/{u['id']}",
                    json={"departmentId": dept_map.get(dept)}, headers=h(adm_token))
            print(f"  ✓ {email}")
        if u:
            try:
                func_tokens[dept] = login(email, pwd)
            except Exception:
                pass

    cli_tokens = []
    for email, nombre, pwd in CLIS:
        u = find(users, "email", email)
        if not u:
            post(f"{BASE}/users",
                {"email": email, "username": email.split("@")[0],
                 "nombreCompleto": nombre, "password": pwd, "rolId": rol_cli_id},
                adm_token, email)
        else:
            print(f"  ✓ {email}")
        try:
            cli_tokens.append(login(email, pwd))
        except Exception:
            cli_tokens.append(None)

    # ── Limpiar solo la política Reclamo de Facturación ───────────────────────
    print("[limpieza — solo política Reclamo]")
    policies = requests.get(f"{BASE}/policies", headers=h(adm_token)).json()
    plist    = policies.get("content", policies) if isinstance(policies, dict) else policies
    for p in plist:
        if p.get("nombre") == POL_NOMBRE:
            pid_old = p["id"]
            acts_r  = requests.get(f"{BASE}/activities/by-policy/{pid_old}", headers=h(adm_token))
            if acts_r.status_code == 200:
                for a in acts_r.json():
                    requests.delete(f"{BASE}/activities/{a['id']}", headers=h(adm_token))
            r = requests.delete(f"{BASE}/policies/{pid_old}", headers=h(adm_token))
            print(f"  - política anterior '{POL_NOMBRE}' → {r.status_code}")

    # ── Crear política ────────────────────────────────────────────────────────
    print("[política]")
    pol = post(f"{BASE}/policies",
               {"nombre": POL_NOMBRE,
                "descripcion": "Proceso de reclamo de facturación con gateway de decisión y revisión paralela"},
               adm_token, POL_NOMBRE)
    if not pol:
        sys.exit(1)
    pid = pol["id"]

    put(f"{BASE}/policies/{pid}/bpmn", {"bpmnXml": BPMN}, adm_token, "bpmn subido")

    # ── Actividades ───────────────────────────────────────────────────────────
    print("[actividades]")
    act_map = {}

    act = post(f"{BASE}/activities",
               {"politicaId": pid, "nombre": "Inicio", "tipo": "INICIO"},
               adm_token, "act:Inicio")
    act_map["Inicio"] = act

    for tarea, dept_nombre, acciones in TAREAS:
        dept_id = dept_map.get(dept_nombre) if dept_nombre else None
        rol_id  = rol_func_id if dept_nombre else rol_cli_id

        body = {
            "politicaId":       pid,
            "nombre":           tarea,
            "tipo":             "TAREA",
            "responsableRolId": rol_id,
        }
        if dept_id:
            body["departmentId"] = dept_id

        act = post(f"{BASE}/activities", body, adm_token, f"act:{tarea}")
        act_map[tarea] = act
        if not act:
            continue

        props = {
            "accionesPermitidas": acciones,
            "slaHoras":           24,
            "campos":             CAMPOS.get(tarea, []),
        }
        if dept_id:
            props["area"] = dept_id

        patch(f"{BASE}/activities/{act['id']}/propiedades", props, adm_token, f"props:{tarea}")

    act = post(f"{BASE}/activities",
               {"politicaId": pid, "nombre": "Fin", "tipo": "FIN"},
               adm_token, "act:Fin")
    act_map["Fin"] = act

    # ── Transiciones en cadena ────────────────────────────────────────────────
    print("[transiciones]")
    seq = ["Inicio"] + [t for t, _, _ in TAREAS] + ["Fin"]
    for i in range(len(seq) - 1):
        src = act_map.get(seq[i])
        dst = act_map.get(seq[i + 1])
        if src and dst:
            put(f"{BASE}/activities/{src['id']}",
                {"nombre": src.get("nombre"), "tipo": src.get("tipo"),
                 "transiciones": [{"actividadDestinoId": dst["id"],
                                   "condicion": "DEFAULT", "etiqueta": ""}]},
                adm_token, f"{seq[i]} → {seq[i+1]}")

    # ── Publicar ──────────────────────────────────────────────────────────────
    r = requests.post(f"{BASE}/policies/{pid}/publish", headers=h(adm_token))
    if r.status_code in (200, 201):
        print("  publicada OK")
    else:
        print(f"  ERROR publicar: {r.status_code} {r.text[:120]}")

    # ── Trámites demo ─────────────────────────────────────────────────────────
    print("[trámites demo]")
    cli_t = cli_tokens[0] if cli_tokens else None
    cc_t  = func_tokens.get("Call Center")
    aud_t = func_tokens.get("Auditoría")
    ger_t = func_tokens.get("Gerencia")

    def avanzar(tid, accion, obs, token, datos=None):
        body = {"accion": accion, "observaciones": obs}
        if datos:
            body["datos"] = datos
        return requests.post(f"{BASE}/tramites/{tid}/avanzar",
                             json=body, headers=h(token))

    def tomar(tid, token):
        requests.post(f"{BASE}/tramites/{tid}/tomar", headers=h(token))

    # Trámite 1 — cliente envió reclamo, esperando Análisis de Factura (sin asignar)
    if cli_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 1 (→ Análisis pendiente)")
        if t:
            avanzar(t["id"], "APROBAR", "Reclamo enviado", cli_t, {
                "nro_factura":    "TBC-2026-03-00142",
                "periodo_factura":"Marzo 2026",
                "monto_reclamado": 320,
                "tipo_reclamo":   "Cobro incorrecto",
                "descripcion":    "Me cobraron Bs 320 extra sin justificación en la factura de marzo.",
            })

    # Trámite 2 — en Análisis de Factura (tomado por Call Center)
    if cli_t and cc_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 2 (→ Análisis tomado)")
        if t:
            tid = t["id"]
            avanzar(tid, "APROBAR", "Reclamo enviado", cli_t, {
                "nro_factura":     "TBC-2026-03-00089",
                "periodo_factura": "Marzo 2026",
                "monto_reclamado": 750,
                "tipo_reclamo":    "Cargo duplicado",
                "descripcion":     "Se me cobró dos veces el mismo servicio. Monto total duplicado Bs 750.",
            })
            tomar(tid, cc_t)

    # Trámite 3 — avanzó hasta Auditoría Técnica
    if cli_t and cc_t and aud_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 3 (→ Auditoría Técnica)")
        if t:
            tid = t["id"]
            avanzar(tid, "APROBAR", "Reclamo enviado", cli_t, {
                "nro_factura":     "TBC-2026-02-00231",
                "periodo_factura": "Febrero 2026",
                "monto_reclamado": 580,
                "tipo_reclamo":    "Servicio no prestado",
                "descripcion":     "Corte de servicio por 12 días pero me cobraron el mes completo.",
            })
            tomar(tid, cc_t)
            avanzar(tid, "APROBAR", "Diferencia de Bs 580 confirmada en sistema", cc_t, {
                "factura_valida":  True,
                "monto_sistema":   1150,
                "diferencia":      580,
                "causa_probable":  "Servicio adicional no solicitado",
                "notas_analisis":  "Se detecta cobro por días sin servicio. Requiere revisión de logs.",
            })
            tomar(tid, aud_t)

    # Trámite 4 — RECHAZADO en Análisis de Factura
    if cli_t and cc_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 4 (RECHAZADO)")
        if t:
            tid = t["id"]
            avanzar(tid, "APROBAR", "Reclamo enviado", cli_t, {
                "nro_factura":     "TBC-2026-01-00044",
                "periodo_factura": "Enero 2026",
                "monto_reclamado": 90,
                "tipo_reclamo":    "Otro",
                "descripcion":     "Creo que me cobraron de más pero no tengo la factura.",
            })
            tomar(tid, cc_t)
            avanzar(tid, "RECHAZAR", "Factura corresponde al servicio contratado. Sin diferencia.", cc_t, {
                "factura_valida":  True,
                "monto_sistema":   90,
                "diferencia":      0,
                "causa_probable":  "Sin causa aparente",
                "notas_analisis":  "El monto cobrado es correcto según el plan Premium del cliente.",
            })

    print(f"""
=== Seed completado ===
  URL:       http://localhost:4200
  Admin:     admin@workflow.com / Admin2024!
  Funcs:     carlos.cc@telecom.bo         / Func2024!  → Call Center
             luis.auditoria@telecom.bo    / Func2024!  → Auditoría
             sofia.supervisora@telecom.bo / Func2024!  → Gerencia
  Clientes:  cliente1@telecom.bo / Cliente2024!
             cliente2@telecom.bo / Cliente2024!

  Política:  {POL_NOMBRE} (ACTIVA)
  Flujo BPMN:
    Datos del Reclamo (Cliente)
    → [ExclusiveGateway: ¿Monto alto?]
      ─ ≤ Bs 500: Clasificación automática (script) → Análisis de Factura
      ─ > Bs 500: ruta directa visual            → Análisis de Factura
    → [ParallelGateway split]
      ╠══ Auditoría Técnica (Auditoría) ← motor sigue este
      ╚══ Revisión Financiera (visual)
    → [ParallelGateway join]
    → Revisión Financiera (Call Center)
    → Resolución Supervisor (Gerencia)

  Trámites demo:
    1 — En espera de Análisis de Factura (sin asignar, monto Bs 320)
    2 — En Análisis de Factura — tomado por Carlos CC (monto Bs 750)
    3 — En Auditoría Técnica — tomado por Luis Auditoría (monto Bs 580)
    4 — RECHAZADO en Análisis de Factura
""")


if __name__ == "__main__":
    main()
