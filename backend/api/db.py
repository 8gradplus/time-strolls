from sqlmodel import  create_engine, Session
from typing import Annotated
from fastapi import Depends
from config import config
from swak.funcflow import Pipe
from sqlmodel import SQLModel, select
from typing import Type


def get_uri():
    db = config.database
    if not db.driver == 'postgres':
        raise ValueError("Database driver {db.driver} not implemented yet!")
    return f'postgresql://{db.user}:{db.password}@{db.host}:{db.port}/{db.name}'

engine = Pipe (get_uri, create_engine)()


def get_session():
    with Session(engine) as session:
        yield session


def hash_exists(model: Type[SQLModel], hash_value: str) -> bool:
    if not hasattr(model, "hash"):
        raise AttributeError(f"Model {model.__name__} has no 'hash' attribute")
    stmt = select(model).where(model.hash == hash_value)
    with Session(engine) as session:
        result = session.exec(stmt).first()
        return result is not None

SessionDep = Annotated[Session, Depends(get_session)]
