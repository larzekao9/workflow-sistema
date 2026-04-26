#!/usr/bin/env python3
"""
seed_telecom.py — TelecomBolivia · Instalación de Internet
Limpia TODO y recrea desde cero. Idempotente.

Flujo:
  Cliente  → [Datos del Solicitante]
  Soporte  → [Verificación Técnica]
  Técnico  → [Visita Técnico]
  CC       → [Aprobación Final]
"""
import sys
import requests

BASE = "http://localhost:8080"

# ── Helpers ───────────────────────────────────────────────────────────────────

def login(email, pwd):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
    if r.status_code != 200:
        print(f"  ERROR login {email}: {r.status_code} {r.text}")
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
# Swimlanes: Cliente | Call Center | Soporte Técnico | Técnico Campo
#
# t1 (Datos del Solicitante): lane Cliente, sin dept → motor asigna al cliente
# t2 (Verificación Técnica):  lane Soporte Técnico
# t3 (Visita Técnico):        lane Técnico Campo
# t4 (Aprobación Final):      lane Call Center
#
# documentation AREA:xxx → BpmnMotorService.extractAreaFromTask (etapaActual.area)
# camunda:candidateGroups  → BpmnMotorService.extractRolFromTask (etapaActual.responsableRolNombre)

BPMN = '''<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
             targetNamespace="http://workflow.com/bpmn">

  <collaboration id="collab1">
    <participant id="pool1" name="Instalación de Internet" processRef="proc_instalacion"/>
  </collaboration>

  <process id="proc_instalacion" name="Instalación de Internet" isExecutable="true">
    <laneSet id="ls1">
      <lane id="lane_cliente" name="Cliente">
        <flowNodeRef>start</flowNodeRef>
        <flowNodeRef>t1</flowNodeRef>
      </lane>
      <lane id="lane_cc" name="Call Center">
        <flowNodeRef>t4</flowNodeRef>
        <flowNodeRef>end</flowNodeRef>
      </lane>
      <lane id="lane_soporte" name="Soporte Técnico">
        <flowNodeRef>t2</flowNodeRef>
      </lane>
      <lane id="lane_tecnico" name="Técnico Campo">
        <flowNodeRef>t3</flowNodeRef>
      </lane>
    </laneSet>

    <startEvent id="start" name="Inicio"/>
    <sequenceFlow id="f0" sourceRef="start" targetRef="t1"/>

    <userTask id="t1" name="Datos del Solicitante" camunda:candidateGroups="CLIENTE">
      <documentation>AREA:Cliente</documentation>
    </userTask>
    <sequenceFlow id="f1" sourceRef="t1" targetRef="t2"/>

    <userTask id="t2" name="Verificación Técnica" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Soporte Técnico</documentation>
    </userTask>
    <sequenceFlow id="f2" sourceRef="t2" targetRef="t3"/>

    <userTask id="t3" name="Visita Técnico" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Técnico Campo</documentation>
    </userTask>
    <sequenceFlow id="f3" sourceRef="t3" targetRef="t4"/>

    <userTask id="t4" name="Aprobación Final" camunda:candidateGroups="FUNCIONARIO">
      <documentation>AREA:Call Center</documentation>
    </userTask>
    <sequenceFlow id="f4" sourceRef="t4" targetRef="end"/>

    <endEvent id="end" name="Fin"/>
  </process>

  <bpmndi:BPMNDiagram id="diagram">
    <bpmndi:BPMNPlane id="plane" bpmnElement="collab1">

      <!-- Pool principal -->
      <bpmndi:BPMNShape id="pool1_di" bpmnElement="pool1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="1020" height="480"/>
      </bpmndi:BPMNShape>

      <!-- Lanes horizontales -->
      <bpmndi:BPMNShape id="lane_cliente_di" bpmnElement="lane_cliente" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="990" height="120"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_cc_di" bpmnElement="lane_cc" isHorizontal="true">
        <dc:Bounds x="150" y="180" width="990" height="120"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_soporte_di" bpmnElement="lane_soporte" isHorizontal="true">
        <dc:Bounds x="150" y="300" width="990" height="120"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="lane_tecnico_di" bpmnElement="lane_tecnico" isHorizontal="true">
        <dc:Bounds x="150" y="420" width="990" height="120"/>
      </bpmndi:BPMNShape>

      <!-- start — lane Cliente, centro y=120 -->
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="222" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>

      <!-- t1 Datos del Solicitante — lane Cliente, centro y=120 -->
      <bpmndi:BPMNShape id="t1_di" bpmnElement="t1">
        <dc:Bounds x="330" y="80" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- t2 Verificación Técnica — lane Soporte Técnico, centro y=360 -->
      <bpmndi:BPMNShape id="t2_di" bpmnElement="t2">
        <dc:Bounds x="520" y="320" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- t3 Visita Técnico — lane Técnico Campo, centro y=480 -->
      <bpmndi:BPMNShape id="t3_di" bpmnElement="t3">
        <dc:Bounds x="700" y="440" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- t4 Aprobación Final — lane Call Center, centro y=240 -->
      <bpmndi:BPMNShape id="t4_di" bpmnElement="t4">
        <dc:Bounds x="880" y="200" width="120" height="80"/>
      </bpmndi:BPMNShape>

      <!-- end — lane Call Center -->
      <bpmndi:BPMNShape id="end_di" bpmnElement="end">
        <dc:Bounds x="1062" y="222" width="36" height="36"/>
      </bpmndi:BPMNShape>

      <!-- start → t1 (horizontal en lane Cliente) -->
      <bpmndi:BPMNEdge id="f0_di" bpmnElement="f0">
        <di:waypoint x="258" y="120"/>
        <di:waypoint x="330" y="120"/>
      </bpmndi:BPMNEdge>

      <!-- t1 → t2 (baja de Cliente a Soporte) -->
      <bpmndi:BPMNEdge id="f1_di" bpmnElement="f1">
        <di:waypoint x="450" y="120"/>
        <di:waypoint x="485" y="120"/>
        <di:waypoint x="485" y="360"/>
        <di:waypoint x="520" y="360"/>
      </bpmndi:BPMNEdge>

      <!-- t2 → t3 (baja de Soporte a Técnico) -->
      <bpmndi:BPMNEdge id="f2_di" bpmnElement="f2">
        <di:waypoint x="640" y="360"/>
        <di:waypoint x="670" y="360"/>
        <di:waypoint x="670" y="480"/>
        <di:waypoint x="700" y="480"/>
      </bpmndi:BPMNEdge>

      <!-- t3 → t4 (sube de Técnico a Call Center) -->
      <bpmndi:BPMNEdge id="f3_di" bpmnElement="f3">
        <di:waypoint x="820" y="480"/>
        <di:waypoint x="850" y="480"/>
        <di:waypoint x="850" y="240"/>
        <di:waypoint x="880" y="240"/>
      </bpmndi:BPMNEdge>

      <!-- t4 → end -->
      <bpmndi:BPMNEdge id="f4_di" bpmnElement="f4">
        <di:waypoint x="1000" y="240"/>
        <di:waypoint x="1062" y="240"/>
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>'''

