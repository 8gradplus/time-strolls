from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from config import config

api_key_header = APIKeyHeader(name=config.api.headername, auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == config.api.key:
        return api_key
    raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Invalid API Key")
