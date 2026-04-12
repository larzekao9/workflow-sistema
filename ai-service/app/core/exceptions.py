from fastapi import Request
from fastapi.responses import JSONResponse


class AIServiceException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ValidationException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


async def ai_service_exception_handler(request: Request, exc: AIServiceException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )


async def validation_exception_handler(request: Request, exc: ValidationException) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message}
    )
