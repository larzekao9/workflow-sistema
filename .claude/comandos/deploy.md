Guiame para hacer el deploy local completo del sistema con Docker Compose.

Pasos a verificar antes de levantar:
1. Que `docker-compose.yml` esté en la raíz del proyecto
2. Que `backend/.env` o `application.yml` tenga la URL de MongoDB Atlas configurada
3. Que `ai-service/.env` tenga la API key de Anthropic
4. Que `frontend/src/environments/environment.ts` apunte a `http://localhost:8080`

Comando para levantar todo:
```
docker compose up --build
```

Puertos esperados:
- Backend: http://localhost:8080
- AI service: http://localhost:8001
- Frontend: http://localhost:4200

Si algo falla, mostrar el log del servicio con error y diagnosticar la causa antes de proponer fixes.
