#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: incorporate Relationships https://sqlmodel.tiangolo.com/tutorial/fastapi/teams/#add-teams-models
# Todo: config: schema (views)
# Todo: config: extract DB URI
#Todo: Maybe this boilerplate should go to api.__init__.py and then just import it?

from fastapi import FastAPI
#from typing import Annotated
#from sqlmodel import Sessions

#from .db import get_session
from api.controller import place
from api.controller import podcast

#https://timberry.dev/fastapi-with-apikeys
#SessionDep = Annotated[Session, Depends(get_session)]


app = FastAPI()
app.include_router(place.router)
app.include_router(podcast.router)

@app.get('/ready')
def ready():
    return {"message": "I am ready!"}
