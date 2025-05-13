#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: https://fastapi.tiangolo.com/tutorial/bigger-applications/#an-example-file-structure
#Todo: incorporate Relationships https://sqlmodel.tiangolo.com/tutorial/fastapi/teams/#add-teams-models


from fastapi import FastAPI
#from typing import Annotated
#from sqlmodel import Session

#from .db import get_session
from .view import place

#https://timberry.dev/fastapi-with-apikeys
#SessionDep = Annotated[Session, Depends(get_session)]


app = FastAPI()
app.include_router(place.router)

@app.get('/ready')
def ready():
    return {"message": "I am ready!"}