# ── Campos embebidos por actividad ────────────────────────────────────────────
# Tipos soportados: TEXT, NUMBER, DATE, FILE, SELECT, TEXTAREA, BOOLEAN
# El motor lee estos campos vía actividadRepository.findByPoliticaIdAndNombre

CAMPOS = {
    "Datos del Solicitante": [
        {"nombre": "nombre_completo", "label": "Nombre completo",          "tipo": "TEXT",     "required": True},
        {"nombre": "carnet",          "label": "Carnet de identidad",      "tipo": "TEXT",     "required": True},
        {"nombre": "telefono",        "label": "Teléfono de contacto",     "tipo": "TEXT",     "required": True},
        {"nombre": "email_cliente",   "label": "Email del cliente",        "tipo": "TEXT",     "required": False},
        {"nombre": "direccion",       "label": "Dirección de instalación", "tipo": "TEXTAREA", "required": True},
        {"nombre": "tipo_plan",       "label": "Plan solicitado",          "tipo": "SELECT",   "required": True,
         "opciones": ["Básico 10Mbps", "Estándar 50Mbps", "Premium 100Mbps"]},
        {"nombre": "observaciones",   "label": "Observaciones adicionales","tipo": "TEXTAREA", "required": False},
    ],
    "Verificación Técnica": [
        {"nombre": "factibilidad",   "label": "¿Existe factibilidad?",     "tipo": "BOOLEAN",  "required": True},
        {"nombre": "distancia_nodo", "label": "Distancia al nodo (m)",     "tipo": "NUMBER",   "required": False},
        {"nombre": "fecha_visita",   "label": "Fecha programada de visita","tipo": "DATE",     "required": True},
        {"nombre": "observaciones",  "label": "Observaciones técnicas",    "tipo": "TEXTAREA", "required": False},
    ],
    "Visita Técnico": [
        {"nombre": "equipo_marca",    "label": "Marca del equipo instalado","tipo": "TEXT",    "required": True},
        {"nombre": "numero_serie",    "label": "Número de serie",           "tipo": "TEXT",    "required": True},
        {"nombre": "ip_asignada",     "label": "IP asignada al cliente",    "tipo": "TEXT",    "required": False},
        {"nombre": "foto_instalacion","label": "Foto de la instalación",    "tipo": "FILE",    "required": True},
        {"nombre": "firma_cliente",   "label": "Cliente conforme",          "tipo": "BOOLEAN", "required": True},
        {"nombre": "observaciones",   "label": "Notas de campo",            "tipo": "TEXTAREA","required": False},
    ],
    "Aprobación Final": [
        {"nombre": "numero_contrato", "label": "Número de contrato",       "tipo": "TEXT",     "required": True},
        {"nombre": "fecha_activacion","label": "Fecha de activación",      "tipo": "DATE",     "required": True},
        {"nombre": "observaciones",   "label": "Observaciones finales",    "tipo": "TEXTAREA", "required": False},
    ],
}

