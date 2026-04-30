# Guía de despliegue en AWS — workflow-sistema

Esta guía es para quien no conoce el proyecto. Explica qué hace cada servicio,
dónde vive en el código, cómo se conectan entre sí, y cómo levantarlo en AWS.

---

## Qué es el sistema

Plataforma web para gestionar trámites empresariales con BPMN (procesos visuales),
formularios dinámicos, roles de usuarios y notificaciones push.

Tiene **tres servicios** más una base de datos:

| Servicio | Tecnología | Puerto | Qué hace |
|----------|-----------|--------|----------|
| Backend | Java 21 + Spring Boot 3 | 8080 | API REST, lógica, JWT, archivos |
| Frontend | Angular 17 | 4200 (dev) / 80 (prod) | Interfaz web |
| AI Service | Python 3.11 + FastAPI | 8001 | Generación de flujos con IA (Claude) |
| Base de datos | MongoDB 7.0 | 27017 | Toda la persistencia |

---

## Estructura del repositorio

```
workflow-sistema/
├── backend/                  ← Spring Boot (Java)
│   ├── Dockerfile
│   ├── pom.xml               ← dependencias Java
│   └── src/main/
│       └── resources/
│           └── application.yml   ← configuración (lee variables de entorno)
│
├── frontend/                 ← Angular 17
│   ├── Dockerfile
│   ├── nginx.conf            ← servidor web en producción
│   └── src/
│       └── environments/
│           ├── environment.ts            ← producción (EDITAR antes de build)
│           └── environment.development.ts ← desarrollo local
│
├── ai-service/               ← FastAPI (Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example          ← plantilla de variables (copiar a .env)
│   └── app/
│       └── main.py           ← punto de entrada
│
├── docker-compose.yml        ← levanta todo junto (opción recomendada)
└── .env                      ← variables globales (ANTHROPIC_API_KEY)
```

---

## Cómo se conectan los servicios

```
Navegador del usuario
      │
      ├── HTTPS → Frontend (Angular)
      │              │
      │              └── llama a → Backend :8080  (todas las APIs)
      │                              │
      │                              ├── lee/escribe → MongoDB :27017
      │                              ├── llama a → AI Service :8001
      │                              └── guarda archivos en → /uploads/
      │
      └── (notificaciones push vía Firebase FCM)
```

**Regla importante:** el Frontend nunca habla directo con MongoDB ni con el AI Service.
Todo pasa por el Backend.

---

## Variables de entorno — qué son y dónde van

### Backend (`backend/src/main/resources/application.yml`)

El backend lee estas variables del entorno del sistema operativo o del docker-compose.
Si no están definidas, usa los valores de desarrollo que aparecen después de los `:`.

| Variable | Valor de ejemplo en prod | Para qué sirve |
|----------|--------------------------|----------------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/workflow_db` | Conexión a la base de datos |
| `JWT_SECRET` | cadena larga aleatoria (mín. 32 chars) | Firmar los tokens de sesión — **NO compartir** |
| `JWT_EXPIRATION` | `86400000` | Tiempo de vida del token en ms (24h) |
| `AI_SERVICE_URL` | `http://localhost:8001` | URL interna del AI Service |
| `CORS_ORIGINS` | `https://tudominio.com` | Dominio del frontend (sin `/` al final) |
| `UPLOADS_DIR` | `/uploads` | Carpeta donde se guardan archivos subidos |

### AI Service (`ai-service/.env`)

Copiar `ai-service/.env.example` a `ai-service/.env` y completar:

```env
ANTHROPIC_API_KEY=sk-ant-...    # Clave de API de Anthropic (Claude)
GROQ_API_KEY=gsk_...            # Clave de API de Groq (opcional)
CLAUDE_MODEL=claude-sonnet-4-6
MAX_TOKENS=8000
TIMEOUT_SECONDS=30
CORS_ORIGINS=["https://tudominio.com","http://tu-backend:8080"]
```

### Frontend (`frontend/src/environments/environment.ts`)

Este archivo se compila dentro del build de Angular.
**Hay que editarlo ANTES de hacer el build de producción:**

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.tudominio.com',        // URL pública del backend
  aiServiceUrl: 'https://api.tudominio.com',  // puede ser el mismo dominio con /ai
  wsUrl: 'wss://api.tudominio.com/ws'         // WebSocket (wss:// en producción)
};
```

---

## Opción A — Despliegue con Docker Compose (más simple, todo en un servidor)

Ideal para una sola instancia EC2 grande. Todo corre en el mismo servidor.

### 1. Servidor EC2 requerido

- Tipo: `t3.medium` o mayor (2 vCPU, 4 GB RAM mínimo)
- SO: Ubuntu 22.04
- Puertos abiertos en Security Group: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Instalar Docker en EC2

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
# Cerrar sesión y volver a conectar para que tome el grupo
```

