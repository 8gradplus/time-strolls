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
from api.auth.api_key import get_api_key
from fastapi import Depends


app = FastAPI()
app.include_router(place.router, dependencies=[Depends(get_api_key)])
app.include_router(podcast.router, dependencies=[Depends(get_api_key)])
app.include_router(image.router, dependencies=[Depends(get_api_key)])
app.include_router(location.router)


@app.get('/api/ready')
def ready():
    return {"message": "I am ready!"}
