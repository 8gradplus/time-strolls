from pydantic import BaseModel, model_validator
from typing import Literal, Optional


class Api(BaseModel):
    key: str


class Auth(BaseModel):
    mode: Literal["oauth", "local"] = "oauth"
    base_url: str = "https://timestrolls.debtray.com"
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    jwt_key: Optional[str] = None

    @property
    def google(self) -> bool:
        """Google sign-in is on."""
        return self.mode == "oauth" and bool(self.google_client_id)

    @model_validator(mode="after")
    def google_needs_its_keys(self):
        if self.google and not (self.google_client_secret and self.jwt_key):
            raise ValueError(
                "GOOGLE_CLIENT_ID needs GOOGLE_CLIENT_SECRET and OAUTH_JWT_KEY"
            )
        return self


class DataBase(BaseModel):
    driver: Optional[str] = "postgres"
    ssl: Optional[bool] = True
    host: str
    port: Optional[int] = 5432
    name: str
    user: str
    password: str


class CdnPath(BaseModel):
    image: str
    podcast: str


class CdnCredentials(BaseModel):
    key: str
    secret: str


class Cdn(BaseModel):
    path: CdnPath
    credentials: Optional[CdnCredentials] = None
    endpoint: Optional[str] = None
    region: Optional[str] = "fra1"
    bucket: Optional[str] = None


class Validator(BaseModel):
    api: Api
    auth: Auth = Auth()
    cdn: Cdn
    database: DataBase
