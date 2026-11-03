from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.auth.oauth import routes as oauth_routes
from api.controller import admin_content, admin_rights, public
from api.mcp_server import admin_app, admin_mcp, public_app
from service import Conflict, Forbidden, Invalid, NotFound, ServiceError


@asynccontextmanager
async def lifespan(app: FastAPI):
    # the MCP servers' session managers
    async with public_app.lifespan(app), admin_app.lifespan(app):
        yield


app = FastAPI(
    title="Timestrolls API",
    description=(
        "Public routes (/api/locations, /api/tours) return published and "
        "permitted content, without login. Admin routes (/api/admin/...) need "
        "`Authorization: Bearer <token>` with the scope named on the route: "
        "a bearer token or, for invited people, a token from signing in with "
        "Google (OAuth 2.1, metadata under /.well-known). MCP: /api/mcp/ "
        "(published content, open) and /api/mcp/admin/ (curation, the same "
        "auth as the admin routes)."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)
app.include_router(public.router)
app.include_router(admin_content.router)
app.include_router(admin_rights.router)
# the more specific path first
app.mount("/api/mcp/admin", admin_app)
app.mount("/api/mcp", public_app)
# With Google sign-in, the OAuth server (api/auth/oauth.py): its metadata
# under /.well-known at the root, its own routes as /api/authorize etc.
# Single routes, never a mount of /api: that would answer every /api path
# registered after it (v0.5.0 lost /api/ready, the health check, that way)
app.router.routes.extend(oauth_routes())
# The consent page takes the server's name, logo and website from here
# (the OAuth routes are on this app, not on the mounted MCP app)
app.state.fastmcp_server = admin_mcp

MCP_PATHS = ("/api/mcp", "/api/mcp/admin")


@app.middleware("http")
async def mcp_without_slash(request: Request, call_next):
    """MCP clients are often configured without the trailing slash; the
    mounted servers answer at /api/mcp/ and /api/mcp/admin/."""
    if request.scope["path"] in MCP_PATHS:
        request.scope["path"] += "/"
    return await call_next(request)


STATUS_CODES = {NotFound: 404, Conflict: 409, Invalid: 422, Forbidden: 403}


@app.exception_handler(ServiceError)
def service_error(request: Request, error: ServiceError):
    # by the base class too: Duplicate is a Conflict
    code = next((c for t, c in STATUS_CODES.items() if isinstance(error, t)), 400)
    return JSONResponse({"detail": str(error)}, code)


@app.get("/api/ready")
def ready():
    return {"message": "I am ready!"}
