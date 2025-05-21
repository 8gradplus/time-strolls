from fastapi import FastAPI
from titiler.core.factory import TilerFactory

from starlette.middleware.cors import CORSMiddleware

# https://developmentseed.org/titiler/user_guide/getting_started/#5-launch-your-titiler-server

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development - be more specific in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])
cog = TilerFactory()
app.include_router(cog.router, tags=["Cloud Optimized GeoTIFF"])