# (nombre_tarea, dept_nombre_o_None, acciones_permitidas)
# dept=None → asignarFuncionarioAutomatico asigna al cliente que inició el trámite
TAREAS = [
    ("Datos del Solicitante", None,             ["APROBAR"]),
    ("Verificación Técnica",  "Soporte Técnico", ["APROBAR", "RECHAZAR", "DEVOLVER", "OBSERVAR"]),
    ("Visita Técnico",        "Técnico Campo",   ["APROBAR", "RECHAZAR", "DEVOLVER", "OBSERVAR"]),
    ("Aprobación Final",      "Call Center",     ["APROBAR", "RECHAZAR", "DEVOLVER", "OBSERVAR"]),
]

POL_NOMBRE = "Instalación de Internet"

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Seed TelecomBolivia — Instalación de Internet ===\n")

    sa_token  = login("superadmin@workflow.com", "Super2024!")
    adm_token = login("admin@workflow.com",      "Admin2024!")
    print("[auth] OK")

    # ── Empresa ───────────────────────────────────────────────────────────────
    empresas  = requests.get(f"{BASE}/empresas", headers=h(sa_token)).json()
    empresa   = find(empresas, "nombre", "TelecomBolivia")
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
            print("  + admin asignado")
    adm_token = login("admin@workflow.com", "Admin2024!")

    # ── Roles ─────────────────────────────────────────────────────────────────
    roles       = requests.get(f"{BASE}/roles", headers=h(adm_token)).json()
    rol_func_id = find(roles, "nombre", "FUNCIONARIO")["id"]
    rol_cli_id  = find(roles, "nombre", "CLIENTE")["id"]

    # ── Departamentos ─────────────────────────────────────────────────────────
    print("[departamentos]")
    dept_map = {}
    depts = requests.get(f"{BASE}/departments", headers=h(adm_token)).json()
    for nombre in ["Call Center", "Soporte Técnico", "Técnico Campo"]:
        d = find(depts, "nombre", nombre)
        if d:
            print(f"  ✓ {nombre}"); dept_map[nombre] = d["id"]
        else:
            r = requests.post(f"{BASE}/departments",
                              json={"nombre": nombre, "descripcion": nombre},
                              headers=h(adm_token))
            if r.status_code in (200, 201):
                dept_map[nombre] = r.json()["id"]; print(f"  + {nombre}")
            else:
                # Puede que exista pero con nombre duplicado detectado
                depts2 = requests.get(f"{BASE}/departments", headers=h(adm_token)).json()
                d2 = find(depts2, "nombre", nombre)
                if d2:
                    dept_map[nombre] = d2["id"]; print(f"  ✓ {nombre} (re-encontrado)")

    # ── Usuarios ──────────────────────────────────────────────────────────────
    print("[usuarios]")
    users = requests.get(f"{BASE}/users", headers=h(adm_token)).json()

    FUNCS = [
        ("carlos.cc@telecom.bo",     "Carlos Mendoza",  "Func2024!", "Call Center"),
        ("ana.soporte@telecom.bo",   "Ana Vargas",      "Func2024!", "Soporte Técnico"),
        ("pedro.tecnico@telecom.bo", "Pedro Quispe",    "Func2024!", "Técnico Campo"),
    ]
    CLIS = [
        ("cliente1@telecom.bo", "María López", "Cliente2024!"),
        ("cliente2@telecom.bo", "Juan Flores", "Cliente2024!"),
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
            # Actualizar departmentId si cambió
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

    # ── Limpiar TODAS las políticas y sus actividades ─────────────────────────
    print("[limpieza]")
    policies = requests.get(f"{BASE}/policies", headers=h(adm_token)).json()
    plist    = policies.get("content", policies) if isinstance(policies, dict) else policies

    for p in plist:
        pid_old = p["id"]
        # Borrar actividades de la política primero (evita orphans)
        acts_r = requests.get(f"{BASE}/activities/by-policy/{pid_old}", headers=h(adm_token))
        if acts_r.status_code == 200:
            for a in acts_r.json():
                requests.delete(f"{BASE}/activities/{a['id']}", headers=h(adm_token))
        r = requests.delete(f"{BASE}/policies/{pid_old}", headers=h(adm_token))
        print(f"  - política '{p.get('nombre')}' → {r.status_code}")

    # ── Crear política ────────────────────────────────────────────────────────
    print("[política]")
    pol = post(f"{BASE}/policies",
               {"nombre": POL_NOMBRE,
                "descripcion": "Proceso completo de instalación del servicio de internet"},
               adm_token, POL_NOMBRE)
    if not pol:
        sys.exit(1)
    pid = pol["id"]

    # Subir BPMN con swimlanes, documentation AREA: y camunda:candidateGroups
    put(f"{BASE}/policies/{pid}/bpmn", {"bpmnXml": BPMN}, adm_token, "bpmn")

    # ── Actividades ───────────────────────────────────────────────────────────
    print("[actividades]")
    act_map = {}

    # Nodo INICIO
    act = post(f"{BASE}/activities",
               {"politicaId": pid, "nombre": "Inicio", "tipo": "INICIO"},
               adm_token, "act:Inicio")
    act_map["Inicio"] = act

    # UserTasks — nombre DEBE coincidir exactamente con el name del BPMN
    for tarea, dept_nombre, acciones in TAREAS:
        dept_id = dept_map.get(dept_nombre) if dept_nombre else None
        rol_id  = rol_func_id if dept_nombre else rol_cli_id

        body = {
            "politicaId":      pid,
            "nombre":          tarea,
            "tipo":            "TAREA",
            "responsableRolId": rol_id,
        }
        if dept_id:
            body["departmentId"] = dept_id

        act = post(f"{BASE}/activities", body, adm_token, f"act:{tarea}")
        act_map[tarea] = act
        if not act:
            continue

        # Propiedades embebidas: acciones + SLA + campos del formulario
        props = {
            "accionesPermitidas": acciones,
            "slaHoras": 24,
            "campos": CAMPOS.get(tarea, []),
        }
        if dept_id:
            # area → se mapea a departmentId en la entidad (usado por asignarFuncionarioAutomatico)
            props["area"] = dept_id

        patch(f"{BASE}/activities/{act['id']}/propiedades", props,
              adm_token, f"props:{tarea}")

    # Nodo FIN
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
    sop_t = func_tokens.get("Soporte Técnico")
    tec_t = func_tokens.get("Técnico Campo")

    def avanzar(tid, accion, obs, token, datos=None):
        body = {"accion": accion, "observaciones": obs}
        if datos:
            body["datos"] = datos
        return requests.post(f"{BASE}/tramites/{tid}/avanzar",
                             json=body, headers=h(token))

    def tomar(tid, token):
        requests.post(f"{BASE}/tramites/{tid}/tomar", headers=h(token))

    # Trámite 1 — cliente llenó datos, ahora en Verificación Técnica
    if cli_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 1 (→ Verificación)")
        if t:
            avanzar(t["id"], "APROBAR", "Solicitud enviada", cli_t, {
                "nombre_completo": "María López",
                "carnet":          "1234567 LP",
                "telefono":        "70001111",
                "email_cliente":   "cliente1@telecom.bo",
                "direccion":       "Av. Arce 1234, La Paz",
                "tipo_plan":       "Estándar 50Mbps",
            })

    # Trámite 2 — EN_PROCESO en Verificación Técnica (tomado por Soporte)
    if cli_t and sop_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 2 (→ Soporte tomado)")
        if t:
            tid = t["id"]
            avanzar(tid, "APROBAR", "Solicitud enviada", cli_t, {
                "nombre_completo": "Juan Flores",
                "carnet":          "7654321 LP",
                "telefono":        "70002222",
                "direccion":       "Calle 21 de Calacoto 567",
                "tipo_plan":       "Premium 100Mbps",
            })
            tomar(tid, sop_t)

    # Trámite 3 — EN_PROCESO en Visita Técnico (tomado por Técnico)
    if cli_t and sop_t and tec_t:
        t = post(f"{BASE}/tramites", {"politicaId": pid}, cli_t, "trámite 3 (→ Técnico tomado)")
        if t:
            tid = t["id"]
            avanzar(tid, "APROBAR", "Solicitud enviada", cli_t, {
                "nombre_completo": "Pedro Mamani",
                "carnet":          "9876543 CB",
                "telefono":        "70003333",
                "direccion":       "Zona Sur, Calle 15 #890",
                "tipo_plan":       "Básico 10Mbps",
            })
            tomar(tid, sop_t)
            avanzar(tid, "APROBAR", "Factibilidad confirmada, visita agendada", sop_t, {
                "factibilidad":   True,
                "distancia_nodo": 320,
                "fecha_visita":   "2026-05-02",
            })
            tomar(tid, tec_t)

    print(f"""
=== Seed completado ===
  URL:      http://localhost:4200
  Admin:    admin@workflow.com / Admin2024!
  Funcs:    carlos.cc@telecom.bo     / Func2024!    → Call Center
            ana.soporte@telecom.bo   / Func2024!    → Soporte Técnico
            pedro.tecnico@telecom.bo / Func2024!    → Técnico Campo
  Clientes: cliente1@telecom.bo / Cliente2024!
            cliente2@telecom.bo / Cliente2024!
  Política: {POL_NOMBRE} (ACTIVA)
  Flujo:    Datos del Solicitante (Cliente)
            → Verificación Técnica (Soporte Técnico)
            → Visita Técnico (Técnico Campo)
            → Aprobación Final (Call Center)
""")


if __name__ == "__main__":
    main()