### 3. Subir el código al servidor

```bash
# Opción 1: clonar desde GitHub
git clone https://github.com/larzekao9/workflow-sistema.git
cd workflow-sistema

# Opción 2: copiar con scp
scp -i key.pem -r workflow-sistema/ ubuntu@IP_EC2:/home/ubuntu/
```

### 4. Editar el frontend con las URLs reales

```bash
nano frontend/src/environments/environment.ts
# Cambiar apiUrl, aiServiceUrl y wsUrl a la IP/dominio real del servidor
```

### 5. Crear el archivo de variables del AI Service

```bash
cp ai-service/.env.example ai-service/.env
nano ai-service/.env
# Poner las API keys reales
```

### 6. Crear el `.env` raíz

```bash
nano .env
# Pegar:
ANTHROPIC_API_KEY=sk-ant-tu-clave-real
```

### 7. Levantar todo

```bash
docker compose up -d --build

# Ver que todo esté corriendo:
docker compose ps

# Ver logs de un servicio:
docker compose logs -f backend
docker compose logs -f ai-service
```

### 8. Verificar

```bash
# Backend respondiendo:
curl http://localhost:8080/actuator/health

# Frontend:
curl http://localhost:80
```

El sistema queda accesible en `http://IP_PUBLICA_EC2`.

---

## Opción B — Despliegue separado en AWS (más escalable)

### Arquitectura

```
Internet
   │
   ├── CloudFront ──── S3 bucket ──── Angular (archivos estáticos)
   │
   └── ALB (puerto 443)
          │
          ├── /api/*  → EC2 Backend  :8080  (Spring Boot)
          └── /ai/*   → EC2 AI Svc   :8001  (FastAPI)

                    ↕ conexión interna
              MongoDB Atlas (cloud, fuera de EC2)
```

### B1 — Base de datos: MongoDB Atlas

