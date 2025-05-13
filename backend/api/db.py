from sqlmodel import  create_engine, Session
from typing import Annotated
from fastapi import Depends

#Todo: get this from config
DATABASE_URL = "postgresql://user:password@localhost:5432/timestrolls"

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]
