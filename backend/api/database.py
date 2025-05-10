from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "postgresql://user:password@localhost:5432/timestrolls"

engine = create_engine(DATABASE_URL, connect_args={"options": "-csearch_path=timestrolls"})

def get_session():
    with Session(engine) as session:
        yield session
