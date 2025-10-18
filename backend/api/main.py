#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: incorporate Relationships https://sqlmodel.tiangolo.com/tutorial/fastapi/teams/#add-teams-models
# Todo: config: schema (views)
# Todo: config: extract DB URI
#Todo: Maybe this boilerplate should go to api.__init__.py and then just import it?

# Docs
#https://timberry.dev/fastapi-with-apikeys

from fastapi import FastAPI
from api.controller import place
from api.controller import podcast
from api.controller import image
from api.controller import location
from api.controller import track
from api.auth.api_key import get_api_key
from fastapi import Depends


app = FastAPI(
    title="Timestrolls API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)
app.include_router(place.router, dependencies=[Depends(get_api_key)])
app.include_router(podcast.router, dependencies=[Depends(get_api_key)])
app.include_router(image.router, dependencies=[Depends(get_api_key)])
app.include_router(track.router, dependencies=[Depends(get_api_key)])
app.include_router(track.router_public)

# Public available + assembled suitable for frontend
# This is currently easier for the frontend.
# One could alternatively define public and private routers as for the track endpoints.
app.include_router(location.router)


@app.get('/api/ready')
def ready():
    return {"message": "I am ready!"}
