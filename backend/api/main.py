from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.controller import admin_content, admin_rights, public
from service import Conflict, Forbidden, Invalid, NotFound, ServiceError

app = FastAPI(
    title="Timestrolls API",
    description=(
        "Public routes (/api/locations, /api/tours) return published and "
        "permitted content. Admin routes (/api/admin/...) need "
        "`Authorization: Bearer <token>` with the scope named on the route."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.include_router(public.router)
app.include_router(admin_content.router)
app.include_router(admin_rights.router)

STATUS_CODES = {NotFound: 404, Conflict: 409, Invalid: 422, Forbidden: 403}


@app.exception_handler(ServiceError)
def service_error(request: Request, error: ServiceError):
    return JSONResponse({"detail": str(error)}, STATUS_CODES.get(type(error), 400))


@app.get("/api/ready")
def ready():
    return {"message": "I am ready!"}
