from sqlmodel import  create_engine, Session
from typing import Annotated
from fastapi import Depends
from config import config
from swak.funcflow import Pipe

def get_uri():
    db = config.database
    if not db.driver == 'postgres':
        raise ValueError("Database driver {db.driver} not implemented yet!")
    return f'postgresql://{db.user}:{db.password}@{db.host}:{db.port}/{db.name}'

engine = Pipe (get_uri, create_engine)()


def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]
