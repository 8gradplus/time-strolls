import hashlib
from fastapi import UploadFile
from sqlmodel import Session, SQLModel, select
from typing import Type
from api.db import engine

async def hash(file: UploadFile) -> str:
    await file.seek(0)
    hash_sha256 = hashlib.sha256()
    while chunk := await file.read(8192):
        hash_sha256.update(chunk)
    # Reset the file's internal pointer if you want to reuse it
    await file.seek(0)
    if hash_sha256.digest_size == 0:
        raise ValueError("File is empty or unreadable")
    return hash_sha256.hexdigest()

def hash_exists(model: Type[SQLModel], hash_value: str):
    if not hasattr(model, "hash"):
        raise AttributeError(f"Model {model.__name__} has no 'hash' attribute")
    stmt = select(model).where(model.hash == hash_value)
    with Session(engine) as session:
        return session.exec(stmt).first()