1. Crear cuenta en [cloud.mongodb.com](https://cloud.mongodb.com)
2. Crear un cluster (tier M0 gratuito sirve para pruebas, M10 para producción)
3. En **Database Access**: crear usuario y contraseña
4. En **Network Access**: agregar las IPs de las instancias EC2 (o `0.0.0.0/0` temporalmente)
5. Copiar el **Connection String**: `mongodb+srv://usuario:password@cluster.mongodb.net/workflow_db`

Este string va en la variable `MONGODB_URI` del backend.

### B2 — Backend en EC2

**Instancia recomendada:** `t3.small` (1 vCPU, 2 GB RAM)

```bash
# Conectarse al EC2
ssh -i key.pem ubuntu@IP_EC2

# Instalar Java 21
sudo apt update
sudo apt install -y openjdk-21-jre-headless

# Crear carpeta de la app
sudo mkdir -p /opt/workflow
sudo chown ubuntu:ubuntu /opt/workflow
```

**Compilar el JAR localmente** (en tu máquina, no en EC2):

```bash
cd backend
./mvnw clean package -DskipTests
# Genera: backend/target/workflow-backend-0.0.1-SNAPSHOT.jar
```

**Subir el JAR al EC2:**

```bash
scp -i key.pem backend/target/workflow-backend-*.jar ubuntu@IP_EC2:/opt/workflow/app.jar
```

**Crear archivo de variables** en el EC2:

```bash
nano /opt/workflow/.env
```

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/workflow_db
JWT_SECRET=una-cadena-muy-larga-y-aleatoria-cambiar-esto
JWT_EXPIRATION=86400000
AI_SERVICE_URL=http://IP_PRIVADA_EC2_AI:8001
CORS_ORIGINS=https://tudominio.com
UPLOADS_DIR=/opt/workflow/uploads
```

**Crear servicio para que arranque automáticamente:**

```bash
sudo nano /etc/systemd/system/workflow-backend.service
```

```ini
[Unit]
Description=Workflow Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/workflow
EnvironmentFile=/opt/workflow/.env
ExecStart=/usr/bin/java -jar /opt/workflow/app.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable workflow-backend
sudo systemctl start workflow-backend

# Verificar:
sudo systemctl status workflow-backend
sudo journalctl -u workflow-backend -f   # ver logs en vivo
```

**Security Group del EC2 backend:**

| Puerto | Protocolo | Origen |
|--------|-----------|--------|
| 22 | TCP | Solo tu IP |
| 8080 | TCP | Security Group del ALB |

### B3 — AI Service en EC2

**Instancia recomendada:** `t3.small`

```bash
sudo apt update
sudo apt install -y python3.11 python3-pip
sudo mkdir -p /opt/ai-service
sudo chown ubuntu:ubuntu /opt/ai-service
```

**Subir el código:**

```bash
scp -i key.pem -r ai-service/* ubuntu@IP_EC2_AI:/opt/ai-service/
```

**Instalar dependencias y crear `.env`:**

```bash
cd /opt/ai-service
pip3 install -r requirements.txt

nano .env
# Pegar el contenido del ai-service/.env con las keys reales
```

**Servicio systemd:**

```bash
sudo nano /etc/systemd/system/workflow-ai.service
```

```ini
[Unit]
Description=Workflow AI Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/ai-service
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable workflow-ai
sudo systemctl start workflow-ai
```

### B4 — Frontend en S3 + CloudFront

**Editar las URLs antes del build:**

```bash
# En tu máquina local, editar:
nano frontend/src/environments/environment.ts
# Cambiar apiUrl a https://api.tudominio.com (URL del ALB o del EC2 backend)
```

**Build:**

```bash
cd frontend
npm install
npm run build -- --configuration production
# Genera archivos en: dist/workflow-frontend/browser/
```

**Crear bucket S3:**

```bash
aws s3 mb s3://workflow-frontend-prod --region us-east-1
```

**Subir los archivos:**

```bash
aws s3 sync dist/workflow-frontend/browser/ s3://workflow-frontend-prod --delete
```

**Configurar bucket para web estático:**
1. AWS Console → S3 → workflow-frontend-prod
2. **Properties** → Static website hosting → Enable
3. Index document: `index.html`
4. Error document: `index.html` (necesario para que Angular Router funcione)
5. **Permissions** → Block public access → desactivar
6. **Bucket policy** → agregar:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::workflow-frontend-prod/*"
  }]
}
```

**Crear distribución CloudFront:**
1. AWS Console → CloudFront → Create distribution
2. Origin domain: el endpoint del bucket S3 (no el ARN, el URL de website)
3. Default root object: `index.html`
4. Error pages: 403 → `/index.html` (código 200) y 404 → `/index.html` (código 200)
5. HTTPS: usar certificado de ACM (gratis, pedir en us-east-1)

---

## Archivos que se deben cambiar antes de cada deploy

| Archivo | Qué cambiar | Por qué |
|---------|-------------|---------|
| `frontend/src/environments/environment.ts` | `apiUrl`, `wsUrl` | Apuntar al backend real en AWS |
| `ai-service/.env` | `ANTHROPIC_API_KEY`, `CORS_ORIGINS` | Claves reales y dominio del frontend |
| `backend/.env` o variables del servidor | `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS` | Conexión a base de datos real |

---

## Credenciales de prueba (demo)

Una vez desplegado, estas cuentas ya existen en la base de datos demo:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin@workflow.com` | `Admin2024!` | ADMINISTRADOR |
| `superadmin@workflow.com` | `Super2024!` | SUPERADMIN |
| `ana.soporte@telecom.bo` | `Func2024!` | FUNCIONARIO |
| `cliente1@telecom.bo` | `Cliente2024!` | CLIENTE |

> Para cargar los datos demo ejecutar: `python3 scripts/seed_telecom.py`
> (requiere Python 3.11 y conexión a MongoDB)

---

## Solución de problemas comunes

**El frontend no conecta con el backend:**
- Verificar que `apiUrl` en `environment.ts` sea la URL real del backend (no localhost)
- Verificar que el Security Group del EC2 backend permita tráfico en puerto 8080

**Error CORS en el navegador:**
- En el backend, la variable `CORS_ORIGINS` debe tener el dominio exacto del frontend
- Ejemplo: `CORS_ORIGINS=https://dXXXXX.cloudfront.net` (sin `/` al final)

**El backend no conecta con MongoDB:**
- Verificar que `MONGODB_URI` tenga usuario, password y nombre de base de datos correctos
- En MongoDB Atlas, verificar que la IP del EC2 esté en Network Access

**Los archivos subidos no persisten:**
- En EC2 con Docker: el volumen `uploads_data` persiste entre reinicios
- En EC2 sin Docker: `UPLOADS_DIR=/opt/workflow/uploads` debe existir y tener permisos

**WebSocket no funciona:**
- En producción usar `wss://` (no `ws://`)
- El ALB debe tener soporte para WebSocket activado (está activado por defecto)
